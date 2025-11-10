// routes/recommend.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // or built-in fetch in Node 18+

router.get('/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  const topN = req.query.top_n || 5;
  try {
    const resp = await fetch(`http://ML_SERVER_HOST:8001/recommend/${studentId}?top_n=${topN}`);
    const data = await resp.json();
    // optionally enrich with tutor profile from Postgres
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"ML service error"});
  }
});

module.exports = router;
