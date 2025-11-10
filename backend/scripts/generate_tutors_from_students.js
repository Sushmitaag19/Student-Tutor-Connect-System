#!/usr/bin/env node
/*
  Generate dummy tutors based on existing student profiles with >60% compatibility.
  Compatibility criteria (3 checks, all satisfied => 100%):
   - subject match (tutor.subject ∈ student.subjects)
   - teaching_mode match (case-insensitive)
   - hourly_rate <= student.budget

  Also normalizes tutor.subjects to the allowed list used in the forms.
*/
const path = require('path');
const pool = require('../db');

const ALLOWED_SUBJECTS = [
  'Math',
  'Physics',
  'English',
  'Computer Science',
  'Chemistry',
  'Biology',
  'Nepali',
];

const TUTOR_LEVELS = ['Bachelors', 'Masters', 'plusTwo', 'primary', 'secondary'];

function toTitleMode(mode) {
  if (!mode) return 'Online';
  const m = String(mode).toLowerCase();
  if (m === 'online') return 'Online';
  if (m === 'offline') return 'Offline';
  if (m === 'hybrid') return 'Hybrid';
  return 'Online';
}

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomName(subject) {
  const first = ['Alex','Sam','Jordan','Taylor','Avery','Riya','Kiran','Maya','Rohan','Sita','Anil','Priya'];
  const last = ['Sharma','Thapa','Karki','Gurung','Rai','KC','Basnet','Pandey','Tamang','Maharjan'];
  return `${randFrom(first)} ${randFrom(last)} (${subject})`;
}

function randomEmail(base) {
  const slug = base.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  const n = Math.floor(Math.random()*9000)+1000;
  return `${slug}_${n}@example.com`;
}

function normalizeSubject(subj) {
  if (!subj) return null;
  // simple mapping for common variants
  const s = String(subj).trim().toLowerCase();
  const map = new Map([
    ['mathematics','Math'],
    ['maths','Math'],
    ['math','Math'],
    ['english language','English'],
    ['eng','English'],
    ['cs','Computer Science'],
    ['computer','Computer Science'],
    ['computer science','Computer Science'],
    ['chem','Chemistry'],
    ['chemistry','Chemistry'],
    ['bio','Biology'],
    ['biology','Biology'],
    ['nepali','Nepali'],
    ['physics','Physics']
  ]);
  if (map.has(s)) return map.get(s);
  // fallback: title-case words and accept only if in allowed
  const title = s.replace(/\b\w/g, c=>c.toUpperCase());
  return ALLOWED_SUBJECTS.includes(title) ? title : null;
}

async function fetchStudents(client) {
  const q = await client.query(`
    SELECT s.user_id, s.academic_level, s.subjects, s.preferred_mode, s.budget, s.availability,
           u.full_name, u.email
    FROM students s
    JOIN users u ON s.user_id = u.user_id
    WHERE u.role = 'student'
  `);
  return q.rows;
}

function pickSubjectForStudent(student) {
  let subs = student.subjects;
  if (!subs) return null;
  if (typeof subs === 'string') {
    try {
      // try parse array literal like {Math,Physics}
      if (subs.startsWith('{') && subs.endsWith('}')) {
        subs = subs.slice(1,-1).split(',').map(x=>x.trim());
      } else {
        subs = subs.split(',').map(x=>x.trim());
      }
    } catch (_) {
      subs = [subs];
    }
  }
  if (!Array.isArray(subs)) subs = [subs];
  const normalized = subs.map(normalizeSubject).filter(Boolean);
  const allowed = normalized.filter(s => ALLOWED_SUBJECTS.includes(s));
  if (allowed.length === 0) return null;
  return randFrom(allowed);
}

function rateForBudget(budget) {
  const b = Number(budget || 0);
  if (!isFinite(b) || b <= 0) return 500; // default
  const rate = Math.max(200, Math.floor(b * (0.7 + Math.random()*0.25))); // 70% - 95% of budget
  // round to nearest 50
  return Math.round(rate/50)*50;
}

async function ensureTutorForStudent(client, student) {
  const subject = pickSubjectForStudent(student);
  if (!subject) return { inserted: 0, reason: 'no_compatible_subject' };
  const mode = toTitleMode(student.preferred_mode);
  const rate = rateForBudget(student.budget);
  const compatible = {
    subject: true,
    mode: true, // we set equal to student's
    rate: student.budget != null ? rate <= Number(student.budget) : true
  };
  const score = (compatible.subject + compatible.mode + (compatible.rate?1:0))/3;
  if (score < 0.6) return { inserted: 0, reason: 'compat_below_threshold' };

  const name = randomName(subject);
  const email = randomEmail(name);
  const level = randFrom(TUTOR_LEVELS);
  const exp = Math.floor(Math.random()*8)+1;
  const location = student.availability || 'Kathmandu'; // fallback since schema lacks student location
  const profile_picture = null;

  // Insert user and tutor in a transaction
  await client.query('BEGIN');
  try {
    const u = await client.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, 'tutor')
       RETURNING user_id`,
      [name, email, '$2b$10$dummyhashforseeders123456789012345678901234567890123456']
    );
    const user_id = u.rows[0].user_id;
    await client.query(
      `INSERT INTO tutors (user_id, name, education_level, subject, experience_years, hourly_rate, teaching_mode, location, profile_picture, verification_status, is_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'approved', true)`,
      [user_id, name, level, subject, exp, rate, mode, location, profile_picture]
    );
    await client.query('COMMIT');
    return { inserted: 1 };
  } catch (e) {
    await client.query('ROLLBACK');
    if (/duplicate key/.test(String(e.message||''))) {
      return { inserted: 0, reason: 'email_conflict' };
    }
    throw e;
  }
}

async function normalizeExistingTutorSubjects(client) {
  // Update existing tutors to allowed subjects where a simple normalization is possible
  const q = await client.query(`SELECT tutor_id, subject FROM tutors`);
  let updated = 0;
  for (const row of q.rows) {
    const norm = normalizeSubject(row.subject);
    if (norm && norm !== row.subject) {
      await client.query('UPDATE tutors SET subject = $1 WHERE tutor_id = $2', [norm, row.tutor_id]);
      updated++;
    }
  }
  return updated;
}

async function main() {
  const perStudent = Number(process.env.PER_STUDENT || process.argv.find(a=>a.startsWith('--per-student='))?.split('=')[1] || 1);
  const client = await pool.connect();
  try {
    const students = await fetchStudents(client);
    console.log(`Found ${students.length} students`);
    let inserted = 0, skipped = 0;
    for (const s of students) {
      for (let i=0;i<perStudent;i++) {
        const res = await ensureTutorForStudent(client, s);
        if (res.inserted) inserted += res.inserted; else skipped++;
      }
    }
    const normalized = await normalizeExistingTutorSubjects(client);
    console.log(`Inserted tutors: ${inserted}, skipped: ${skipped}, normalized existing subjects: ${normalized}`);
  } catch (e) {
    console.error('Seeding error:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    // allow pool to end on process exit
    setTimeout(()=>process.exit(process.exitCode||0), 50);
  }
}

if (require.main === module) {
  main();
}
