const express = require('express');
const models = require('../models');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview statistics
router.get('/dashboard/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // User statistics
    const totalUsers = await models.User.count();
    const newUsers = await models.User.count({
      where: { created_at: { [models.Sequelize.Op.gte]: startDate } }
    });
    const activeUsers = await models.User.count({
      where: { 
        last_login: { [models.Sequelize.Op.gte]: startDate },
        is_active: true 
      }
    });

    // Role-based statistics
    const usersByRole = await models.User.findAll({
      attributes: [
        'role',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('role')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    // Session statistics
    const totalSessions = await models.Session.count();
    const completedSessions = await models.Session.count({ 
      where: { status: 'completed' } 
    });
    const pendingSessions = await models.Session.count({ 
      where: { status: 'pending' } 
    });
    const recentSessions = await models.Session.count({
      where: { created_at: { [models.Sequelize.Op.gte]: startDate } }
    });

    // Revenue statistics
    const totalRevenue = await models.Session.sum('total_cost', {
      where: { status: 'completed' }
    }) || 0;

    const recentRevenue = await models.Session.sum('total_cost', {
      where: { 
        status: 'completed',
        created_at: { [models.Sequelize.Op.gte]: startDate }
      }
    }) || 0;

    // Q&A statistics
    const totalQuestions = await models.Question.count();
    const totalAnswers = await models.Answer.count();
    const resolvedQuestions = await models.Question.count({ 
      where: { is_resolved: true } 
    });

    // Rating statistics
    const totalRatings = await models.Rating.count();
    const averageRating = await models.Rating.findOne({
      attributes: [[models.Sequelize.fn('AVG', models.Sequelize.col('rating')), 'avg_rating']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        users: {
          total: totalUsers,
          new: newUsers,
          active: activeUsers,
          by_role: usersByRole
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          pending: pendingSessions,
          recent: recentSessions,
          completion_rate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(2) : 0
        },
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          recent: parseFloat(recentRevenue.toFixed(2))
        },
        qa: {
          total_questions: totalQuestions,
          total_answers: totalAnswers,
          resolved_questions: resolvedQuestions,
          resolution_rate: totalQuestions > 0 ? (resolvedQuestions / totalQuestions * 100).toFixed(2) : 0
        },
        ratings: {
          total: totalRatings,
          average: parseFloat(averageRating?.avg_rating || 0).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user management data
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      status, 
      search, 
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (role) whereClause.role = role;
    if (status !== undefined) whereClause.is_active = status === 'active';
    
    if (search) {
      whereClause[models.Sequelize.Op.or] = [
        { full_name: { [models.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [models.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await models.User.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.Student, as: 'studentProfile' },
        { model: models.Tutor, as: 'tutorProfile' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(users.count / limit),
          totalItems: users.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get tutor verification requests
router.get('/tutor-verifications', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'pending',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status === 'pending') {
      whereClause.is_approved = false;
    } else if (status === 'approved') {
      whereClause.is_approved = true;
    }

    const verifications = await models.TutorVerification.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.User, as: 'approver' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        verifications: verifications.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(verifications.count / limit),
          totalItems: verifications.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tutor verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get system reports
router.get('/reports', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { 
      type = 'sessions',
      period = '30',
      start_date,
      end_date
    } = req.query;

    let dateFilter = {};
    if (start_date && end_date) {
      dateFilter = {
        created_at: {
          [models.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
        }
      };
    } else {
      const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
      dateFilter = {
        created_at: { [models.Sequelize.Op.gte]: startDate }
      };
    }

    let reportData = {};

    switch (type) {
      case 'sessions':
        const sessionsByStatus = await models.Session.findAll({
          where: dateFilter,
          attributes: [
            'status',
            [models.Sequelize.fn('COUNT', models.Sequelize.col('status')), 'count']
          ],
          group: ['status'],
          raw: true
        });

        const sessionsByDate = await models.Session.findAll({
          where: dateFilter,
          attributes: [
            [models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'date'],
            [models.Sequelize.fn('COUNT', models.Sequelize.col('session_id')), 'count']
          ],
          group: [models.Sequelize.fn('DATE', models.Sequelize.col('created_at'))],
          order: [[models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'ASC']],
          raw: true
        });

        reportData = {
          by_status: sessionsByStatus,
          by_date: sessionsByDate
        };
        break;

      case 'users':
        const usersByRole = await models.User.findAll({
          where: dateFilter,
          attributes: [
            'role',
            [models.Sequelize.fn('COUNT', models.Sequelize.col('role')), 'count']
          ],
          group: ['role'],
          raw: true
        });

        const usersByDate = await models.User.findAll({
          where: dateFilter,
          attributes: [
            [models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'date'],
            [models.Sequelize.fn('COUNT', models.Sequelize.col('user_id')), 'count']
          ],
          group: [models.Sequelize.fn('DATE', models.Sequelize.col('created_at'))],
          order: [[models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'ASC']],
          raw: true
        });

        reportData = {
          by_role: usersByRole,
          by_date: usersByDate
        };
        break;

      case 'revenue':
        const revenueByDate = await models.Session.findAll({
          where: {
            ...dateFilter,
            status: 'completed'
          },
          attributes: [
            [models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'date'],
            [models.Sequelize.fn('SUM', models.Sequelize.col('total_cost')), 'revenue']
          ],
          group: [models.Sequelize.fn('DATE', models.Sequelize.col('created_at'))],
          order: [[models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'ASC']],
          raw: true
        });

        const revenueByTutor = await models.Session.findAll({
          where: {
            ...dateFilter,
            status: 'completed'
          },
          include: [
            { 
              model: models.Tutor, 
              as: 'tutor',
              include: [{ model: models.User, as: 'user' }]
            }
          ],
          attributes: [
            'tutor_id',
            [models.Sequelize.fn('SUM', models.Sequelize.col('total_cost')), 'revenue'],
            [models.Sequelize.fn('COUNT', models.Sequelize.col('session_id')), 'sessions']
          ],
          group: ['tutor_id'],
          order: [[models.Sequelize.fn('SUM', models.Sequelize.col('total_cost')), 'DESC']],
          limit: 10
        });

        reportData = {
          by_date: revenueByDate,
          by_tutor: revenueByTutor
        };
        break;

      case 'qa':
        const questionsByDate = await models.Question.findAll({
          where: dateFilter,
          attributes: [
            [models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'date'],
            [models.Sequelize.fn('COUNT', models.Sequelize.col('question_id')), 'count']
          ],
          group: [models.Sequelize.fn('DATE', models.Sequelize.col('created_at'))],
          order: [[models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'ASC']],
          raw: true
        });

        const answersByDate = await models.Answer.findAll({
          where: dateFilter,
          attributes: [
            [models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'date'],
            [models.Sequelize.fn('COUNT', models.Sequelize.col('answer_id')), 'count']
          ],
          group: [models.Sequelize.fn('DATE', models.Sequelize.col('created_at'))],
          order: [[models.Sequelize.fn('DATE', models.Sequelize.col('created_at')), 'ASC']],
          raw: true
        });

        reportData = {
          questions_by_date: questionsByDate,
          answers_by_date: answersByDate
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.json({
      success: true,
      data: {
        type: type,
        period: period,
        start_date: start_date,
        end_date: end_date,
        report: reportData
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get system health status
router.get('/system/health', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Check database connection
    let dbStatus = 'healthy';
    try {
      await models.sequelize.authenticate();
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    // Check ML service
    let mlServiceStatus = 'unknown';
    try {
      const axios = require('axios');
      const mlResponse = await axios.get(`${process.env.ML_SERVICE_URL || 'http://localhost:5000'}/ml/health`, { timeout: 5000 });
      mlServiceStatus = mlResponse.data.success ? 'healthy' : 'unhealthy';
    } catch (error) {
      mlServiceStatus = 'unhealthy';
    }

    // Get system metrics
    const totalUsers = await models.User.count();
    const totalSessions = await models.Session.count();
    const totalQuestions = await models.Question.count();
    const totalNotifications = await models.Notification.count();

    // Check for recent errors (last 24 hours)
    const recentErrors = await models.Notification.count({
      where: {
        type: 'system_error',
        created_at: { [models.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    res.json({
      success: true,
      data: {
        database: {
          status: dbStatus,
          connection: dbStatus === 'healthy' ? 'connected' : 'disconnected'
        },
        ml_service: {
          status: mlServiceStatus,
          url: process.env.ML_SERVICE_URL || 'http://localhost:5000'
        },
        metrics: {
          total_users: totalUsers,
          total_sessions: totalSessions,
          total_questions: totalQuestions,
          total_notifications: totalNotifications
        },
        alerts: {
          recent_errors: recentErrors,
          status: recentErrors > 10 ? 'warning' : 'normal'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get system settings
router.get('/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const settings = {
      email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER ? 'configured' : 'not_configured'
      },
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME
      },
      ml_service: {
        url: process.env.ML_SERVICE_URL || 'http://localhost:5000'
      },
      jwt: {
        expires_in: process.env.JWT_EXPIRES_IN || '7d'
      },
      upload: {
        max_file_size: process.env.MAX_FILE_SIZE || '5242880',
        upload_path: process.env.UPLOAD_PATH || './uploads'
      }
    };

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send system announcement
router.post('/announcements', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, message, target_role } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notificationService = require('../services/notificationService');
    const result = await notificationService.sendSystemAnnouncement(title, message, target_role);

    res.json({
      success: true,
      message: 'System announcement sent successfully',
      data: { notifications_sent: result.length }
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get admin activity log
router.get('/activity-log', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (type) whereClause.type = type;
    
    if (start_date && end_date) {
      whereClause.created_at = {
        [models.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Get admin-related activities
    const activities = await models.Notification.findAndCountAll({
      where: {
        ...whereClause,
        type: ['tutor_approved', 'tutor_rejected', 'system_announcement']
      },
      include: [
        { model: models.User, as: 'user' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        activities: activities.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(activities.count / limit),
          totalItems: activities.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
