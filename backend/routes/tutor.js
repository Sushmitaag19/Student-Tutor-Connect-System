const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Debug route to test router loading
router.get('/test', (req, res) => {
    res.json({ message: 'Tutor router is working', path: req.path });
});

/**
 * @route   GET /api/tutor/verified
 * @desc    Get all verified tutors
 * @access  Public
 */
router.get('/verified', async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT 
                t.tutor_id, 
                t.user_id, 
                t.name,
                u.full_name, 
                u.email, 
                t.education_level, 
                t.profile_picture,
                t.subject,
                t.experience_years, 
                t.hourly_rate, 
                t.teaching_mode, 
                t.location,
                t.verification_status, 
                t.is_available, 
                u.created_at
            FROM tutors t
            JOIN users u ON t.user_id = u.user_id
            WHERE t.verification_status = 'approved'
            ORDER BY t.tutor_id DESC`
        );

        res.json({
            tutors: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching verified tutors:', error);
        res.status(500).json({
            error: 'Failed to fetch verified tutors',
            message: 'An error occurred while fetching verified tutors'
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
            `SELECT t.tutor_id, t.user_id, t.name, t.education_level, t.profile_picture, t.subject, 
                    t.experience_years, t.hourly_rate, t.teaching_mode, t.location, 
                    t.verification_status, t.is_available, u.email
             FROM tutors t 
             JOIN users u ON t.user_id = u.user_id 
             WHERE t.user_id = $1`,
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
                t.name,
                u.full_name, 
                u.email, 
                t.education_level, 
                t.profile_picture,
                t.subject,
                t.experience_years, 
                t.hourly_rate, 
                t.teaching_mode, 
                t.location,
                t.verification_status, 
                t.is_available, 
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
            `SELECT t.tutor_id, t.user_id, t.name, t.education_level, t.profile_picture, t.subject,
                    t.experience_years, t.hourly_rate, t.teaching_mode, t.location,
                    t.verification_status, t.is_available, u.email
             FROM tutors t 
             JOIN users u ON t.user_id = u.user_id 
             WHERE t.user_id = $1`,
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
