const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Query required' });

  const client = await pool.connect();
  try {
    const like = `%${q}%`;
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
         t.profile_picture
       FROM tutors t
       JOIN users u ON u.user_id = t.user_id
       WHERE u.full_name ILIKE $1
          OR COALESCE(t.bio,'') ILIKE $1
          OR COALESCE(t.experience,'') ILIKE $1
          OR COALESCE(t.preferred_mode,'') ILIKE $1
       ORDER BY u.full_name ASC
       LIMIT 50`,
      [like]
    );
    res.json({ results: result.rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  } finally {
    client.release();
  }
});

module.exports = router;










