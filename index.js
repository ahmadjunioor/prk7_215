require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // folder public

// Koneksi ke MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || "kokolopoi123",
  database: process.env.DB_NAME || "api",
});

db.connect(err => {
  if (err) {
    console.error('❌ Gagal konek ke MySQL:', err);
  } else {
    console.log('✅ Terhubung ke MySQL Workbench');
  }
});

// Route utama untuk tampilkan halaman index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate API Key dan simpan ke DB
app.post('/api/generate', (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ message: 'Keyword wajib diisi!' });

  const apiKey = crypto.randomBytes(16).toString('hex');
  const sql = 'INSERT INTO api_key (keyword, api_key) VALUES (?, ?)';

  db.query(sql, [keyword, apiKey], (err) => {
    if (err) {
      console.error('❌ Gagal menyimpan ke DB:', err);
      return res.status(500).json({ message: 'Gagal menyimpan ke database' });
    }
    res.json({ message: '✅ API key berhasil disimpan', api_key: apiKey });
  });
});

// Validasi API Key via Postman
app.post('/api/validate', (req, res) => {
  const { api_key } = req.body;
  if (!api_key) return res.status(400).json({ message: 'API key wajib diisi!' });

  db.query('SELECT * FROM api_keys WHERE api_key = ?', [api_key], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Gagal cek ke database' });
    if (rows.length > 0) {
      res.json({ valid: true, keyword: rows[0].keyword });
    } else {
      res.json({ valid: false });
    }
  });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));