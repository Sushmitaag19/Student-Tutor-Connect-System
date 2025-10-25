const express = require('express');
const models = require('../models');
const { verifyToken, requireStudentOrAdmin } = require('../middleware/auth');
const { validateRatingSubmission } = require('../middleware/validation');

const router = express.Router();

// Submit rating for a tutor
router.post('/', verifyToken, requireStudentOrAdmin, validateRatingSubmission, async (req, res) => {
  try {
    const { 
      tutor_id, 
      session_id, 
      rating, 
      feedback, 
      communication_rating, 
      knowledge_rating, 
      punctuality_rating,
      is_anonymous 
    } = req.body;

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

    // Check if tutor exists
    const tutor = await models.Tutor.findByPk(tutor_id);
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    // Check if session exists and is completed (if session_id provided)
    if (session_id) {
      const session = await models.Session.findByPk(session_id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (session.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Can only rate completed sessions'
        });
      }

      if (session.student_id !== student.student_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only rate your own sessions'
        });
      }
    }

    // Check if rating already exists
    const existingRating = await models.Rating.findOne({
      where: { 
        student_id: student.student_id, 
        tutor_id,
        ...(session_id ? { session_id } : {})
      }
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this tutor for this session'
      });
    }

    // Create rating
    const ratingRecord = await models.Rating.create({
      student_id: student.student_id,
      tutor_id,
      session_id: session_id || null,
      rating,
      feedback,
      communication_rating,
      knowledge_rating,
      punctuality_rating,
      is_anonymous: is_anonymous || false
    });

    // Update tutor's average rating and rating count
    await updateTutorRatingStats(tutor_id);

    // Create notification for tutor
    await models.Notification.create({
      user_id: tutor.user_id,
      type: 'rating_received',
      title: 'New Rating Received',
      message: `You received a ${rating}-star rating from a student.`,
      related_id: ratingRecord.rating_id,
      related_type: 'rating'
    });

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: { rating: ratingRecord }
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get ratings for a tutor
router.get('/tutor/:tutor_id', verifyToken, async (req, res) => {
  try {
    const { tutor_id } = req.params;
    const { page = 1, limit = 10, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const ratings = await models.Rating.findAndCountAll({
      where: { tutor_id },
      include: [
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Session, as: 'session' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        ratings: ratings.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(ratings.count / limit),
          totalItems: ratings.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tutor ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get ratings given by a student
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

    const ratings = await models.Rating.findAndCountAll({
      where: { student_id },
      include: [
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Session, as: 'session' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        ratings: ratings.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(ratings.count / limit),
          totalItems: ratings.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get student ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get rating by ID
router.get('/:rating_id', verifyToken, async (req, res) => {
  try {
    const rating = await models.Rating.findByPk(req.params.rating_id, {
      include: [
        { 
          model: models.Student, 
          as: 'student',
          include: [{ model: models.User, as: 'user' }]
        },
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.Session, as: 'session' }
      ]
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    res.json({
      success: true,
      data: { rating }
    });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update rating
router.put('/:rating_id', verifyToken, async (req, res) => {
  try {
    const { rating, feedback, communication_rating, knowledge_rating, punctuality_rating } = req.body;

    const ratingRecord = await models.Rating.findByPk(req.params.rating_id, {
      include: [{ model: models.Student, as: 'student' }]
    });

    if (!ratingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if user owns the rating or is admin
    if (req.user.role !== 'admin' && ratingRecord.student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await ratingRecord.update({
      rating: rating || ratingRecord.rating,
      feedback: feedback || ratingRecord.feedback,
      communication_rating: communication_rating || ratingRecord.communication_rating,
      knowledge_rating: knowledge_rating || ratingRecord.knowledge_rating,
      punctuality_rating: punctuality_rating || ratingRecord.punctuality_rating
    });

    // Update tutor's average rating
    await updateTutorRatingStats(ratingRecord.tutor_id);

    res.json({
      success: true,
      message: 'Rating updated successfully',
      data: { rating: ratingRecord }
    });
  } catch (error) {
    console.error('Update rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete rating
router.delete('/:rating_id', verifyToken, async (req, res) => {
  try {
    const ratingRecord = await models.Rating.findByPk(req.params.rating_id, {
      include: [{ model: models.Student, as: 'student' }]
    });

    if (!ratingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if user owns the rating or is admin
    if (req.user.role !== 'admin' && ratingRecord.student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const tutor_id = ratingRecord.tutor_id;
    await ratingRecord.destroy();

    // Update tutor's average rating
    await updateTutorRatingStats(tutor_id);

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get rating statistics for a tutor
router.get('/tutor/:tutor_id/stats', verifyToken, async (req, res) => {
  try {
    const { tutor_id } = req.params;

    const tutor = await models.Tutor.findByPk(tutor_id);
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    // Get rating statistics
    const ratingStats = await models.Rating.findAll({
      where: { tutor_id },
      attributes: [
        'rating',
        'communication_rating',
        'knowledge_rating',
        'punctuality_rating'
      ]
    });

    if (ratingStats.length === 0) {
      return res.json({
        success: true,
        data: {
          tutor_id: parseInt(tutor_id),
          total_ratings: 0,
          average_rating: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          average_communication: 0,
          average_knowledge: 0,
          average_punctuality: 0
        }
      });
    }

    // Calculate statistics
    const totalRatings = ratingStats.length;
    const averageRating = ratingStats.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingStats.forEach(r => {
      ratingDistribution[r.rating]++;
    });

    const communicationRatings = ratingStats.filter(r => r.communication_rating).map(r => r.communication_rating);
    const knowledgeRatings = ratingStats.filter(r => r.knowledge_rating).map(r => r.knowledge_rating);
    const punctualityRatings = ratingStats.filter(r => r.punctuality_rating).map(r => r.punctuality_rating);

    const averageCommunication = communicationRatings.length > 0 ? 
      communicationRatings.reduce((sum, r) => sum + r, 0) / communicationRatings.length : 0;
    const averageKnowledge = knowledgeRatings.length > 0 ? 
      knowledgeRatings.reduce((sum, r) => sum + r, 0) / knowledgeRatings.length : 0;
    const averagePunctuality = punctualityRatings.length > 0 ? 
      punctualityRatings.reduce((sum, r) => sum + r, 0) / punctualityRatings.length : 0;

    res.json({
      success: true,
      data: {
        tutor_id: parseInt(tutor_id),
        total_ratings: totalRatings,
        average_rating: parseFloat(averageRating.toFixed(2)),
        rating_distribution: ratingDistribution,
        average_communication: parseFloat(averageCommunication.toFixed(2)),
        average_knowledge: parseFloat(averageKnowledge.toFixed(2)),
        average_punctuality: parseFloat(averagePunctuality.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get rating stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to update tutor rating statistics
async function updateTutorRatingStats(tutor_id) {
  try {
    const ratings = await models.Rating.findAll({
      where: { tutor_id },
      attributes: ['rating']
    });

    if (ratings.length === 0) {
      await models.Tutor.update({
        average_rating: 0,
        rating_count: 0
      }, { where: { tutor_id } });
      return;
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    await models.Tutor.update({
      average_rating: parseFloat(averageRating.toFixed(2)),
      rating_count: ratings.length
    }, { where: { tutor_id } });
  } catch (error) {
    console.error('Update tutor rating stats error:', error);
  }
}

module.exports = router;
