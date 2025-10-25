const validator = require('validator');

// Email validation
const validateEmail = (email) => {
  return validator.isEmail(email);
};

// Password validation
const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Name validation
const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 40;
};

// Rating validation
const validateRating = (rating) => {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
};

// User registration validation
const validateUserRegistration = (req, res, next) => {
  const { full_name, email, password, role } = req.body;
  const errors = [];

  if (!validateName(full_name)) {
    errors.push('Full name must be between 2 and 40 characters');
  }

  if (!validateEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!validatePassword(password)) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!['student', 'tutor', 'admin'].includes(role)) {
    errors.push('Role must be student, tutor, or admin');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Student profile validation
const validateStudentProfile = (req, res, next) => {
  const { academic_level, preferred_mode, budget } = req.body;
  const errors = [];

  if (preferred_mode && !['online', 'offline', 'hybrid'].includes(preferred_mode)) {
    errors.push('Preferred mode must be online, offline, or hybrid');
  }

  if (budget && (isNaN(budget) || budget < 0)) {
    errors.push('Budget must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Tutor profile validation
const validateTutorProfile = (req, res, next) => {
  const { hourly_rate, preferred_mode } = req.body;
  const errors = [];

  if (hourly_rate && (isNaN(hourly_rate) || hourly_rate < 0)) {
    errors.push('Hourly rate must be a positive number');
  }

  if (preferred_mode && !['online', 'offline', 'hybrid'].includes(preferred_mode)) {
    errors.push('Preferred mode must be online, offline, or hybrid');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Session validation
const validateSession = (req, res, next) => {
  const { title, scheduled_date, duration_minutes, mode, hourly_rate } = req.body;
  const errors = [];

  if (!title || title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  if (!scheduled_date || new Date(scheduled_date) <= new Date()) {
    errors.push('Scheduled date must be in the future');
  }

  if (duration_minutes && (duration_minutes < 15 || duration_minutes > 480)) {
    errors.push('Duration must be between 15 and 480 minutes');
  }

  if (mode && !['online', 'offline', 'hybrid'].includes(mode)) {
    errors.push('Mode must be online, offline, or hybrid');
  }

  if (hourly_rate && (isNaN(hourly_rate) || hourly_rate < 0)) {
    errors.push('Hourly rate must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Rating validation
const validateRatingSubmission = (req, res, next) => {
  const { rating, communication_rating, knowledge_rating, punctuality_rating } = req.body;
  const errors = [];

  if (!validateRating(rating)) {
    errors.push('Rating must be between 1 and 5');
  }

  if (communication_rating && !validateRating(communication_rating)) {
    errors.push('Communication rating must be between 1 and 5');
  }

  if (knowledge_rating && !validateRating(knowledge_rating)) {
    errors.push('Knowledge rating must be between 1 and 5');
  }

  if (punctuality_rating && !validateRating(punctuality_rating)) {
    errors.push('Punctuality rating must be between 1 and 5');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Question validation
const validateQuestion = (req, res, next) => {
  const { title, content } = req.body;
  const errors = [];

  if (!title || title.trim().length < 10) {
    errors.push('Title must be at least 10 characters long');
  }

  if (!content || content.trim().length < 20) {
    errors.push('Content must be at least 20 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Answer validation
const validateAnswer = (req, res, next) => {
  const { content } = req.body;
  const errors = [];

  if (!content || content.trim().length < 10) {
    errors.push('Answer content must be at least 10 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateRating,
  validateUserRegistration,
  validateStudentProfile,
  validateTutorProfile,
  validateSession,
  validateRatingSubmission,
  validateQuestion,
  validateAnswer
};
