const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route   GET /api/test/connection
 * @desc    Test database connection
 * @access  Public
 */
router.get('/connection', async (req, res) => {
    const client = await pool.connect();
    
    try {
        // Test query to verify connection
        const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
        
        res.json({
            status: 'success',
            message: 'Database connection established',
            timestamp: result.rows[0].current_time,
            postgres_version: result.rows[0].postgres_version,
            connection_info: {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'Student_tutor'
            }
        });
        
        client.release();
    } catch (error) {
        console.error('Connection test error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to database',
            error: error.message,
            details: error
        });
        client.release();
    }
});

/**
 * @route   GET /api/test/admin
 * @desc    Test read operation - retrieve Admin User from users table
 * @access  Public
 */
router.get('/admin', async (req, res) => {
    const client = await pool.connect();
    
    try {
        // Query to retrieve Admin User
        const result = await client.query(
            'SELECT user_id, full_name, email, role, created_at FROM users WHERE role = $1',
            ['admin']
        );
        
        if (result.rows.length === 0) {
            return res.json({
                status: 'warning',
                message: 'No admin user found',
                suggestion: 'Run database_setup.sql to initialize the database with the admin user'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Admin user retrieved successfully',
            admin_user: result.rows[0],
            total_admins: result.rows.length
        });
        
        client.release();
    } catch (error) {
        console.error('Admin query error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve admin user',
            error: error.message
        });
        client.release();
    }
});

/**
 * @route   GET /api/test/users
 * @desc    Test read operation - retrieve all users
 * @access  Public
 */
router.get('/users', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const result = await client.query(
            'SELECT user_id, full_name, email, role, created_at FROM users ORDER BY user_id'
        );
        
        res.json({
            status: 'success',
            message: 'Users retrieved successfully',
            users: result.rows,
            total_users: result.rows.length
        });
        
        client.release();
    } catch (error) {
        console.error('Users query error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve users',
            error: error.message
        });
        client.release();
    }
});

/**
 * @route   GET /api/test/schema
 * @desc    Test database schema - verify tables exist
 * @access  Public
 */
router.get('/schema', async (req, res) => {
    const client = await pool.connect();
    
    try {
        // Query to check if tables exist
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        res.json({
            status: 'success',
            message: 'Schema check completed',
            tables: result.rows.map(row => row.table_name),
            table_count: result.rows.length,
            expected_tables: ['users', 'students', 'tutors'],
            all_tables_present: result.rows.length >= 3
        });
        
        client.release();
    } catch (error) {
        console.error('Schema check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check schema',
            error: error.message
        });
        client.release();
    }
});

/**
 * @route   GET /api/test/quiz/:subject
 * @desc    Retrieve quiz questions by subject (protected)
 * @access  Private (JWT)
 */
router.get('/quiz/:subject', auth, async (req, res) => {
    try {
        const subject = req.params.subject;
        const filePath = path.join(__dirname, '..', 'tests', 'subjects.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        const questions = data[subject];
        if (!questions) return res.status(404).json({ error: 'Subject not found' });
        // Do not send correct answers to client
        const sanitized = questions.map(q => ({ q: q.q, a: q.a }));
        res.json({ subject, questions: sanitized, total: sanitized.length });
    } catch (err) {
        console.error('Quiz load error:', err);
        res.status(500).json({ error: 'Failed to load quiz' });
    }
});

/**
 * @route   POST /api/test/quiz/submit
 * @desc    Grade quiz and update tutor verification if passed (>= 11 correct out of 20)
 * @access  Private (JWT)
 */
router.post('/quiz/submit', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        const { subject, answers } = req.body; // answers: array of selected indices
        if (!subject || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }
        const filePath = path.join(__dirname, '..', 'tests', 'subjects.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        const questions = data[subject];
        if (!questions) return res.status(404).json({ error: 'Subject not found' });

        const total = questions.length;
        let score = 0;
        for (let i = 0; i < Math.min(total, answers.length); i++) {
            if (answers[i] === questions[i].c) score++;
        }
        const passed = score >= 11;

        if (passed) {
            // update tutors verification_status to 'approved'
            await client.query(
                `UPDATE tutors t
                 SET verification_status = 'approved', subject = COALESCE(subject, $2)
                 FROM users u
                 WHERE t.user_id = u.user_id AND u.user_id = $1`,
                [req.user.user_id, subject]
            );
        }

        res.json({ subject, score, total, passed });
    } catch (err) {
        console.error('Quiz submit error:', err);
        res.status(500).json({ error: 'Failed to grade quiz' });
    } finally {
        client.release();
    }
});

module.exports = router;


