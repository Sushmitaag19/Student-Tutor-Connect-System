const express = require('express');
const multer = require('multer');
const path = require('path');
const models = require('../models');
const { verifyToken, requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateStudentProfile, validateTutorProfile } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// Get all users (Admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
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
      order: [['created_at', 'DESC']]
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

// Get user by ID
router.get('/:user_id', verifyToken, requireOwnershipOrAdmin('user_id'), async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.user_id, {
      include: [
        { model: models.Student, as: 'studentProfile' },
        { model: models.Tutor, as: 'tutorProfile' }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/:user_id', verifyToken, requireOwnershipOrAdmin('user_id'), async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const user = await models.User.findByPk(req.params.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await models.User.findOne({ 
        where: { 
          email,
          user_id: { [models.Sequelize.Op.ne]: req.params.user_id }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    await user.update({
      full_name: full_name || user.full_name,
      email: email || user.email
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update student profile
router.put('/:user_id/student', verifyToken, requireOwnershipOrAdmin('user_id'), validateStudentProfile, async (req, res) => {
  try {
    const { academic_level, preferred_mode, budget, availability, learning_goals, subjects_of_interest } = req.body;
    
    const student = await models.Student.findOne({ 
      where: { user_id: req.params.user_id } 
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    await student.update({
      academic_level: academic_level || student.academic_level,
      preferred_mode: preferred_mode || student.preferred_mode,
      budget: budget !== undefined ? budget : student.budget,
      availability: availability || student.availability,
      learning_goals: learning_goals || student.learning_goals,
      subjects_of_interest: subjects_of_interest || student.subjects_of_interest
    });

    res.json({
      success: true,
      message: 'Student profile updated successfully',
      data: { student }
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update tutor profile
router.put('/:user_id/tutor', verifyToken, requireOwnershipOrAdmin('user_id'), validateTutorProfile, upload.single('profile_picture'), async (req, res) => {
  try {
    const { bio, experience, hourly_rate, preferred_mode, availability, qualifications } = req.body;
    
    const tutor = await models.Tutor.findOne({ 
      where: { user_id: req.params.user_id } 
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    const updateData = {
      bio: bio || tutor.bio,
      experience: experience || tutor.experience,
      hourly_rate: hourly_rate !== undefined ? hourly_rate : tutor.hourly_rate,
      preferred_mode: preferred_mode || tutor.preferred_mode,
      availability: availability || tutor.availability,
      qualifications: qualifications || tutor.qualifications
    };

    // Handle profile picture upload
    if (req.file) {
      updateData.profile_picture = req.file.filename;
    }

    await tutor.update(updateData);

    res.json({
      success: true,
      message: 'Tutor profile updated successfully',
      data: { tutor }
    });
  } catch (error) {
    console.error('Update tutor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload tutor documents
router.post('/:user_id/tutor/documents', verifyToken, requireOwnershipOrAdmin('user_id'), upload.array('documents', 5), async (req, res) => {
  try {
    const tutor = await models.Tutor.findOne({ 
      where: { user_id: req.params.user_id } 
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const documentNames = req.files.map(file => file.filename);
    const existingDocuments = tutor.documents || [];
    const updatedDocuments = [...existingDocuments, ...documentNames];

    await tutor.update({ documents: updatedDocuments });

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { documents: updatedDocuments }
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Deactivate user account (Admin only)
router.put('/:user_id/deactivate', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'User account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Activate user account (Admin only)
router.put('/:user_id/activate', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ is_active: true });

    res.json({
      success: true,
      message: 'User account activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user account (Admin only)
router.delete('/:user_id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
