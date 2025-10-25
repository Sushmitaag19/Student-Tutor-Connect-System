const express = require('express');
const models = require('../models');
const { verifyToken, requireAdmin, requireTutorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Submit tutor verification data
router.post('/submit', verifyToken, requireTutorOrAdmin, async (req, res) => {
  try {
    const { test_score, qualifications, documents } = req.body;
    const tutor_id = req.user.role === 'tutor' ? 
      (await models.Tutor.findOne({ where: { user_id: req.user.user_id } }))?.tutor_id :
      req.body.tutor_id;

    if (!tutor_id) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    // Check if verification already exists
    let verification = await models.TutorVerification.findOne({ 
      where: { tutor_id } 
    });

    if (verification) {
      // Update existing verification
      await verification.update({
        test_score,
        qualifications,
        documents,
        is_auto_verified: test_score >= 80,
        is_approved: false // Reset approval when new data is submitted
      });
    } else {
      // Create new verification
      verification = await models.TutorVerification.create({
        tutor_id,
        test_score,
        qualifications,
        documents,
        is_auto_verified: test_score >= 80
      });
    }

    // Update tutor verification status
    const tutor = await models.Tutor.findByPk(tutor_id);
    if (tutor) {
      await tutor.update({
        verified: verification.is_auto_verified,
        is_auto_verified: verification.is_auto_verified
      });
    }

    res.json({
      success: true,
      message: 'Verification data submitted successfully',
      data: { verification }
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get verification status
router.get('/status/:tutor_id', verifyToken, async (req, res) => {
  try {
    const verification = await models.TutorVerification.findOne({
      where: { tutor_id: req.params.tutor_id },
      include: [
        { model: models.Tutor, as: 'tutor' },
        { model: models.User, as: 'approver' }
      ]
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    res.json({
      success: true,
      data: { verification }
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all pending verifications (Admin only)
router.get('/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const verifications = await models.TutorVerification.findAndCountAll({
      where: { is_approved: false },
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
      order: [['created_at', 'ASC']]
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
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Approve tutor verification (Admin only)
router.put('/:verification_id/approve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { approval_notes } = req.body;
    
    const verification = await models.TutorVerification.findByPk(req.params.verification_id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    // Update verification
    await verification.update({
      is_approved: true,
      approved_by: req.user.user_id,
      approval_notes,
      verification_date: new Date()
    });

    // Update tutor status
    const tutor = await models.Tutor.findByPk(verification.tutor_id);
    if (tutor) {
      await tutor.update({
        verified: true,
        is_approved: true
      });
    }

    // Create notification for tutor
    await models.Notification.create({
      user_id: tutor.user_id,
      type: 'tutor_approved',
      title: 'Tutor Verification Approved',
      message: 'Congratulations! Your tutor verification has been approved. You can now start accepting students.',
      related_id: verification.verification_id,
      related_type: 'verification'
    });

    res.json({
      success: true,
      message: 'Tutor verification approved successfully',
      data: { verification }
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject tutor verification (Admin only)
router.put('/:verification_id/reject', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { approval_notes } = req.body;
    
    const verification = await models.TutorVerification.findByPk(req.params.verification_id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    // Update verification
    await verification.update({
      is_approved: false,
      approved_by: req.user.user_id,
      approval_notes
    });

    // Update tutor status
    const tutor = await models.Tutor.findByPk(verification.tutor_id);
    if (tutor) {
      await tutor.update({
        verified: false,
        is_approved: false
      });
    }

    // Create notification for tutor
    await models.Notification.create({
      user_id: tutor.user_id,
      type: 'tutor_rejected',
      title: 'Tutor Verification Rejected',
      message: `Your tutor verification has been rejected. Reason: ${approval_notes || 'Please review your qualifications and try again.'}`,
      related_id: verification.verification_id,
      related_type: 'verification'
    });

    res.json({
      success: true,
      message: 'Tutor verification rejected',
      data: { verification }
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get verification statistics (Admin only)
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalVerifications = await models.TutorVerification.count();
    const pendingVerifications = await models.TutorVerification.count({ 
      where: { is_approved: false } 
    });
    const approvedVerifications = await models.TutorVerification.count({ 
      where: { is_approved: true } 
    });
    const autoVerified = await models.TutorVerification.count({ 
      where: { is_auto_verified: true } 
    });

    res.json({
      success: true,
      data: {
        totalVerifications,
        pendingVerifications,
        approvedVerifications,
        autoVerified,
        approvalRate: totalVerifications > 0 ? (approvedVerifications / totalVerifications * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get verification details (Admin only)
router.get('/:verification_id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const verification = await models.TutorVerification.findByPk(req.params.verification_id, {
      include: [
        { 
          model: models.Tutor, 
          as: 'tutor',
          include: [{ model: models.User, as: 'user' }]
        },
        { model: models.User, as: 'approver' }
      ]
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    res.json({
      success: true,
      data: { verification }
    });
  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
