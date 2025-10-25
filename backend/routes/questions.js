const express = require('express');
const models = require('../models');
const { verifyToken, requireStudentOrAdmin, requireTutorOrAdmin } = require('../middleware/auth');
const { validateQuestion, validateAnswer } = require('../middleware/validation');

const router = express.Router();

// Get all questions with pagination and filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      subject_id, 
      is_resolved, 
      is_urgent, 
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (subject_id) whereClause.subject_id = subject_id;
    if (is_resolved !== undefined) whereClause.is_resolved = is_resolved === 'true';
    if (is_urgent !== undefined) whereClause.is_urgent = is_urgent === 'true';
    
    if (search) {
      whereClause[models.Sequelize.Op.or] = [
        { title: { [models.Sequelize.Op.iLike]: `%${search}%` } },
        { content: { [models.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const questions = await models.Question.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Subject, as: 'subject' },
        { 
          model: models.Answer, 
          as: 'answers',
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
        },
        { 
          model: models.Answer, 
          as: 'bestAnswer',
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
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        questions: questions.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(questions.count / limit),
          totalItems: questions.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get question by ID
router.get('/:question_id', verifyToken, async (req, res) => {
  try {
    const question = await models.Question.findByPk(req.params.question_id, {
      include: [
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Subject, as: 'subject' },
        { 
          model: models.Answer, 
          as: 'answers',
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
          order: [['created_at', 'DESC']]
        },
        { 
          model: models.Answer, 
          as: 'bestAnswer',
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
        }
      ]
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Increment view count
    await question.update({ view_count: question.view_count + 1 });

    res.json({
      success: true,
      data: { question }
    });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new question
router.post('/', verifyToken, requireStudentOrAdmin, validateQuestion, async (req, res) => {
  try {
    const { title, content, subject_id, tags, is_urgent } = req.body;

    // Get student ID
    const student = await models.Student.findOne({ 
      where: { user_id: req.user.user_id } 
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const question = await models.Question.create({
      student_id: student.student_id,
      subject_id: subject_id || null,
      title,
      content,
      tags: tags || [],
      is_urgent: is_urgent || false
    });

    // Get the created question with relations
    const createdQuestion = await models.Question.findByPk(question.question_id, {
      include: [
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Subject, as: 'subject' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: { question: createdQuestion }
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update question
router.put('/:question_id', verifyToken, async (req, res) => {
  try {
    const { title, content, tags, is_urgent } = req.body;

    const question = await models.Question.findByPk(req.params.question_id, {
      include: [{ model: models.Student, as: 'student' }]
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns the question or is admin
    if (req.user.role !== 'admin' && question.student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await question.update({
      title: title || question.title,
      content: content || question.content,
      tags: tags || question.tags,
      is_urgent: is_urgent !== undefined ? is_urgent : question.is_urgent
    });

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: { question }
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete question
router.delete('/:question_id', verifyToken, async (req, res) => {
  try {
    const question = await models.Question.findByPk(req.params.question_id, {
      include: [{ model: models.Student, as: 'student' }]
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns the question or is admin
    if (req.user.role !== 'admin' && question.student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await question.destroy();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark question as resolved
router.put('/:question_id/resolve', verifyToken, async (req, res) => {
  try {
    const question = await models.Question.findByPk(req.params.question_id, {
      include: [{ model: models.Student, as: 'student' }]
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns the question or is admin
    if (req.user.role !== 'admin' && question.student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await question.update({ is_resolved: true });

    res.json({
      success: true,
      message: 'Question marked as resolved'
    });
  } catch (error) {
    console.error('Resolve question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get questions by student
router.get('/student/:student_id', verifyToken, async (req, res) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user has access
    const student = await models.Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (req.user.role !== 'admin' && student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const questions = await models.Question.findAndCountAll({
      where: { student_id },
      include: [
        { model: models.Subject, as: 'subject' },
        { model: models.Answer, as: 'answers' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        questions: questions.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(questions.count / limit),
          totalItems: questions.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get student questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get trending questions
router.get('/trending/trending', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trendingQuestions = await models.Question.findAll({
      where: {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: [
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Subject, as: 'subject' },
        { model: models.Answer, as: 'answers' }
      ],
      order: [
        ['view_count', 'DESC'],
        ['answer_count', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: { questions: trendingQuestions }
    });
  } catch (error) {
    console.error('Get trending questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
