require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3045; 

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ดึงข้อมูลสินค้าทั้งหมดจากฐานข้อมูล
app.get('/api/products', async(req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Inventory');
        // ข้อมูลที่ถูกส่งออกไป (JSON) จะใช้ key (ชื่อตัวแปร) ตามชื่อคอลัมน์ใหม่ของคุณเป๊ะๆ
        res.json(rows);
    } catch (e) {
        console.error('Products Error: ', e.message);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`API running on port ${port}`);
});