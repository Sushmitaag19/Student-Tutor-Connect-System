const express = require('express');
const models = require('../models');
const { verifyToken, requireTutorOrAdmin, requireStudentOrAdmin } = require('../middleware/auth');
const { validateAnswer } = require('../middleware/validation');

const router = express.Router();

// Get answers for a question
router.get('/question/:question_id', verifyToken, async (req, res) => {
  try {
    const { question_id } = req.params;
    const { page = 1, limit = 10, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const answers = await models.Answer.findAndCountAll({
      where: { question_id },
      include: [
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Vote, as: 'votes' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['is_best_answer', 'DESC'],
        [sort_by, sort_order.toUpperCase()]
      ]
    });

    res.json({
      success: true,
      data: {
        answers: answers.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(answers.count / limit),
          totalItems: answers.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get answer by ID
router.get('/:answer_id', verifyToken, async (req, res) => {
  try {
    const answer = await models.Answer.findByPk(req.params.answer_id, {
      include: [
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Vote, as: 'votes' },
        { model: models.Question, as: 'question' }
      ]
    });

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    res.json({
      success: true,
      data: { answer }
    });
  } catch (error) {
    console.error('Get answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new answer
router.post('/', verifyToken, requireTutorOrAdmin, validateAnswer, async (req, res) => {
  try {
    const { question_id, content } = req.body;

    // Check if question exists
    const question = await models.Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Get tutor or student profile
    let tutor_id = null;
    let student_id = null;

    if (req.user.role === 'tutor') {
      const tutor = await models.Tutor.findOne({ 
        where: { user_id: req.user.user_id } 
      });
      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: 'Tutor profile not found'
        });
      }
      tutor_id = tutor.tutor_id;
    } else if (req.user.role === 'student') {
      const student = await models.Student.findOne({ 
        where: { user_id: req.user.user_id } 
      });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
      student_id = student.student_id;
    }

    const answer = await models.Answer.create({
      question_id,
      tutor_id,
      student_id,
      content
    });

    // Update question answer count
    await question.update({ 
      answer_count: question.answer_count + 1 
    });

    // Get the created answer with relations
    const createdAnswer = await models.Answer.findByPk(answer.answer_id, {
      include: [
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        }
      ]
    });

    // Create notification for question owner
    await models.Notification.create({
      user_id: question.student.user_id,
      type: 'new_answer',
      title: 'New Answer Received',
      message: `Your question "${question.title}" has received a new answer.`,
      related_id: answer.answer_id,
      related_type: 'answer'
    });

    res.status(201).json({
      success: true,
      message: 'Answer created successfully',
      data: { answer: createdAnswer }
    });
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update answer
router.put('/:answer_id', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;

    const answer = await models.Answer.findByPk(req.params.answer_id, {
      include: [
        { model: models.Tutor, as: 'tutor' },
        { model: models.Student, as: 'student' }
      ]
    });

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if user owns the answer or is admin
    const isOwner = (answer.tutor && answer.tutor.user_id === req.user.user_id) ||
                   (answer.student && answer.student.user_id === req.user.user_id);
    
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await answer.update({ content });

    res.json({
      success: true,
      message: 'Answer updated successfully',
      data: { answer }
    });
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete answer
router.delete('/:answer_id', verifyToken, async (req, res) => {
  try {
    const answer = await models.Answer.findByPk(req.params.answer_id, {
      include: [
        { model: models.Tutor, as: 'tutor' },
        { model: models.Student, as: 'student' },
        { model: models.Question, as: 'question' }
      ]
    });

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if user owns the answer or is admin
    const isOwner = (answer.tutor && answer.tutor.user_id === req.user.user_id) ||
                   (answer.student && answer.student.user_id === req.user.user_id);
    
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // If this was the best answer, remove it from question
    if (answer.is_best_answer) {
      await answer.question.update({ best_answer_id: null });
    }

    await answer.destroy();

    // Update question answer count
    await answer.question.update({ 
      answer_count: answer.question.answer_count - 1 
    });

    res.json({
      success: true,
      message: 'Answer deleted successfully'
    });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark answer as best answer
router.put('/:answer_id/best', verifyToken, async (req, res) => {
  try {
    const answer = await models.Answer.findByPk(req.params.answer_id, {
      include: [
        { model: models.Question, as: 'question' }
      ]
    });

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if user owns the question or is admin
    const question = await models.Question.findByPk(answer.question_id, {
      include: [{ model: models.Student, as: 'student' }]
    });

    if (req.user.role !== 'admin' && question.student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Only the question owner can mark best answer'
      });
    }

    // Remove previous best answer
    await models.Answer.update(
      { is_best_answer: false },
      { where: { question_id: answer.question_id, is_best_answer: true } }
    );

    // Mark this answer as best
    await answer.update({ is_best_answer: true });

    // Update question
    await question.update({ 
      best_answer_id: answer.answer_id,
      is_resolved: true 
    });

    res.json({
      success: true,
      message: 'Answer marked as best answer'
    });
  } catch (error) {
    console.error('Mark best answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Vote on answer
router.post('/:answer_id/vote', verifyToken, async (req, res) => {
  try {
    const { vote_type } = req.body; // 'upvote' or 'downvote'
    const { answer_id } = req.params;

    if (!['upvote', 'downvote'].includes(vote_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    // Check if user already voted
    const existingVote = await models.Vote.findOne({
      where: { answer_id, user_id: req.user.user_id }
    });

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Remove vote if same type
        await existingVote.destroy();
        
        // Update answer vote counts
        const answer = await models.Answer.findByPk(answer_id);
        if (vote_type === 'upvote') {
          await answer.update({ upvotes: Math.max(0, answer.upvotes - 1) });
        } else {
          await answer.update({ downvotes: Math.max(0, answer.downvotes - 1) });
        }

        return res.json({
          success: true,
          message: 'Vote removed'
        });
      } else {
        // Update vote type
        await existingVote.update({ vote_type });
        
        // Update answer vote counts
        const answer = await models.Answer.findByPk(answer_id);
        if (vote_type === 'upvote') {
          await answer.update({ 
            upvotes: answer.upvotes + 1,
            downvotes: Math.max(0, answer.downvotes - 1)
          });
        } else {
          await answer.update({ 
            downvotes: answer.downvotes + 1,
            upvotes: Math.max(0, answer.upvotes - 1)
          });
        }

        return res.json({
          success: true,
          message: 'Vote updated'
        });
      }
    }

    // Create new vote
    await models.Vote.create({
      answer_id,
      user_id: req.user.user_id,
      vote_type
    });

    // Update answer vote counts
    const answer = await models.Answer.findByPk(answer_id);
    if (vote_type === 'upvote') {
      await answer.update({ upvotes: answer.upvotes + 1 });
    } else {
      await answer.update({ downvotes: answer.downvotes + 1 });
    }

    res.json({
      success: true,
      message: 'Vote recorded'
    });
  } catch (error) {
    console.error('Vote on answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get answers by user
router.get('/user/:user_id', verifyToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user has access
    if (req.user.role !== 'admin' && req.user.user_id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get user's answers
    const answers = await models.Answer.findAndCountAll({
      where: {
        [models.Sequelize.Op.or]: [
          { tutor_id: { [models.Sequelize.Op.in]: 
            await models.Tutor.findAll({ 
              where: { user_id }, 
              attributes: ['tutor_id'] 
            }).then(tutors => tutors.map(t => t.tutor_id))
          }},
          { student_id: { [models.Sequelize.Op.in]: 
            await models.Student.findAll({ 
              where: { user_id }, 
              attributes: ['student_id'] 
            }).then(students => students.map(s => s.student_id))
          }}
        ]
      },
      include: [
        { model: models.Question, as: 'question' },
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        answers: answers.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(answers.count / limit),
          totalItems: answers.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
