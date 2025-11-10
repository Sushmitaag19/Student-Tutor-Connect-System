const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const FB_FILE = path.join(DATA_DIR, 'feedback.json');

function ensureStore(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true }); if(!fs.existsSync(FB_FILE)) fs.writeFileSync(FB_FILE, JSON.stringify({ seq:1, items:[] }, null, 2)); }
function load(){ ensureStore(); return JSON.parse(fs.readFileSync(FB_FILE, 'utf-8')); }
function save(data){ fs.writeFileSync(FB_FILE, JSON.stringify(data, null, 2)); }

function analyzeSentimentPython(text){
  return Promise.resolve(null);
}

router.post('/', auth, async (req, res) => {
  try{
    const { to_user_id, to_role, text } = req.body;
    if(!to_user_id || !to_role || !text) return res.status(400).json({ error:'to_user_id, to_role, text required' });

    const score = await analyzeSentimentPython(String(text));

    const store = load();
    const id = store.seq++;
    const item = { id, from_user_id: req.user.user_id, to_user_id, to_role, text: String(text), sentiment_score: score, created_at: new Date().toISOString() };
    store.items.push(item); save(store);
    res.status(201).json({ message:'Feedback saved', feedback:item });
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to save feedback' }); }
});

router.get('/tutor/:tutor_id', async (req, res) => {
  try{
    const client = await pool.connect();
    try{
      const u = await client.query('SELECT user_id FROM tutors WHERE tutor_id = $1', [req.params.tutor_id]);
      const to_user_id = u.rows[0] ? u.rows[0].user_id : -1;
      const store = load();
      const items = store.items.filter(x => x.to_user_id === to_user_id && x.to_role === 'tutor');
      res.json({ feedback: items });
    } finally { client.release(); }
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to load feedback' }); }
});

router.get('/student/:student_user_id', async (req, res) => {
  try{
    const store = load();
    const items = store.items.filter(x => x.to_user_id === Number(req.params.student_user_id) && x.to_role === 'student');
    res.json({ feedback: items });
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to load feedback' }); }
});

router.get('/all', async (req, res) => {
  try{
    const store = load();
    // enrich names
    const client = await pool.connect();
    try{
      const out = [];
      for(const f of store.items){
        const c = { ...f };
        const from = await client.query('SELECT full_name FROM users WHERE user_id = $1', [f.from_user_id]);
        const to = await client.query('SELECT full_name FROM users WHERE user_id = $1', [f.to_user_id]);
        c.from_name = from.rows[0] && from.rows[0].full_name;
        c.to_name = to.rows[0] && to.rows[0].full_name;
        out.push(c);
      }
      res.json({ feedback: out });
    } finally { client.release(); }
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to load feedback' }); }
});

/**
 * @route   POST /api/feedback
 * @desc    Student submits feedback for a tutor with rating score
 * @access  Private (Student)
 */
router.post('/feedback', auth, async (req, res) => {
  try {
    if(req.user.role !== 'student') return res.status(403).json({ error:'Only students can submit feedback' });
    
    const { tutor_id, feedback_score, review } = req.body;
    if(!tutor_id || !feedback_score) return res.status(400).json({ error:'tutor_id and feedback_score required' });
    
    const score = parseInt(feedback_score);
    if(score < 1 || score > 5) return res.status(400).json({ error:'feedback_score must be between 1 and 5' });
    
    const client = await pool.connect();
    try {
      // Verify tutor exists
      const tutorRes = await client.query('SELECT user_id FROM tutors WHERE tutor_id = $1', [tutor_id]);
      if(!tutorRes.rows.length) return res.status(404).json({ error:'Tutor not found' });
      
      const tutorUserId = tutorRes.rows[0].user_id;
      const studentUserId = req.user.user_id;
      
      // Check if student has already submitted feedback for this tutor
      const existing = await client.query(
        'SELECT * FROM feedback WHERE student_user_id = $1 AND tutor_user_id = $2',
        [studentUserId, tutorUserId]
      );
      
      if(existing.rows.length) {
        // Update existing feedback
        await client.query(
          'UPDATE feedback SET feedback_score = $1, review = $2, updated_at = NOW() WHERE student_user_id = $3 AND tutor_user_id = $4',
          [score, review || null, studentUserId, tutorUserId]
        );
      } else {
        // Insert new feedback
        await client.query(
          'INSERT INTO feedback (student_user_id, tutor_user_id, feedback_score, review, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [studentUserId, tutorUserId, score, review || null]
        );
      }
      
      return res.json({ 
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch(dbErr) {
      console.error('DB feedback failed, falling back to file store:', dbErr);
      try {
        const store = load();
        const id = store.seq++;
        // Map tutor_id -> user_id
        const mapClient = await pool.connect();
        try{
          const tRes = await mapClient.query('SELECT user_id FROM tutors WHERE tutor_id = $1', [tutor_id]);
          const tutorUserId = tRes.rows[0] ? tRes.rows[0].user_id : null;
          if(!tutorUserId) return res.status(404).json({ success:false, error:'Tutor not found' });
          const item = { id, from_user_id: req.user.user_id, to_user_id: tutorUserId, to_role: 'tutor', text: '', sentiment_score: null, created_at: new Date().toISOString() };
          store.items.push(item); save(store);
          return res.json({ success:true, message:'Rating recorded (file store)' });
        } finally { mapClient.release(); }
      } catch(fileErr){
        console.error('File-store fallback failed:', fileErr);
        return res.status(500).json({ success:false, error:'Failed to submit feedback' });
      }
    } finally {
      client.release();
    }
  } catch(e) {
    console.error('Feedback submission error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit feedback' 
    });
  }
});

/**
 * @route   GET /api/feedback/tutor/:tutor_id/stats
 * @desc    Get feedback statistics for a specific tutor
 * @access  Public
 */
router.get('/feedback/tutor/:tutor_id/stats', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const tutorRes = await client.query('SELECT user_id FROM tutors WHERE tutor_id = $1', [req.params.tutor_id]);
      if(!tutorRes.rows.length) return res.status(404).json({ error:'Tutor not found' });
      
      const tutorUserId = tutorRes.rows[0].user_id;
      
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(feedback_score) as average_rating,
          COUNT(CASE WHEN feedback_score = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN feedback_score = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN feedback_score = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN feedback_score = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN feedback_score = 1 THEN 1 END) as one_star
        FROM feedback 
        WHERE tutor_user_id = $1
      `, [tutorUserId]);
      
      const reviews = await client.query(`
        SELECT f.feedback_score, f.review, f.created_at, u.full_name as student_name
        FROM feedback f
        JOIN users u ON f.student_user_id = u.user_id
        WHERE f.tutor_user_id = $1
        ORDER BY f.created_at DESC
        LIMIT 10
      `, [tutorUserId]);
      
      res.json({
        success: true,
        stats: stats.rows[0],
        recent_reviews: reviews.rows
      });
    } finally {
      client.release();
    }
  } catch(e) {
    console.error('Feedback stats error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load feedback stats' 
    });
  }
});

module.exports = router;
