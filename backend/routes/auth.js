const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';
const COOKIE_NAME = 'st_jwt';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
function issueSession(res, token) {
    const isProd = (process.env.NODE_ENV === 'production');
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        maxAge: ONE_DAY_MS
    });
}


router.post('/register', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { full_name, email, password, role } = req.body;

        // Input validation
        if (!full_name || !email || !password || !role) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'All fields (full_name, email, password, role) are required'
            });
        }

        // Validate role
        const validRoles = ['student', 'tutor', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be one of: student, tutor, admin'
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Validate password strength
        const pwdOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]{8,}$/.test(password);
        if (!pwdOk) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must be at least 8 characters, include letters and numbers'
            });
        }

        // Begin transaction
        await client.query('BEGIN');

        // Check if email already exists
        const emailCheck = await client.query(
            'SELECT email FROM users WHERE email = $1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'Email already exists',
                message: 'An account with this email already exists'
            });
        }

        // Hash password securely
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user with parameterized query 
        const userResult = await client.query(
            `INSERT INTO users (full_name, email, password, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING user_id, full_name, email, role, created_at`,
            [full_name, email, hashedPassword, role]
        );

        const newUser = userResult.rows[0];

        // Commit transaction
        await client.query('COMMIT');

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                user_id: newUser.user_id,
                full_name: newUser.full_name,
                email: newUser.email,
                role: newUser.role,
                created_at: newUser.created_at
            }
        });

    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration'
        });
    } finally {
        client.release();
    }
});


router.post('/login', async (req, res) => {
    const client = await pool.connect();

    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        // Find user by email using parameterized query
        const result = await client.query(
            'SELECT user_id, email, password, full_name, role, created_at FROM users WHERE email = $1',
            [email]
        );

        // Check if user exists
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        const user = result.rows[0];

        // Compare provided password with stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Sign JWT
        const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        issueSession(res, token);

        delete user.password;

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/auth/tutor-signup
 * @desc    Register tutor user and create tutor profile with subject
 * @access  Public
 */
router.post('/tutor-signup', async (req, res) => {
    const client = await pool.connect();

    try {
        const { name, email, password, education_level, subject, experience_years, hourly_rate, teaching_mode, location, profile_picture } = req.body;

        if (!name || !email || !password || !education_level || !subject || experience_years === undefined || !hourly_rate || !teaching_mode || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const pwdOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]{8,}$/.test(password);
        if (!pwdOk) {
            return res.status(400).json({ error: 'Weak password', message: 'Min 8 chars, letters and numbers' });
        }

        await client.query('BEGIN');

        // Ensure unique email
        const existing = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existing.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already exists' });
        }

        const hashed = await bcrypt.hash(password, 10);

        const userRes = await client.query(
            `INSERT INTO users (full_name, email, password, role)
             VALUES ($1, $2, $3, 'tutor') RETURNING user_id, full_name, email, role, created_at`,
            [name, email, hashed]
        );

        const user = userRes.rows[0];

        // Insert tutor with proper schema
        const tutorRes = await client.query(
            `INSERT INTO tutors (user_id, name, education_level, subject, experience_years, hourly_rate, teaching_mode, location, profile_picture, verification_status, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', true)
             RETURNING tutor_id, user_id, name, education_level, subject, experience_years, hourly_rate, teaching_mode, location, verification_status, is_available`,
            [user.user_id, name, education_level, subject, experience_years, hourly_rate, teaching_mode, location, profile_picture || null]
        );

        await client.query('COMMIT');

        const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        issueSession(res, token);

        res.status(201).json({
            message: 'Tutor registered successfully. You can now log in.',
            token,
            user,
            tutor: tutorRes.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Tutor signup error:', error);
        res.status(500).json({ error: 'Tutor signup failed', details: error.message });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Return current user from cookie/JWT
 * @access  Private
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = req.cookies && (req.cookies[COOKIE_NAME] || req.cookies.jwt);
    const token = bearer || cookieToken;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const client = await pool.connect();
        try {
            const q = await client.query(
                'SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = $1',
                [decoded.user_id]
            );
            if (!q.rows.length) return res.status(401).json({ error: 'Invalid session' });
            return res.json({ user: q.rows[0] });
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Clear session cookie
 * @access  Public
 */
router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    res.json({ message: 'Logged out' });
});

module.exports = router;

