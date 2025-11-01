// const express = require('express');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, 'connection.env') });

// const authRoutes = require('./routes/auth');
// const tutorRoutes = require('./routes/tutor');
// const studentRoutes = require('./routes/student');
// const testRoutes = require('./routes/test');

// const app = express();
// const PORT = process.env.PORT || 5000;

// const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
// app.use(cors({ origin: allowedOrigin, credentials: true }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// app.use('/api/auth', authRoutes);
// app.use('/api/tutor', tutorRoutes);
// app.use('/api/student', studentRoutes);
// app.use('/api/test', testRoutes);

// app.get('/', (req, res) => {
//     res.json({
//         message: 'Student Tutor Connect System API',
//         version: '1.0.0',
//         endpoints: {
//             auth: '/api/auth',
//             tutor: '/api/tutor',
//             student: '/api/student',
//             test: '/api/test'
//         }
//     });
// });

// app.use('*', (req, res) => {
//     res.status(404).json({
//         error: 'Route not found',
//         message: `Cannot ${req.method} ${req.originalUrl}`
//     });
// });

// app.use((err, req, res, next) => {
//     console.error('Error:', err);
//     res.status(err.status || 500).json({
//         error: 'Internal server error',
//         message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
//     });
// });

// app.listen(PORT, () => {
//     console.log(` Server running on http://localhost:${PORT}`);
//     console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
// });

// module.exports = app;

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

app.use(express.json());
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

const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('CORS configured for all origins including null');
});