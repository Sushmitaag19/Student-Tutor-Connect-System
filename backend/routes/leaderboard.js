const express = require('express');
const models = require('../models');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get top rated tutors
router.get('/top-tutors', verifyToken, async (req, res) => {
  try {
    const { limit = 10, min_ratings = 1 } = req.query;

    const topTutors = await models.Tutor.findAll({
      where: {
        verified: true,
        is_approved: true,
        rating_count: {
          [models.Sequelize.Op.gte]: parseInt(min_ratings)
        }
      },
      include: [
        { model: models.User, as: 'user' },
        { 
          model: models.Subject, 
          as: 'subjects',
          through: { attributes: ['proficiency_level'] }
        }
      ],
      order: [
        ['average_rating', 'DESC'],
        ['rating_count', 'DESC'],
        ['total_sessions', 'DESC']
      ],
      limit: parseInt(limit)
    });

    const formattedTutors = topTutors.map((tutor, index) => ({
      rank: index + 1,
      tutor_id: tutor.tutor_id,
      user: {
        full_name: tutor.user.full_name,
        email: tutor.user.email
      },
      bio: tutor.bio,
      hourly_rate: tutor.hourly_rate,
      average_rating: tutor.average_rating,
      rating_count: tutor.rating_count,
      total_sessions: tutor.total_sessions,
      profile_picture: tutor.profile_picture,
      subjects: tutor.subjects.map(subject => ({
        name: subject.name,
        proficiency_level: subject.TutorSubject.proficiency_level
      }))
    }));

    res.json({
      success: true,
      data: {
        leaderboard: formattedTutors,
        criteria: 'Top Rated Tutors',
        total_tutors: topTutors.length
      }
    });
  } catch (error) {
    console.error('Get top tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get top Q&A contributors
router.get('/top-contributors', verifyToken, async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query; // period: 'week', 'month', 'all'

    let dateFilter = {};
    if (period === 'week') {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      };
    } else if (period === 'month') {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };
    }

    // Get top contributors based on answer upvotes and best answers
    const contributors = await models.Answer.findAll({
      where: dateFilter,
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
      ],
      attributes: [
        'tutor_id',
        'student_id',
        [models.Sequelize.fn('SUM', models.Sequelize.col('upvotes')), 'total_upvotes'],
        [models.Sequelize.fn('COUNT', models.Sequelize.literal('CASE WHEN is_best_answer = true THEN 1 END')), 'best_answers'],
        [models.Sequelize.fn('COUNT', models.Sequelize.col('answer_id')), 'total_answers']
      ],
      group: ['tutor_id', 'student_id'],
      order: [
        [models.Sequelize.literal('total_upvotes'), 'DESC'],
        [models.Sequelize.literal('best_answers'), 'DESC'],
        [models.Sequelize.literal('total_answers'), 'DESC']
      ],
      limit: parseInt(limit)
    });

    const formattedContributors = contributors.map((contributor, index) => {
      const user = contributor.tutor ? contributor.tutor.user : contributor.student.user;
      const profile = contributor.tutor ? contributor.tutor : contributor.student;
      
      return {
        rank: index + 1,
        user_id: user.user_id,
        user: {
          full_name: user.full_name,
          email: user.email
        },
        role: contributor.tutor ? 'tutor' : 'student',
        total_upvotes: parseInt(contributor.dataValues.total_upvotes) || 0,
        best_answers: parseInt(contributor.dataValues.best_answers) || 0,
        total_answers: parseInt(contributor.dataValues.total_answers) || 0,
        contribution_score: (parseInt(contributor.dataValues.total_upvotes) || 0) + 
                           (parseInt(contributor.dataValues.best_answers) || 0) * 2
      };
    });

    res.json({
      success: true,
      data: {
        leaderboard: formattedContributors,
        criteria: 'Top Q&A Contributors',
        period: period,
        total_contributors: formattedContributors.length
      }
    });
  } catch (error) {
    console.error('Get top contributors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get most active students
router.get('/active-students', verifyToken, async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    let dateFilter = {};
    if (period === 'week') {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      };
    } else if (period === 'month') {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };
    }

    const activeStudents = await models.Student.findAll({
      where: dateFilter,
      include: [
        { model: models.User, as: 'user' },
        { 
          model: models.Session, 
          as: 'sessions',
          where: { status: 'completed' },
          required: false
        },
        { 
          model: models.Question, 
          as: 'questions',
          required: false
        },
        { 
          model: models.Rating, 
          as: 'ratings',
          required: false
        }
      ],
      attributes: [
        'student_id',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('sessions.session_id')), 'completed_sessions'],
        [models.Sequelize.fn('COUNT', models.Sequelize.col('questions.question_id')), 'questions_asked'],
        [models.Sequelize.fn('COUNT', models.Sequelize.col('ratings.rating_id')), 'ratings_given']
      ],
      group: ['Student.student_id', 'User.user_id'],
      order: [
        [models.Sequelize.literal('completed_sessions'), 'DESC'],
        [models.Sequelize.literal('questions_asked'), 'DESC'],
        [models.Sequelize.literal('ratings_given'), 'DESC']
      ],
      limit: parseInt(limit)
    });

    const formattedStudents = activeStudents.map((student, index) => ({
      rank: index + 1,
      student_id: student.student_id,
      user: {
        full_name: student.user.full_name,
        email: student.user.email
      },
      completed_sessions: parseInt(student.dataValues.completed_sessions) || 0,
      questions_asked: parseInt(student.dataValues.questions_asked) || 0,
      ratings_given: parseInt(student.dataValues.ratings_given) || 0,
      activity_score: (parseInt(student.dataValues.completed_sessions) || 0) * 2 +
                     (parseInt(student.dataValues.questions_asked) || 0) +
                     (parseInt(student.dataValues.ratings_given) || 0)
    }));

    res.json({
      success: true,
      data: {
        leaderboard: formattedStudents,
        criteria: 'Most Active Students',
        period: period,
        total_students: formattedStudents.length
      }
    });
  } catch (error) {
    console.error('Get active students error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get top performing tutors by sessions
router.get('/top-session-tutors', verifyToken, async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    let dateFilter = {};
    if (period === 'week') {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      };
    } else if (period === 'month') {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };
    }

    const topSessionTutors = await models.Tutor.findAll({
      where: {
        verified: true,
        is_approved: true,
        ...dateFilter
      },
      include: [
        { model: models.User, as: 'user' },
        { 
          model: models.Session, 
          as: 'sessions',
          where: { status: 'completed' },
          required: false
        }
      ],
      attributes: [
        'tutor_id',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('sessions.session_id')), 'completed_sessions'],
        [models.Sequelize.fn('SUM', models.Sequelize.col('sessions.total_cost')), 'total_earnings']
      ],
      group: ['Tutor.tutor_id', 'User.user_id'],
      order: [
        [models.Sequelize.literal('completed_sessions'), 'DESC'],
        [models.Sequelize.literal('total_earnings'), 'DESC']
      ],
      limit: parseInt(limit)
    });

    const formattedTutors = topSessionTutors.map((tutor, index) => ({
      rank: index + 1,
      tutor_id: tutor.tutor_id,
      user: {
        full_name: tutor.user.full_name,
        email: tutor.user.email
      },
      completed_sessions: parseInt(tutor.dataValues.completed_sessions) || 0,
      total_earnings: parseFloat(tutor.dataValues.total_earnings) || 0,
      average_rating: tutor.average_rating,
      rating_count: tutor.rating_count
    }));

    res.json({
      success: true,
      data: {
        leaderboard: formattedTutors,
        criteria: 'Top Session Tutors',
        period: period,
        total_tutors: formattedTutors.length
      }
    });
  } catch (error) {
    console.error('Get top session tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's ranking in different categories
router.get('/user-ranking/:user_id', verifyToken, async (req, res) => {
  try {
    const { user_id } = req.params;

    // Check if user has access
    if (req.user.role !== 'admin' && req.user.user_id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const rankings = {};

    // Get tutor ranking if user is a tutor
    if (user.role === 'tutor') {
      const tutor = await models.Tutor.findOne({ 
        where: { user_id },
        include: [{ model: models.User, as: 'user' }]
      });

      if (tutor) {
        const tutorRank = await models.Tutor.count({
          where: {
            verified: true,
            is_approved: true,
            [models.Sequelize.Op.or]: [
              { average_rating: { [models.Sequelize.Op.gt]: tutor.average_rating } },
              { 
                average_rating: tutor.average_rating,
                rating_count: { [models.Sequelize.Op.gt]: tutor.rating_count }
              }
            ]
          }
        });

        rankings.tutor_rating_rank = tutorRank + 1;
        rankings.tutor_rating_percentile = Math.round((1 - tutorRank / await models.Tutor.count({ where: { verified: true, is_approved: true } })) * 100);
      }
    }

    // Get student ranking if user is a student
    if (user.role === 'student') {
      const student = await models.Student.findOne({ where: { user_id } });
      
      if (student) {
        const studentActivity = await models.Student.findAll({
          include: [
            { 
              model: models.Session, 
              as: 'sessions',
              where: { status: 'completed' },
              required: false
            }
          ],
          attributes: [
            'student_id',
            [models.Sequelize.fn('COUNT', models.Sequelize.col('sessions.session_id')), 'completed_sessions']
          ],
          group: ['Student.student_id'],
          order: [[models.Sequelize.literal('completed_sessions'), 'DESC']]
        });

        const userActivity = studentActivity.find(s => s.student_id === student.student_id);
        if (userActivity) {
          const activityRank = studentActivity.findIndex(s => s.student_id === student.student_id);
          rankings.student_activity_rank = activityRank + 1;
          rankings.student_activity_percentile = Math.round((1 - activityRank / studentActivity.length) * 100);
        }
      }
    }

    res.json({
      success: true,
      data: {
        user_id: parseInt(user_id),
        rankings: rankings
      }
    });
  } catch (error) {
    console.error('Get user ranking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get leaderboard statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const totalTutors = await models.Tutor.count({ where: { verified: true, is_approved: true } });
    const totalStudents = await models.Student.count();
    const totalSessions = await models.Session.count({ where: { status: 'completed' } });
    const totalQuestions = await models.Question.count();
    const totalAnswers = await models.Answer.count();

    // Get top performers
    const topRatedTutor = await models.Tutor.findOne({
      where: { verified: true, is_approved: true },
      include: [{ model: models.User, as: 'user' }],
      order: [['average_rating', 'DESC'], ['rating_count', 'DESC']]
    });

    const mostActiveStudent = await models.Student.findOne({
      include: [
        { model: models.User, as: 'user' },
        { 
          model: models.Session, 
          as: 'sessions',
          where: { status: 'completed' },
          required: false
        }
      ],
      attributes: [
        'student_id',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('sessions.session_id')), 'completed_sessions']
      ],
      group: ['Student.student_id', 'User.user_id'],
      order: [[models.Sequelize.literal('completed_sessions'), 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total_tutors: totalTutors,
        total_students: totalStudents,
        total_sessions: totalSessions,
        total_questions: totalQuestions,
        total_answers: totalAnswers,
        top_rated_tutor: topRatedTutor ? {
          name: topRatedTutor.user.full_name,
          rating: topRatedTutor.average_rating,
          rating_count: topRatedTutor.rating_count
        } : null,
        most_active_student: mostActiveStudent ? {
          name: mostActiveStudent.user.full_name,
          completed_sessions: parseInt(mostActiveStudent.dataValues.completed_sessions) || 0
        } : null
      }
    });
  } catch (error) {
    console.error('Get leaderboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
