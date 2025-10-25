const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import models and services
const models = require('./models');
const { generalLimiter } = require('./middleware/rateLimiting');
const notificationService = require('./services/notificationService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tutorVerificationRoutes = require('./routes/tutorVerification');
const matchingRoutes = require('./routes/matching');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');
const ratingRoutes = require('./routes/ratings');
const sessionRoutes = require('./routes/sessions');
const notificationRoutes = require('./routes/notifications');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tutor-verification', tutorVerificationRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Student-Tutor Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tutorVerification: '/api/tutor-verification',
      matching: '/api/matching',
      questions: '/api/questions',
      answers: '/api/answers',
      ratings: '/api/ratings',
      sessions: '/api/sessions',
      notifications: '/api/notifications',
      leaderboard: '/api/leaderboard',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Log error to database if possible
  if (models.Notification) {
    models.Notification.create({
      user_id: 1, // System user
      type: 'system_error',
      title: 'System Error',
      message: `Error: ${error.message}`,
      is_read: false
    }).catch(err => console.error('Failed to log error:', err));
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Database synchronization and server startup
async function startServer() {
  try {
    // Test database connection
    await models.sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database models
    if (process.env.NODE_ENV === 'development') {
      await models.sequelize.sync({ alter: true });
      console.log('Database synchronized.');
    }

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
      console.log(`📊 API Documentation available at http://localhost:${port}`);
      console.log(`🔍 Health check available at http://localhost:${port}/health`);
    });

    // Setup cleanup tasks
    setupCleanupTasks();

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Setup periodic cleanup tasks
function setupCleanupTasks() {
  // Clean up old notifications every 24 hours
  setInterval(async () => {
    try {
      await notificationService.cleanupOldNotifications(30);
    } catch (error) {
      console.error('Cleanup task failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Clean up old sessions every week
  setInterval(async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      await models.Session.destroy({
        where: {
          status: 'cancelled',
          created_at: { [models.Sequelize.Op.lt]: cutoffDate }
        }
      });
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await models.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await models.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();