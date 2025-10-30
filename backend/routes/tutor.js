const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/tutor/profile
 * @desc    Create tutor profile after user registration
 * @access  Private (add authentication middleware later)
 * 
 * Security Features:
 * - Parameterized queries to prevent SQL injection
 * - CASCADE relationship with users table
 * - Input validation
 */
router.post('/profile', async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            user_id,
            bio,
            experience,
            hourly_rate,
            preferred_mode,
            profile_picture,
            availability
        } = req.body;

        // Input validation
        if (!user_id) {
            return res.status(400).json({
                error: 'Missing user_id',
                message: 'user_id is required'
            });
        }

        // Validate preferred_mode
        if (preferred_mode && !['online', 'offline', 'hybrid'].includes(preferred_mode)) {
            return res.status(400).json({
                error: 'Invalid preferred_mode',
                message: 'preferred_mode must be: online, offline, or hybrid'
            });
        }

        // Check if user exists and is a tutor
        const userCheck = await client.query(
            'SELECT user_id, role FROM users WHERE user_id = $1',
            [user_id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user_id does not exist'
            });
        }

        // Verify user is a tutor
        if (userCheck.rows[0].role !== 'tutor') {
            return res.status(403).json({
                error: 'Invalid role',
                message: 'User must have role "tutor" to create a tutor profile'
            });
        }

        // Check if tutor profile already exists
        const existingProfile = await client.query(
            'SELECT tutor_id FROM tutors WHERE user_id = $1',
            [user_id]
        );

        if (existingProfile.rows.length > 0) {
            return res.status(409).json({
                error: 'Profile already exists',
                message: 'Tutor profile for this user already exists'
            });
        }

        // Begin transaction
        await client.query('BEGIN');

        // Insert tutor profile with parameterized query
        const tutorResult = await client.query(
            `INSERT INTO tutors (user_id, bio, experience, hourly_rate, preferred_mode, verified, availability, profile_picture)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING tutor_id, user_id, bio, experience, hourly_rate, preferred_mode, verified, availability, profile_picture`,
            [user_id, bio || null, experience || null, hourly_rate || null, preferred_mode || null, false, availability || null, profile_picture || null]
        );

        const newTutor = tutorResult.rows[0];

        // Commit transaction
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Tutor profile created successfully',
            tutor: newTutor
        });

    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');

        // Handle specific database errors
        if (error.code === '23503') {
            return res.status(404).json({
                error: 'Foreign key constraint failed',
                message: 'The specified user_id does not exist'
            });
        }

        console.error('Tutor profile creation error:', error);
        res.status(500).json({
            error: 'Profile creation failed',
            message: 'An error occurred while creating the tutor profile'
        });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/tutor/profile/:user_id
 * @desc    Get tutor profile by user_id
 * @access  Public
 */
router.get('/profile/:user_id', async (req, res) => {
    const client = await pool.connect();

    try {
        const { user_id } = req.params;

        const result = await client.query(
            'SELECT tutor_id, user_id, bio, experience, hourly_rate, preferred_mode, verified, availability, profile_picture FROM tutors WHERE user_id = $1',
            [user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Profile not found',
                message: 'No tutor profile found for this user'
            });
        }

        res.json({
            tutor: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching tutor profile:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: 'An error occurred while fetching the tutor profile'
        });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/tutor/all
 * @desc    Get all tutors
 * @access  Public
 */
router.get('/all', async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT 
                t.tutor_id, 
                t.user_id, 
                u.full_name, 
                u.email, 
                t.bio, 
                t.experience, 
                t.hourly_rate, 
                t.preferred_mode, 
                t.verified, 
                t.availability, 
                t.profile_picture,
                u.created_at
            FROM tutors t
            JOIN users u ON t.user_id = u.user_id
            ORDER BY t.tutor_id DESC`
        );

        res.json({
            tutors: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching tutors:', error);
        res.status(500).json({
            error: 'Failed to fetch tutors',
            message: 'An error occurred while fetching tutors'
        });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/tutor/me
 * @desc    Get current tutor profile (JWT)
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT t.tutor_id, t.user_id, t.first_name, t.last_name, t.subject_chosen,
                    t.verified AS is_verified, t.bio, t.experience, t.hourly_rate,
                    t.preferred_mode, t.availability, t.profile_picture
             FROM tutors t WHERE t.user_id = $1`,
            [req.user.user_id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Tutor profile not found' });
        res.json({ tutor: result.rows[0] });
    } catch (err) {
        console.error('Tutor /me error:', err);
        res.status(500).json({ error: 'Failed to fetch tutor profile' });
    } finally {
        client.release();
    }
});

module.exports = router;

