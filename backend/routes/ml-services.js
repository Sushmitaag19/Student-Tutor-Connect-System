// Node.js Backend Integration with Flask ML API
// Save as: ml-service.js

const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

class MLService {
  constructor(baseURL = ML_API_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if ML service is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('ML Service health check failed:', error.message);
      throw new Error('ML Service unavailable');
    }
  }

  /**
   * Get tutor recommendations for a student
   * @param {string} studentId - The student's ID
   * @param {number} topN - Number of recommendations to return
   */
  async getRecommendations(studentId, topN = 5) {
    try {
      const response = await this.client.post('/recommend', {
        student_id: studentId,
        top_n: topN
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Failed to get recommendations');
      }
      throw error;
    }
  }

  /**
   * Get all students from ML model
   */
  async getAllStudents() {
    try {
      const response = await this.client.get('/students');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch students:', error.message);
      throw error;
    }
  }

  /**
   * Get all tutors from ML model
   */
  async getAllTutors() {
    try {
      const response = await this.client.get('/tutors');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tutors:', error.message);
      throw error;
    }
  }

  /**
   * Get student details
   */
  async getStudentDetails(studentId) {
    try {
      const response = await this.client.get(`/student/${studentId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Student not found');
      }
      throw error;
    }
  }

  /**
   * Get tutor details
   */
  async getTutorDetails(tutorId) {
    try {
      const response = await this.client.get(`/tutor/${tutorId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Tutor not found');
      }
      throw error;
    }
  }

  /**
   * Get metadata (subjects, levels, cities, etc.)
   */
  async getMetadata() {
    try {
      const response = await this.client.get('/metadata');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metadata:', error.message);
      throw error;
    }
  }

  /**
   * Retrain the ML model
   */
  async retrainModel() {
    try {
      const response = await this.client.post('/train');
      return response.data;
    } catch (error) {
      console.error('Failed to retrain model:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const mlService = new MLService();

module.exports = mlService;

// Example Express.js routes using the ML service
// Save as: routes/recommendations.js

const express = require('express');
const router = express.Router();
const mlService = require('../ml-service');

/**
 * GET /api/recommendations/:studentId
 * Get tutor recommendations for a student
 */
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 5 } = req.query;

    // Get recommendations from ML service
    const result = await mlService.getRecommendations(studentId, parseInt(limit));

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    res.json({
      success: true,
      student: result.student_profile,
      recommendations: result.recommendations.map(rec => ({
        tutorId: rec.tutor_id,
        score: rec.score,
        profile: rec.profile,
        matches: rec.matches,
        matchCount: rec.match_count
      }))
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/students
 * Get all students
 */
router.get('/students/all', async (req, res) => {
  try {
    const result = await mlService.getAllStudents();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch students',
      message: error.message
    });
  }
});

/**
 * GET /api/student/:studentId
 * Get student details
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await mlService.getStudentDetails(studentId);
    res.json(result);
  } catch (error) {
    res.status(404).json({
      error: 'Student not found',
      message: error.message
    });
  }
});

/**
 * GET /api/tutors
 * Get all tutors
 */
router.get('/tutors/all', async (req, res) => {
  try {
    const result = await mlService.getAllTutors();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch tutors',
      message: error.message
    });
  }
});

/**
 * GET /api/tutor/:tutorId
 * Get tutor details
 */
router.get('/tutor/:tutorId', async (req, res) => {
  try {
    const { tutorId } = req.params;
    const result = await mlService.getTutorDetails(tutorId);
    res.json(result);
  } catch (error) {
    res.status(404).json({
      error: 'Tutor not found',
      message: error.message
    });
  }
});

/**
 * GET /api/metadata
 * Get available options (subjects, levels, cities, etc.)
 */
router.get('/metadata', async (req, res) => {
  try {
    const result = await mlService.getMetadata();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch metadata',
      message: error.message
    });
  }
});

/**
 * POST /api/train
 * Retrain the ML model
 */
router.post('/train', async (req, res) => {
  try {
    const result = await mlService.retrainModel();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrain model',
      message: error.message
    });
  }
});

/**
 * GET /api/health
 * Check ML service health
 */
router.get('/health', async (req, res) => {
  try {
    const result = await mlService.healthCheck();
    res.json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;

// Example usage in main Express app
// Save as: app.js (example)

/*
const express = require('express');
const cors = require('cors');
const recommendationRoutes = require('./routes/recommendations');

const app = express();

app.use(cors());
app.use(express.json());

// Mount recommendation routes
app.use('/api/recommendations', recommendationRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Node.js server running on port ${PORT}`);
  console.log(`ML Service URL: ${process.env.ML_API_URL || 'http://localhost:5000'}`);
});

module.exports = app;
*/