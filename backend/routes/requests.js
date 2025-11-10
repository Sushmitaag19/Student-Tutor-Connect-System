const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const REQ_FILE = path.join(DATA_DIR, 'requests.json');

function ensureStore(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true }); if(!fs.existsSync(REQ_FILE)) fs.writeFileSync(REQ_FILE, JSON.stringify({ seq:1, items:[] }, null, 2)); }
function load(){ ensureStore(); return JSON.parse(fs.readFileSync(REQ_FILE, 'utf-8')); }
function save(data){ fs.writeFileSync(REQ_FILE, JSON.stringify(data, null, 2)); }

// Send a request from current student to a tutor
router.post('/send', auth, async (req, res) => {
  try{
    if(req.user.role !== 'student') return res.status(403).json({ error:'Only students can send requests' });
    const tutor_id = req.body.tutor_id;
    if(!tutor_id) return res.status(400).json({ error:'tutor_id required' });

    const store = load();
    // Prevent duplicate pending request
    const dup = store.items.find(x => x.tutor_id === tutor_id && x.student_user_id === req.user.user_id && x.status === 'pending');
    if(dup) return res.json({ message:'Already pending', request: dup });

    const id = store.seq++;
    const item = { id, tutor_id, student_user_id: req.user.user_id, status:'pending', created_at: new Date().toISOString() };
    store.items.push(item); save(store);
    res.status(201).json({ message:'Request sent', request:item });
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to send request' }); }
});

// Tutor inbox
router.get('/inbox', auth, async (req, res) => {
  try{
    if(req.user.role !== 'tutor') return res.status(403).json({ error:'Only tutors can view inbox' });
    const store = load();
    const mine = store.items.filter(x => x.tutor_id && x.status && x);

    // Find tutor_id by user_id
    const client = await pool.connect();
    try{
      const tRes = await client.query('SELECT tutor_id FROM tutors WHERE user_id = $1', [req.user.user_id]);
      const tid = tRes.rows[0] ? tRes.rows[0].tutor_id : null;
      const rows = store.items.filter(x => x.tutor_id === (tid||-1)).map(x => ({ ...x }));
      // Attach student display names
      for(const r of rows){
        const u = await client.query('SELECT full_name FROM users WHERE user_id = $1', [r.student_user_id]);
        r.student_name = (u.rows[0] && u.rows[0].full_name) || r.student_user_id;
        r.student_id = r.student_user_id;
      }
      return res.json({ requests: rows });
    } finally { client.release(); }
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to load inbox' }); }
});

// Student: my requests
router.get('/my', auth, async (req, res) => {
  try{
    if(req.user.role !== 'student') return res.status(403).json({ error:'Only students can view their requests' });
    const store = load();
    const rows = store.items.filter(x => x.student_user_id === req.user.user_id).map(x => ({ ...x }));
    // add tutor email when accepted
    const client = await pool.connect();
    try{
      for(const r of rows){
        if(r.status === 'accepted'){
          const t = await client.query('SELECT t.tutor_id, t.user_id, u.email FROM tutors t JOIN users u ON t.user_id = u.user_id WHERE t.tutor_id = $1', [r.tutor_id]);
          if(t.rows[0]) r.tutor_email = t.rows[0].email;
        }
      }
    } finally { client.release(); }
    res.json({ requests: rows });
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to load requests' }); }
});

// Tutor respond accept/reject
router.post('/respond', auth, async (req, res) => {
  try{
    if(req.user.role !== 'tutor') return res.status(403).json({ error:'Only tutors can respond' });
    const { request_id, decision } = req.body;
    if(!request_id || !['accept','reject'].includes((decision||'').toLowerCase())){
      return res.status(400).json({ error:'request_id and decision (accept/reject) required' });
    }

    // Resolve current tutor_id from user
    const client = await pool.connect();
    try{
      const tRes = await client.query('SELECT tutor_id FROM tutors WHERE user_id = $1', [req.user.user_id]);
      const tid = tRes.rows[0] ? tRes.rows[0].tutor_id : null;
      if(!tid) return res.status(400).json({ error:'Tutor profile not found' });
      const store = load();
      const item = store.items.find(x => x.id === Number(request_id));
      if(!item) return res.status(404).json({ error:'Request not found' });
      if(item.tutor_id !== tid) return res.status(403).json({ error:'Not authorized on this request' });
      item.status = decision.toLowerCase() === 'accept' ? 'accepted' : 'rejected';
      item.updated_at = new Date().toISOString();
      save(store);
      return res.json({ message:'Updated', request:item });
    } finally { client.release(); }
  }catch(e){ console.error(e); res.status(500).json({ error:'Failed to respond' }); }
});

// Endpoint for students to request a tutor
router.post('/request_tutor', auth, async (req, res) => {
  try {
    if(req.user.role !== 'student') return res.status(403).json({ error:'Only students can send requests' });
    const { tutor_id, message } = req.body;
    if(!tutor_id) return res.status(400).json({ error:'tutor_id required' });

    const store = load();
    // Prevent duplicate pending request
    const dup = store.items.find(x => x.tutor_id === tutor_id && x.student_user_id === req.user.user_id && x.status === 'pending');
    if(dup) return res.json({ message:'Already pending', request: dup });

    const id = store.seq++;
    const item = { 
      id, 
      tutor_id, 
      student_user_id: req.user.user_id, 
      status:'pending', 
      message: message || '',
      created_at: new Date().toISOString() 
    };
    store.items.push(item); 
    save(store);
    
    // Send notification to tutor (placeholder - implement real-time notifications)
    console.log(`Notification: Student ${req.user.user_id} requested tutor ${tutor_id}`);
    
    res.status(201).json({ 
      success: true,
      message:'Request sent successfully', 
      request: item 
    });
  } catch(e) { 
    console.error(e); 
    res.status(500).json({ 
      success: false,
      error:'Failed to send request' 
    }); 
  }
});

/**
 * @route   POST /api/accept_request
 * @desc    Tutor accepts a student request
 * @access  Private (Tutor)
 */
router.post('/accept_request', auth, async (req, res) => {
  try {
    if(req.user.role !== 'tutor') return res.status(403).json({ error:'Only tutors can accept requests' });
    const { request_id } = req.body;
    if(!request_id) return res.status(400).json({ error:'request_id required' });

    // Resolve current tutor_id from user
    const client = await pool.connect();
    try {
      const tRes = await client.query('SELECT tutor_id FROM tutors WHERE user_id = $1', [req.user.user_id]);
      const tid = tRes.rows[0] ? tRes.rows[0].tutor_id : null;
      if(!tid) return res.status(400).json({ error:'Tutor profile not found' });
      
      const store = load();
      const item = store.items.find(x => x.id === Number(request_id));
      if(!item) return res.status(404).json({ error:'Request not found' });
      if(item.tutor_id !== tid) return res.status(403).json({ error:'Not authorized on this request' });
      
      // Get tutor contact info
      const tutorInfo = await client.query('SELECT u.email FROM tutors t JOIN users u ON t.user_id = u.user_id WHERE t.tutor_id = $1', [tid]);
      const tutorEmail = tutorInfo.rows[0] ? tutorInfo.rows[0].email : 'Contact info not available';
      
      item.status = 'accepted';
      item.updated_at = new Date().toISOString();
      save(store);
      
      // Send notification to student (placeholder - implement real-time notifications)
      console.log(`Notification: Tutor ${tid} accepted request ${request_id}. Contact: ${tutorEmail}`);
      
      return res.json({ 
        success: true,
        message: 'Request accepted successfully',
        request: item,
        contact_info: tutorEmail
      });
    } finally { 
      client.release(); 
    }
  } catch(e) { 
    console.error(e); 
    res.status(500).json({ 
      success: false,
      error: 'Failed to accept request' 
    }); 
  }
});

/**
 * @route   POST /api/reject_request
 * @desc    Tutor rejects a student request
 * @access  Private (Tutor)
 */
router.post('/reject_request', auth, async (req, res) => {
  try {
    if(req.user.role !== 'tutor') return res.status(403).json({ error:'Only tutors can reject requests' });
    const { request_id } = req.body;
    if(!request_id) return res.status(400).json({ error:'request_id required' });

    // Resolve current tutor_id from user
    const client = await pool.connect();
    try {
      const tRes = await client.query('SELECT tutor_id FROM tutors WHERE user_id = $1', [req.user.user_id]);
      const tid = tRes.rows[0] ? tRes.rows[0].tutor_id : null;
      if(!tid) return res.status(400).json({ error:'Tutor profile not found' });
      
      const store = load();
      const item = store.items.find(x => x.id === Number(request_id));
      if(!item) return res.status(404).json({ error:'Request not found' });
      if(item.tutor_id !== tid) return res.status(403).json({ error:'Not authorized on this request' });
      
      item.status = 'rejected';
      item.updated_at = new Date().toISOString();
      save(store);
      
      // Send notification to student (placeholder - implement real-time notifications)
      console.log(`Notification: Tutor ${tid} rejected request ${request_id}`);
      
      return res.json({ 
        success: true,
        message: 'Request rejected successfully',
        request: item
      });
    } finally { 
      client.release(); 
    }
  } catch(e) { 
    console.error(e); 
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject request' 
    }); 
  }
});

module.exports = router;
