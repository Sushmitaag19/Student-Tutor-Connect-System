const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'connection.env') });

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
   
    if (!origin) return callback(null, true);
    
    if (origin === 'null' || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// Increase body size limits to support large JSON (e.g., base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Load routes with error handling
try {
  console.log('Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✓ Auth routes loaded');
  
  const tutorRoutes = require('./routes/tutor');
  console.log('✓ Tutor routes loaded');
  app.use('/api/tutor', tutorRoutes);
  
  app.use('/api/student', require('./routes/student'));
  console.log('✓ Student routes loaded');
  
  app.use('/api/test', require('./routes/test'));
  console.log('✓ Test routes loaded');
  
  app.use('/api/search', require('./routes/search'));
  console.log('✓ Search routes loaded');
  
  app.use('/api/requests', require('./routes/requests'));
  console.log('✓ Requests routes loaded');
  
  app.use('/api/feedback', require('./routes/feedback'));
  console.log('✓ Feedback routes loaded');
  
  // Mount recommendation routes (optional)
  try {
    const recommendationRoutes = require('./routes/recommendations');
    app.use('/api', recommendationRoutes);
    console.log('✓ Recommendation routes loaded');
  } catch (e) {
    console.warn('Recommendation routes not found; skipping.');
  }
  
  // Log registered tutor routes for debugging
  if (tutorRoutes && tutorRoutes.stack) {
    console.log('Registered tutor routes:');
    tutorRoutes.stack.forEach((route) => {
      if (route.route) {
        console.log(`  ${Object.keys(route.route.methods).join(', ').toUpperCase()} ${route.route.path}`);
      }
    });
  }
} catch (error) {
  console.error('Error loading routes:', error);
  throw error;
}

app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working!',
    origin: req.headers.origin 
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes - return JSON instead of HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/tutor/verified',
      '/api/tutor/all',
      '/api/tutor/me',
      '/api/tutor/profile/:user_id',
      '/api/student/all',
      '/api/student/profile/:user_id',
      '/api/test/quiz/:subject',
      '/api/test/quiz/submit'
    ]
  });
});

// Global error handler to ensure JSON responses (e.g., body too large or bad JSON)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload Too Large', message: 'Request body exceeds the allowed limit' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON', message: 'Malformed JSON in request body' });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000; 
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('CORS configured for all origins including null');
  });
}

module.exports = app;

