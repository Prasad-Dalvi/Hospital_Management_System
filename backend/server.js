// backend/server.js  (copy & paste, restart server after save)
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json({ limit: '25mb' })); // bigger limit for images

// static serving
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
} else {
  console.warn('frontend folder not found at', publicPath);
}

// DB pool: update credentials if needed
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Adi@9657@18',    // << set your MySQL password
  database: 'memory_tracker',
  waitForConnections: true,
  connectionLimit: 10
});

// DEBUG: simple ping
app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date() }));

// Log all incoming API requests (method, path, body)
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} - body keys:`, Object.keys(req.body || {}));
  // for debugging print small body (but not huge photos)
  if (req.body && Object.keys(req.body).length && typeof req.body !== 'string') {
    const copy = { ...req.body };
    // avoid printing very large photo strings
    if (copy.photo && typeof copy.photo === 'string' && copy.photo.length > 200) copy.photo = '[base64-data...]';
    console.log('       body preview:', copy);
  }
  next();
});

// GET patients
app.get('/api/patients', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM patients ORDER BY registration DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/patients ERROR:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST patient (with SQL error logging)
app.post('/api/patients', async (req, res) => {
  try {
    const p = req.body;
    const sql = `INSERT INTO patients (fullName, dob, age, gender, stage, contact, notes, photo, registration, diagnosisDate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      p.fullName || null,
      p.dob || null,
      p.age || null,
      p.gender || null,
      p.stage || null,
      p.contact || null,
      p.notes || null,
      p.photo || null,
      p.registration || new Date(),
      p.diagnosisDate || null
    ];
    const [result] = await pool.execute(sql, values);
    console.log('Inserted patient id=', result.insertId);
    res.status(201).json({ id: result.insertId, ...p });
  } catch (err) {
    console.error('POST /api/patients SQL ERROR:', err.code, err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to add patient', details: err.message });
  }
});

// other endpoints (caretakers) - keep them too
app.get('/api/caretakers', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM caretakers ORDER BY joined DESC'); res.json(rows); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});
app.post('/api/caretakers', async (req, res) => {
  try {
    const c = req.body;
    const [result] = await pool.execute('INSERT INTO caretakers (fullName, relation, assignedPatientId, photo, joined) VALUES (?, ?, ?, ?, ?)', 
      [c.fullName || null, c.relation || null, c.assignedPatientId || null, c.photo || null, c.joined || new Date()]);
    res.status(201).json({ id: result.insertId, ...c });
  } catch (err) {
    console.error('POST /api/caretakers SQL ERROR:', err);
    res.status(500).json({ error: 'Failed to add caretaker' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}  (serving ${publicPath})`));
