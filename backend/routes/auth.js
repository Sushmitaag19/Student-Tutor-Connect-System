const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * 
 * Security Features:
 * - Password hashing with bcrypt
 * - Parameterized queries to prevent SQL injection
 * - Input validation
 */
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

        // Validate email format (basic validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password too short',
                message: 'Password must be at least 6 characters long'
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

        // Insert new user with parameterized query (SQL injection prevention)
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

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return user data
 * @access  Public
 * 
 * Security Features:
 * - Parameterized queries to prevent SQL injection
 * - Secure password comparison using bcrypt
 * - Does not expose whether email exists or not in generic errors
 */
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

        // Remove password from response
        delete user.password;

        res.json({
            message: 'Login successful',
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

module.exports = router;

