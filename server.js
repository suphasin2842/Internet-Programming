require('dotenv').config();

const crypto = require('crypto');
const { promisify } = require('util');
const cors = require('cors');
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = Number(process.env.PORT) || 3045;
const scryptAsync = promisify(crypto.scrypt);
const sessionLifetimeMs = 2 * 60 * 60 * 1000;
const loginAttempts = new Map();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '100kb' }));
app.disable('x-powered-by');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, nValue, rValue, pValue, salt, storedKey] = String(encodedHash).split('$');
  if (algorithm !== 'scrypt' || !salt || !storedKey) return false;

  const derivedKey = await scryptAsync(password, salt, 64, {
    N: Number(nValue),
    r: Number(rValue),
    p: Number(pValue),
    maxmem: 256 * 1024 * 1024,
  });
  const storedBuffer = Buffer.from(storedKey, 'hex');
  return storedBuffer.length === derivedKey.length && crypto.timingSafeEqual(storedBuffer, derivedKey);
}

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || now > current.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
}

async function requireAdmin(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ Admin' });

  try {
    const tokenHash = hashSessionToken(token);
    const [rows] = await pool.execute(
      `SELECT s.id, s.admin_user_id, u.username
       FROM admin_sessions AS s
       JOIN admin_users AS u ON u.id = s.admin_user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
       LIMIT 1`,
      [tokenHash],
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    req.admin = rows[0];
    return next();
  } catch (error) {
    console.error('Admin session error:', error.message);
    return res.status(500).json({ error: 'ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ' });
  }
}

function parseProduct(body) {
  const product = {
    product_name: String(body.product_name || '').trim(),
    description: String(body.description || '').trim(),
    price: Number(body.price),
    image_url: String(body.image_url || '').trim(),
    sku: String(body.sku || '').trim().toUpperCase(),
    category: String(body.category || '').trim(),
  };

  if (product.product_name.length < 2 || product.product_name.length > 150) {
    return { error: 'ชื่อสินค้าต้องมี 2-150 ตัวอักษร' };
  }
  if (product.description.length > 2000) return { error: 'รายละเอียดสินค้ายาวเกิน 2,000 ตัวอักษร' };
  if (!Number.isFinite(product.price) || product.price < 0 || product.price > 99999999.99) {
    return { error: 'ราคาสินค้าไม่ถูกต้อง' };
  }
  if (!/^https?:\/\//i.test(product.image_url) || product.image_url.length > 2048) {
    return { error: 'URL รูปภาพต้องขึ้นต้นด้วย http:// หรือ https://' };
  }
  if (!/^[A-Z0-9_-]{2,50}$/.test(product.sku)) return { error: 'SKU ใช้ได้เฉพาะ A-Z, 0-9, _ และ -' };
  if (product.category.length < 2 || product.category.length > 80) return { error: 'หมวดหมู่ไม่ถูกต้อง' };

  return { product };
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: process.env.DB_NAME });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(503).json({ ok: false, error: 'Database is unavailable' });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Inventory ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Products error:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Product ID ไม่ถูกต้อง' });

  try {
    const [rows] = await pool.execute('SELECT * FROM Inventory WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    return res.json(rows[0]);
  } catch (error) {
    console.error('Product detail error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginRateLimit(ip)) return res.status(429).json({ error: 'ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที' });

  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password || password.length > 256) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, username, password_hash FROM admin_users WHERE username = ? AND is_active = 1 LIMIT 1',
      [username],
    );
    const isValid = users.length === 1 && await verifyPassword(password, users[0].password_hash);
    if (!isValid) return res.status(401).json({ error: 'ชื่อผู้ดูแลระบบหรือรหัสผ่านไม่ถูกต้อง' });

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    await pool.execute(
      'INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [users[0].id, hashSessionToken(token), expiresAt],
    );
    await pool.execute('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [users[0].id]);
    loginAttempts.delete(ip);
    return res.json({ token, expiresAt: expiresAt.toISOString(), admin: { username: users[0].username } });
  } catch (error) {
    console.error('Admin login error:', error.message);
    return res.status(500).json({ error: 'เข้าสู่ระบบ Admin ไม่สำเร็จ' });
  }
});

app.post('/api/admin/logout', requireAdmin, async (req, res) => {
  const token = (req.get('authorization') || '').slice(7);
  try {
    await pool.execute('DELETE FROM admin_sessions WHERE token_hash = ?', [hashSessionToken(token)]);
    return res.status(204).send();
  } catch (error) {
    console.error('Admin logout error:', error.message);
    return res.status(500).json({ error: 'ออกจากระบบไม่สำเร็จ' });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  const parsed = parseProduct(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { product_name, description, price, image_url, sku, category } = parsed.product;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Inventory (product_name, description, price, image_url, sku, category)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_name, description, price, image_url, sku, category],
    );
    return res.status(201).json({ id: result.insertId, ...parsed.product });
  } catch (error) {
    console.error('Create product error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU นี้มีอยู่แล้ว' });
    return res.status(500).json({ error: 'เพิ่มสินค้าไม่สำเร็จ' });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Product ID ไม่ถูกต้อง' });
  const parsed = parseProduct(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { product_name, description, price, image_url, sku, category } = parsed.product;
  try {
    const [result] = await pool.execute(
      `UPDATE Inventory
       SET product_name = ?, description = ?, price = ?, image_url = ?, sku = ?, category = ?
       WHERE id = ?`,
      [product_name, description, price, image_url, sku, category, id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    return res.json({ id, ...parsed.product });
  } catch (error) {
    console.error('Update product error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU นี้มีอยู่แล้ว' });
    return res.status(500).json({ error: 'แก้ไขสินค้าไม่สำเร็จ' });
  }
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled request error:', error.message);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API running on port ${port}`);
});
