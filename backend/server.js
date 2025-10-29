const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'connection.env') });

const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutor');
const studentRoutes = require('./routes/student');
const testRoutes = require('./routes/test');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/test', testRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Student Tutor Connect System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            tutor: '/api/tutor',
            student: '/api/student',
            test: '/api/test'
        }
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

