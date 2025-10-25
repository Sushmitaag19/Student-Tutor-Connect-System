const express = require('express');
const models = require('../models');
const { verifyToken, requireStudentOrAdmin, requireTutorOrAdmin } = require('../middleware/auth');
const { validateSession } = require('../middleware/validation');
const { sessionBookingLimiter } = require('../middleware/rateLimiting');

const router = express.Router();

// Get all sessions with filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      student_id, 
      tutor_id, 
      subject_id,
      date_from,
      date_to,
      sort_by = 'scheduled_date',
      sort_order = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (status) whereClause.status = status;
    if (student_id) whereClause.student_id = student_id;
    if (tutor_id) whereClause.tutor_id = tutor_id;
    if (subject_id) whereClause.subject_id = subject_id;
    
    if (date_from) {
      whereClause.scheduled_date = { 
        ...whereClause.scheduled_date,
        [models.Sequelize.Op.gte]: new Date(date_from)
      };
    }
    
    if (date_to) {
      whereClause.scheduled_date = { 
        ...whereClause.scheduled_date,
        [models.Sequelize.Op.lte]: new Date(date_to)
      };
    }

    // Role-based filtering
    if (req.user.role === 'student') {
      const student = await models.Student.findOne({ 
        where: { user_id: req.user.user_id } 
      });
      if (student) {
        whereClause.student_id = student.student_id;
      }
    } else if (req.user.role === 'tutor') {
      const tutor = await models.Tutor.findOne({ 
        where: { user_id: req.user.user_id } 
      });
      if (tutor) {
        whereClause.tutor_id = tutor.tutor_id;
      }
    }

    const sessions = await models.Session.findAndCountAll({
      where: whereClause,
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
        { model: models.Subject, as: 'subject' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        sessions: sessions.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(sessions.count / limit),
          totalItems: sessions.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get session by ID
router.get('/:session_id', verifyToken, async (req, res) => {
  try {
    const session = await models.Session.findByPk(req.params.session_id, {
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
        { model: models.Subject, as: 'subject' }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'student' && session.student.user_id === req.user.user_id) ||
      (req.user.role === 'tutor' && session.tutor.user_id === req.user.user_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new session request
router.post('/', sessionBookingLimiter, verifyToken, requireStudentOrAdmin, validateSession, async (req, res) => {
  try {
    const { 
      tutor_id, 
      subject_id, 
      title, 
      description, 
      scheduled_date, 
      duration_minutes, 
      mode, 
      location, 
      meeting_link 
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

    // Check if tutor exists and is verified
    const tutor = await models.Tutor.findByPk(tutor_id, {
      include: [{ model: models.User, as: 'user' }]
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    if (!tutor.verified || !tutor.is_approved) {
      return res.status(400).json({
        success: false,
        message: 'Tutor is not verified or approved'
      });
    }

    // Check for scheduling conflicts
    const conflictingSession = await models.Session.findOne({
      where: {
        tutor_id,
        scheduled_date: {
          [models.Sequelize.Op.between]: [
            new Date(scheduled_date),
            new Date(new Date(scheduled_date).getTime() + duration_minutes * 60000)
          ]
        },
        status: ['pending', 'accepted']
      }
    });

    if (conflictingSession) {
      return res.status(400).json({
        success: false,
        message: 'Tutor has a conflicting session at this time'
      });
    }

    // Calculate total cost
    const totalCost = (tutor.hourly_rate * duration_minutes) / 60;

    // Create session
    const session = await models.Session.create({
      student_id: student.student_id,
      tutor_id,
      subject_id,
      title,
      description,
      scheduled_date: new Date(scheduled_date),
      duration_minutes,
      mode,
      location,
      meeting_link,
      hourly_rate: tutor.hourly_rate,
      total_cost: totalCost,
      status: 'pending'
    });

    // Create notification for tutor
    await models.Notification.create({
      user_id: tutor.user_id,
      type: 'session_request',
      title: 'New Session Request',
      message: `You have a new session request from ${student.user.full_name} for ${title}.`,
      related_id: session.session_id,
      related_type: 'session'
    });

    // Get the created session with relations
    const createdSession = await models.Session.findByPk(session.session_id, {
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
        { model: models.Subject, as: 'subject' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Session request created successfully',
      data: { session: createdSession }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Accept session request (Tutor only)
router.put('/:session_id/accept', verifyToken, requireTutorOrAdmin, async (req, res) => {
  try {
    const session = await models.Session.findByPk(req.params.session_id, {
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
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is the tutor or admin
    if (req.user.role !== 'admin' && session.tutor.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Session is not in pending status'
      });
    }

    await session.update({ status: 'accepted' });

    // Create notification for student
    await models.Notification.create({
      user_id: session.student.user_id,
      type: 'session_accepted',
      title: 'Session Request Accepted',
      message: `Your session request "${session.title}" has been accepted by ${session.tutor.user.full_name}.`,
      related_id: session.session_id,
      related_type: 'session'
    });

    res.json({
      success: true,
      message: 'Session request accepted',
      data: { session }
    });
  } catch (error) {
    console.error('Accept session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject session request (Tutor only)
router.put('/:session_id/reject', verifyToken, requireTutorOrAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const session = await models.Session.findByPk(req.params.session_id, {
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
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is the tutor or admin
    if (req.user.role !== 'admin' && session.tutor.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Session is not in pending status'
      });
    }

    await session.update({ 
      status: 'rejected',
      notes: reason || 'Session request rejected'
    });

    // Create notification for student
    await models.Notification.create({
      user_id: session.student.user_id,
      type: 'session_rejected',
      title: 'Session Request Rejected',
      message: `Your session request "${session.title}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
      related_id: session.session_id,
      related_type: 'session'
    });

    res.json({
      success: true,
      message: 'Session request rejected',
      data: { session }
    });
  } catch (error) {
    console.error('Reject session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complete session
router.put('/:session_id/complete', verifyToken, async (req, res) => {
  try {
    const session = await models.Session.findByPk(req.params.session_id, {
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
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'student' && session.student.user_id === req.user.user_id) ||
      (req.user.role === 'tutor' && session.tutor.user_id === req.user.user_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (session.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Session must be accepted before completion'
      });
    }

    await session.update({ 
      status: 'completed',
      completed_at: new Date()
    });

    // Update tutor's total sessions
    await session.tutor.update({
      total_sessions: session.tutor.total_sessions + 1
    });

    res.json({
      success: true,
      message: 'Session marked as completed',
      data: { session }
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel session
router.put('/:session_id/cancel', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const session = await models.Session.findByPk(req.params.session_id, {
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
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'student' && session.student.user_id === req.user.user_id) ||
      (req.user.role === 'tutor' && session.tutor.user_id === req.user.user_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed session'
      });
    }

    await session.update({ 
      status: 'cancelled',
      notes: reason || 'Session cancelled'
    });

    res.json({
      success: true,
      message: 'Session cancelled',
      data: { session }
    });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update session
router.put('/:session_id', verifyToken, async (req, res) => {
  try {
    const { title, description, scheduled_date, duration_minutes, location, meeting_link, notes } = req.body;

    const session = await models.Session.findByPk(req.params.session_id, {
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
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'student' && session.student.user_id === req.user.user_id) ||
      (req.user.role === 'tutor' && session.tutor.user_id === req.user.user_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow updates for pending or accepted sessions
    if (!['pending', 'accepted'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled sessions'
      });
    }

    await session.update({
      title: title || session.title,
      description: description || session.description,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : session.scheduled_date,
      duration_minutes: duration_minutes || session.duration_minutes,
      location: location || session.location,
      meeting_link: meeting_link || session.meeting_link,
      notes: notes || session.notes
    });

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: { session }
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete session
router.delete('/:session_id', verifyToken, async (req, res) => {
  try {
    const session = await models.Session.findByPk(req.params.session_id, {
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
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'student' && session.student.user_id === req.user.user_id) ||
      (req.user.role === 'tutor' && session.tutor.user_id === req.user.user_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow deletion of pending sessions
    if (session.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending sessions'
      });
    }

    await session.destroy();

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get session statistics
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    const { student_id, tutor_id, date_from, date_to } = req.query;
    const whereClause = {};

    if (student_id) whereClause.student_id = student_id;
    if (tutor_id) whereClause.tutor_id = tutor_id;
    
    if (date_from) {
      whereClause.scheduled_date = { 
        ...whereClause.scheduled_date,
        [models.Sequelize.Op.gte]: new Date(date_from)
      };
    }
    
    if (date_to) {
      whereClause.scheduled_date = { 
        ...whereClause.scheduled_date,
        [models.Sequelize.Op.lte]: new Date(date_to)
      };
    }

    // Role-based filtering
    if (req.user.role === 'student') {
      const student = await models.Student.findOne({ 
        where: { user_id: req.user.user_id } 
      });
      if (student) {
        whereClause.student_id = student.student_id;
      }
    } else if (req.user.role === 'tutor') {
      const tutor = await models.Tutor.findOne({ 
        where: { user_id: req.user.user_id } 
      });
      if (tutor) {
        whereClause.tutor_id = tutor.tutor_id;
      }
    }

    const totalSessions = await models.Session.count({ where: whereClause });
    const completedSessions = await models.Session.count({ 
      where: { ...whereClause, status: 'completed' } 
    });
    const pendingSessions = await models.Session.count({ 
      where: { ...whereClause, status: 'pending' } 
    });
    const acceptedSessions = await models.Session.count({ 
      where: { ...whereClause, status: 'accepted' } 
    });

    res.json({
      success: true,
      data: {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        pending_sessions: pendingSessions,
        accepted_sessions: acceptedSessions,
        completion_rate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
