const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const app = express();
const port = 3000;

// Middleware Penting:
// 1. Mengizinkan Express membaca body request dalam format JSON
app.use(express.json());
// 2. Mengizinkan Express membaca data form URL-encoded (jika menggunakan form biasa)
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: 'localhost', // Ganti jika server DB Anda berbeda
    user: 'root', // Ganti dengan username DB Anda
    password: 'kokolopoi123', // Ganti dengan password DB Anda
    database: 'api', // Ganti dengan nama database dari Langkah 2
    port: 3306, // Ganti jika port DB Anda berbeda
});

// (Opsional) Uji koneksi saat server start
pool.getConnection()
    .then(connection => {
        console.log('[SERVER] Berhasil terhubung ke database MySQL.');
        connection.release(); // Lepaskan koneksi kembali ke pool
    })
    .catch(err => {
        console.error('[SERVER] GAGAL terhubung ke database:', err.message);
    });

// Rute GET untuk menyajikan halaman utama (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Rute POST untuk Membuat API Key ---
app.post('/create', async (req, res) => {
    try {
        const username = req.body.username || 'Anonim';

        // 1. Buat API Key
        const randomBytes = crypto.randomBytes(32);
        const rawToken = randomBytes.toString('base64url');
        // PERBAIKAN: Menggunakan backtick (`) untuk template literal
        const finalApiKey = `mh_${rawToken}`; 

        // 2. Simpan ke Database
        const sql = 'INSERT INTO api_keys (username, api_key) VALUES (?, ?)';

        // Jalankan query menggunakan pool
        const [result] = await pool.query(sql, [username, finalApiKey]);

        // PERBAIKAN: Menggunakan backtick (`) untuk template literal
        console.log(`[SERVER] API Key baru disimpan ke DB untuk ${username}. ID: ${result.insertId}`);
        
        // 4. Kirim kunci kembali ke klien
        res.status(201).json({
            success: true,
            apiKey: finalApiKey,
            message: 'API Key berhasil dibuat dan disimpan ke database.'
        });

    } catch (error) {
        // Tangkap error (bisa dari crypto atau database)
        console.error('Error saat membuat atau menyimpan API Key:', error);

        // Kirim respon error yang lebih spesifik jika ini error duplikat
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Terjadi konflik. Coba lagi untuk menghasilkan kunci unik.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server saat memproses permintaan Anda.'
        });
    }
});

app.post('/check', async (req, res) => {
    try {
        // 1. Ambil API key dari body request
        const { apiKey } = req.body;

        // 2. Validasi input: Pastikan API key ada di request
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'API Key wajib disertakan di body request.'
            });
        }

        // 3. Buat query untuk mencari key di database
        const sql = 'SELECT username FROM api_keys WHERE api_key = ?';

        // 4. Jalankan query dengan aman
        const [rows] = await pool.query(sql, [apiKey]);

        // 5. Periksa hasilnya
        if (rows.length > 0) {
            // DITEMUKAN: Key valid
            const username = rows[0].username;

            // PERBAIKAN: Menggunakan backtick (`) untuk template literal
            res.status(200).json({
                success: true,
                message: `API Key valid. Dimiliki oleh: ${username}`,
                username: username
            });
        } else {
            // TIDAK DITEMUKAN: Key tidak valid
            res.status(404).json({
                success: false,
                message: 'API Key tidak ditemukan atau tidak valid.'
            });
        }

    } catch (error) {
        // Tangkap error database atau lainnya
        console.error('Error saat memvalidasi API Key:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server saat validasi.'
        });
    }
});

// Menjalankan server
app.listen(port, () => {
    // PERBAIKAN: Menggunakan backtick (`) untuk template literal
    console.log(`Server berjalan di http://localhost:${port}`); 
});