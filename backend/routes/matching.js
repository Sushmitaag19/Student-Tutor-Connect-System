const express = require('express');
const axios = require('axios');
const models = require('../models');
const { verifyToken, requireStudentOrAdmin } = require('../middleware/auth');

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// Get tutor recommendations for a student
router.get('/recommendations/:student_id', verifyToken, requireStudentOrAdmin, async (req, res) => {
  try {
    const { student_id } = req.params;
    const { limit = 10, subject_id, min_rating, max_rate } = req.query;

    // Verify student exists and user has access
    const student = await models.Student.findByPk(student_id, {
      include: [{ model: models.User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if user is accessing their own data or is admin
    if (req.user.role !== 'admin' && student.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Call ML service for recommendations
    let mlRecommendations = [];
    try {
      const mlResponse = await axios.get(`${ML_SERVICE_URL}/ml/recommend/${student_id}`);
      if (mlResponse.data.success) {
        mlRecommendations = mlResponse.data.data.recommendations;
      }
    } catch (mlError) {
      console.warn('ML service unavailable, using fallback recommendations:', mlError.message);
    }

    // Build query for tutors
    const whereClause = {
      verified: true,
      is_approved: true
    };

    if (min_rating) {
      whereClause.average_rating = { [models.Sequelize.Op.gte]: parseFloat(min_rating) };
    }

    if (max_rate) {
      whereClause.hourly_rate = { [models.Sequelize.Op.lte]: parseFloat(max_rate) };
    }

    // Get tutors with filters
    const tutors = await models.Tutor.findAll({
      where: whereClause,
      include: [
        { model: models.User, as: 'user' },
        { 
          model: models.Subject, 
          as: 'subjects',
          through: { attributes: ['proficiency_level', 'years_experience'] },
          ...(subject_id ? { where: { subject_id } } : {})
        }
      ],
      order: [['average_rating', 'DESC'], ['rating_count', 'DESC']]
    });

    // Combine ML recommendations with database results
    const recommendations = tutors.map(tutor => {
      const mlRec = mlRecommendations.find(rec => rec.tutor_id === tutor.tutor_id);
      
      return {
        tutor_id: tutor.tutor_id,
        user: {
          full_name: tutor.user.full_name,
          email: tutor.user.email
        },
        bio: tutor.bio,
        experience: tutor.experience,
        hourly_rate: tutor.hourly_rate,
        preferred_mode: tutor.preferred_mode,
        average_rating: tutor.average_rating,
        rating_count: tutor.rating_count,
        profile_picture: tutor.profile_picture,
        subjects: tutor.subjects,
        match_probability: mlRec ? mlRec.match_probability : 0.5,
        budget_match: mlRec ? mlRec.budget_match : false,
        mode_match: mlRec ? mlRec.mode_match : false,
        is_recommended: mlRec ? mlRec.match_probability > 0.6 : false
      };
    });

    // Sort by match probability and rating
    recommendations.sort((a, b) => {
      if (a.is_recommended !== b.is_recommended) {
        return b.is_recommended - a.is_recommended;
      }
      if (Math.abs(a.match_probability - b.match_probability) > 0.1) {
        return b.match_probability - a.match_probability;
      }
      return b.average_rating - a.average_rating;
    });

    // Apply limit
    const limitedRecommendations = recommendations.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        student_id: parseInt(student_id),
        recommendations: limitedRecommendations,
        total_tutors: tutors.length,
        ml_service_available: mlRecommendations.length > 0
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get similar students (for tutors to see potential students)
router.get('/similar-students/:tutor_id', verifyToken, async (req, res) => {
  try {
    const { tutor_id } = req.params;
    const { limit = 10 } = req.query;

    // Verify tutor exists
    const tutor = await models.Tutor.findByPk(tutor_id, {
      include: [{ model: models.User, as: 'user' }]
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    // Get students who have similar preferences
    const students = await models.Student.findAll({
      include: [
        { model: models.User, as: 'user' },
        { model: models.Session, as: 'sessions', where: { status: 'completed' }, required: false }
      ],
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    const similarStudents = students.map(student => ({
      student_id: student.student_id,
      user: {
        full_name: student.user.full_name,
        email: student.user.email
      },
      academic_level: student.academic_level,
      preferred_mode: student.preferred_mode,
      budget: student.budget,
      learning_goals: student.learning_goals,
      subjects_of_interest: student.subjects_of_interest,
      total_sessions: student.sessions ? student.sessions.length : 0
    }));

    res.json({
      success: true,
      data: {
        tutor_id: parseInt(tutor_id),
        similar_students: similarStudents
      }
    });
  } catch (error) {
    console.error('Get similar students error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Train ML models (Admin only)
router.post('/train-models', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/ml/train`);
    
    if (response.data.success) {
      res.json({
        success: true,
        message: 'ML models trained successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to train ML models'
      });
    }
  } catch (error) {
    console.error('Train models error:', error);
    res.status(500).json({
      success: false,
      message: 'ML service unavailable or training failed'
    });
  }
});

// Get matching statistics
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalStudents = await models.Student.count();
    const totalTutors = await models.Tutor.count({ where: { verified: true, is_approved: true } });
    const totalSessions = await models.Session.count({ where: { status: 'completed' } });
    const totalRatings = await models.Rating.count();

    // Get ML service health
    let mlServiceHealthy = false;
    try {
      const mlResponse = await axios.get(`${ML_SERVICE_URL}/ml/health`);
      mlServiceHealthy = mlResponse.data.success;
    } catch (mlError) {
      console.warn('ML service health check failed:', mlError.message);
    }

    res.json({
      success: true,
      data: {
        total_students: totalStudents,
        total_tutors: totalTutors,
        total_sessions: totalSessions,
        total_ratings: totalRatings,
        ml_service_healthy: mlServiceHealthy,
        matching_ratio: totalTutors > 0 ? (totalStudents / totalTutors).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get matching stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get tutor availability for matching
router.get('/tutor-availability/:tutor_id', verifyToken, async (req, res) => {
  try {
    const { tutor_id } = req.params;
    const { date } = req.query;

    const tutor = await models.Tutor.findByPk(tutor_id);
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    // Get tutor's scheduled sessions
    const scheduledSessions = await models.Session.findAll({
      where: {
        tutor_id,
        status: ['pending', 'accepted'],
        ...(date ? { scheduled_date: { [models.Sequelize.Op.gte]: new Date(date) } } : {})
      },
      order: [['scheduled_date', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        tutor_id: parseInt(tutor_id),
        availability: tutor.availability,
        scheduled_sessions: scheduledSessions.map(session => ({
          session_id: session.session_id,
          scheduled_date: session.scheduled_date,
          duration_minutes: session.duration_minutes,
          status: session.status
        }))
      }
    });
  } catch (error) {
    console.error('Get tutor availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
