const express = require('express');
const models = require('../models');
const { verifyToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, is_read, type } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = { user_id: req.user.user_id };

    if (is_read !== undefined) {
      whereClause.is_read = is_read === 'true';
    }

    if (type) {
      whereClause.type = type;
    }

    const notifications = await models.Notification.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(notifications.count / limit),
          totalItems: notifications.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get unread notification count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const unreadCount = await models.Notification.count({
      where: { 
        user_id: req.user.user_id,
        is_read: false 
      }
    });

    res.json({
      success: true,
      data: { unread_count: unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark notification as read
router.put('/:notification_id/read', verifyToken, async (req, res) => {
  try {
    const notification = await models.Notification.findByPk(req.params.notification_id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.update({ 
      is_read: true,
      read_at: new Date()
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await models.Notification.update(
      { 
        is_read: true,
        read_at: new Date()
      },
      { 
        where: { 
          user_id: req.user.user_id,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete notification
router.delete('/:notification_id', verifyToken, async (req, res) => {
  try {
    const notification = await models.Notification.findByPk(req.params.notification_id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete all notifications
router.delete('/delete-all', verifyToken, async (req, res) => {
  try {
    await models.Notification.destroy({
      where: { user_id: req.user.user_id }
    });

    res.json({
      success: true,
      message: 'All notifications deleted successfully'
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get notification by ID
router.get('/:notification_id', verifyToken, async (req, res) => {
  try {
    const notification = await models.Notification.findByPk(req.params.notification_id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send test email (Admin only)
router.post('/send-test-email', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Email, subject, and message are required'
      });
    }

    const result = await emailService.sendEmail(email, subject, message, message);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get notification statistics (Admin only)
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const totalNotifications = await models.Notification.count();
    const unreadNotifications = await models.Notification.count({ 
      where: { is_read: false } 
    });
    const emailSentNotifications = await models.Notification.count({ 
      where: { is_email_sent: true } 
    });

    // Get notifications by type
    const notificationsByType = await models.Notification.findAll({
      attributes: [
        'type',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('type')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        total_notifications: totalNotifications,
        unread_notifications: unreadNotifications,
        email_sent_notifications: emailSentNotifications,
        notifications_by_type: notificationsByType
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
