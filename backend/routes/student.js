const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/student/profile
 * @desc    Create student profile after user registration
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
            academic_level,
            preferred_subjects,
            preferred_mode,
            budget,
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

        // Check if user exists and is a student
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

        // Verify user is a student
        if (userCheck.rows[0].role !== 'student') {
            return res.status(403).json({
                error: 'Invalid role',
                message: 'User must have role "student" to create a student profile'
            });
        }

        // Check if student profile already exists
        const existingProfile = await client.query(
            'SELECT student_id FROM students WHERE user_id = $1',
            [user_id]
        );

        if (existingProfile.rows.length > 0) {
            return res.status(409).json({
                error: 'Profile already exists',
                message: 'Student profile for this user already exists'
            });
        }

        // Begin transaction
        await client.query('BEGIN');

        // Process subjects: convert to array if it's a string or comma-separated string
        let subjectsArray = null;
        if (preferred_subjects) {
            if (Array.isArray(preferred_subjects)) {
                subjectsArray = preferred_subjects;
            } else if (typeof preferred_subjects === 'string') {
                // Split comma-separated string into array
                subjectsArray = preferred_subjects.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
        }

        // Insert student profile with parameterized query
        const studentResult = await client.query(
            `INSERT INTO students (user_id, academic_level, subjects, preferred_mode, budget, availability)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING student_id, user_id, academic_level, subjects, preferred_mode, budget, availability`,
            [user_id, academic_level || null, subjectsArray || null, preferred_mode || null, budget || null, availability || null]
        );

        const newStudent = studentResult.rows[0];

        // Commit transaction
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Student profile created successfully',
            student: newStudent
        });

    } catch (error) {
        // Rollback transaction on error
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }

        // Handle specific database errors
        if (error.code === '23503') {
            return res.status(404).json({
                error: 'Foreign key constraint failed',
                message: 'The specified user_id does not exist'
            });
        }

        // Handle column not found error (42883 = undefined_column)
        if (error.code === '42883' || (error.message.includes('column') && error.message.includes('does not exist'))) {
            console.error('Database schema error - column may not exist:', error);
            return res.status(500).json({
                error: 'Database schema error',
                message: 'The subjects column may not exist in the database. Please run the migration script: backend/migration_add_subjects_column.sql'
            });
        }

        console.error('Student profile creation error:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            detail: error.detail,
            hint: error.hint
        });
        
        res.status(500).json({
            error: 'Profile creation failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while creating the student profile',
            details: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                detail: error.detail,
                hint: error.hint
            } : undefined
        });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/student/profile/:user_id
 * @desc    Get student profile by user_id
 * @access  Public
 */
router.get('/profile/:user_id', async (req, res) => {
    const client = await pool.connect();

    try {
        const { user_id } = req.params;

        const result = await client.query(
            'SELECT student_id, user_id, academic_level, subjects, preferred_mode, budget, availability FROM students WHERE user_id = $1',
            [user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Profile not found',
                message: 'No student profile found for this user'
            });
        }

        res.json({
            student: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: 'An error occurred while fetching the student profile'
        });
    } finally {
        client.release();
    }
});

// Get current student profile (JWT)
router.get('/me', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT student_id, user_id, academic_level, subjects, preferred_mode, budget, availability FROM students WHERE user_id = $1',
            [req.user.user_id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Student profile not found' });
        res.json({ student: result.rows[0] });
    } catch (err) {
        console.error('Student /me error:', err);
        res.status(500).json({ error: 'Failed to fetch student profile' });
    } finally {
        client.release();
    }
});

// Update current student profile
router.put('/me', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        const allowed = ['academic_level','subjects','preferred_mode','budget','availability'];
        const fields = [];
        const values = [];
        let idx = 1;
        // normalize subjects to array if provided
        if (Object.prototype.hasOwnProperty.call(req.body, 'subjects')) {
            const subj = req.body.subjects;
            if (typeof subj === 'string') {
                req.body.subjects = subj.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                fields.push(`${key} = $${idx++}`);
                values.push(req.body[key]);
            }
        }
        if (!fields.length) {
            return res.status(400).json({ error: 'No valid fields provided to update' });
        }
        values.push(req.user.user_id);
        await client.query('BEGIN');
        const update = await client.query(
            `UPDATE students SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING student_id`,
            values
        );
        if (!update.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Student profile not found' });
        }
        const result = await client.query(
            'SELECT student_id, user_id, academic_level, subjects, preferred_mode, budget, availability FROM students WHERE user_id = $1',
            [req.user.user_id]
        );
        await client.query('COMMIT');
        return res.json({ message: 'Student profile updated', student: result.rows[0] });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch(_){}
        console.error('Update student profile error:', err);
        return res.status(500).json({ error: 'Failed to update student profile' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/student/all
 * @desc    Get all students
 * @access  Public
 */
/**
 * @route   DELETE /api/student/:student_id
 * @desc    Admin only - remove a student profile (hard delete profile only)
 * @access  Private (Admin)
 */
router.delete('/:student_id', async (req, res) => {
    const client = await pool.connect();
    try {
        // Admin check via simple header in future; for now reuse auth if wired
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        const { student_id } = req.params;
        const del = await client.query('DELETE FROM students WHERE student_id = $1', [student_id]);
        if (!del.rowCount) return res.status(404).json({ error: 'Student not found' });
        return res.json({ message: 'Student removed', student_id });
    } catch (err) {
        console.error('Admin remove student error:', err);
        res.status(500).json({ error: 'Failed to remove student' });
    } finally {
        client.release();
    }
});

router.get('/all', async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT 
                s.student_id,
                s.user_id,
                u.full_name,
                u.email,
                s.academic_level,
                s.subjects,
                s.preferred_mode,
                s.budget,
                s.availability,
                u.created_at
            FROM students s
            JOIN users u ON s.user_id = u.user_id
            ORDER BY s.student_id DESC`
        );

        res.json({
            students: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            error: 'Failed to fetch students',
            message: 'An error occurred while fetching students'
        });
    } finally {
        client.release();
    }
});

module.exports = router;

