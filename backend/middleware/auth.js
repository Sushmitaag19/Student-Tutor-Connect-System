const jwt = require('jsonwebtoken');
const models = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      user_id: user.user_id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Role-based access control middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is tutor or admin
const requireTutorOrAdmin = requireRole('tutor', 'admin');

// Check if user is student or admin
const requireStudentOrAdmin = requireRole('student', 'admin');

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.user_id.toString() !== resourceUserId?.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only access your own resources.' 
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we don't fail the request
      req.user = null;
    }
  }
  
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  requireRole,
  requireAdmin,
  requireTutorOrAdmin,
  requireStudentOrAdmin,
  requireOwnershipOrAdmin,
  optionalAuth
};
