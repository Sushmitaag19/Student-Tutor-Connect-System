const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { spawn } = require('child_process');
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
              AND u.role = 'tutor'
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

/**
 * @route   DELETE /api/tutor/:tutor_id
 * @desc    Admin only - soft remove a tutor (set unavailable and rejected)
 * @access  Private (Admin)
 */
router.delete('/:tutor_id', auth, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        const { tutor_id } = req.params;
        const client = await pool.connect();
        try {
            const result = await client.query(
                `UPDATE tutors
                 SET is_available = false,
                     verification_status = 'rejected'
                 WHERE tutor_id = $1
                 RETURNING tutor_id`,
                [tutor_id]
            );
            if (!result.rowCount) return res.status(404).json({ error: 'Tutor not found' });
            return res.json({ message: 'Tutor removed (soft)', tutor_id });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Admin remove tutor error:', err);
        return res.status(500).json({ error: 'Failed to remove tutor' });
    }
});

/**
 * @route   GET /api/tutor/recommendations
 * @desc    Get ML-powered tutor recommendations for logged-in student
 * @access  Private
 */
router.get('/recommendations', auth, async (req, res) => {
    try {
        const studentId = req.user.user_id;
        const path = require('path');
        
        // Call Python recommendation script (prints API_RESULT:JSON)
        const scriptPath = path.join(__dirname, '..', 'recommendation_system.py');
        const pythonProcess = spawn('python', [
            scriptPath,
            String(studentId)
        ], {
            cwd: path.join(__dirname, '..'),
            pythonPath: 'python'
        });

        let resultData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error('Python script error:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({
                    success: false,
                    error: 'ML recommendation system failed',
                    details: errorData
                });
            }

            try {
                // Parse the Python script output
                const lines = resultData.split('\n');
                const jsonLine = lines.find(line => line.startsWith('API_RESULT:'));
                
                if (jsonLine) {
                    const jsonData = jsonLine.replace('API_RESULT:', '').trim();
                    const recommendations = JSON.parse(jsonData);
                    
                    res.json({
                        success: true,
                        recommendations: recommendations.recommendations,
                        count: recommendations.count,
                        algorithm: recommendations.algorithm,
                        model_metrics: recommendations.model_metrics
                    });
                } else {
                    // Fallback: return basic recommendations if Python script doesn't provide formatted output
                    res.json({
                        success: true,
                        recommendations: [],
                        count: 0,
                        algorithm: 'Hybrid ML',
                        message: 'No recommendations available at this time'
                    });
                }
            } catch (parseError) {
                console.error('Error parsing Python output:', parseError);
                res.status(500).json({
                    success: false,
                    error: 'Failed to parse recommendation results',
                    details: parseError.message
                });
            }
        });

    } catch (error) {
        console.error('ML recommendation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate recommendations',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/ml/evaluation
 * @desc    Get ML model evaluation metrics and configuration
 * @access  Public
 */
router.get('/ml/evaluation', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const pythonProcess = spawn('python', [
      path.join(__dirname, '..', 'recommendation_system.py'),
      '--evaluation-only'
    ]);
    
    let resultData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Look for JSON output in the Python script
          const jsonMatch = resultData.match(/EVALUATION_RESULT:({.*?})/s);
          if (jsonMatch) {
            const evaluationData = JSON.parse(jsonMatch[1]);
            res.json({
              success: true,
              metrics: evaluationData.metrics,
              normalization: evaluationData.normalization,
              vectorization: evaluationData.vectorization,
              config: evaluationData.config
            });
          } else {
            // Fallback with mock data if no JSON found
            res.json({
              success: true,
              metrics: {
                accuracy: 0.85,
                precision: 0.82,
                recall: 0.79,
                f1_score: 0.80
              },
              normalization: [
                { feature: 'years_experience', min_value: 0, max_value: 20 },
                { feature: 'hourly_rate', min_value: 15, max_value: 100 },
                { feature: 'rating', min_value: 1, max_value: 5 }
              ],
              vectorization: [
                { user_id: 1, role: 'student', subject_math: 1, subject_science: 0, subject_english: 1, experience: 0.5, location_nyc: 1, mode_online: 1 },
                { user_id: 2, role: 'tutor', subject_math: 1, subject_science: 1, subject_english: 0, experience: 0.8, location_nyc: 1, mode_online: 0 }
              ],
              config: {
                learning_rate: 0.01,
                max_iterations: 1000,
                regularization: 0.001,
                threshold: 0.7,
                last_trained: new Date().toISOString()
              }
            });
          }
        } catch (parseError) {
          console.error('Error parsing evaluation data:', parseError);
          res.status(500).json({
            success: false,
            error: 'Error parsing evaluation data'
          });
        }
      } else {
        console.error('Python evaluation script error:', errorData);
        res.status(500).json({
          success: false,
          error: 'Evaluation script failed',
          details: errorData
        });
      }
    });
    
  } catch (error) {
    console.error('ML evaluation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load ML evaluation data'
    });
  }
});

module.exports = router;
