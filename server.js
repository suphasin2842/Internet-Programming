// ไฟล์นี้คือ Backend หลักของร้าน: เปิด API, คุยกับ MySQL และเช็กสิทธิ์ Login
require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');

const app = express();
// พอร์ตและอายุ Session แยกกัน: Admin สั้นกว่า User เพื่อความปลอดภัยกว่า
const port = Number(process.env.PORT) || 3045;
const scryptAsync = promisify(crypto.scrypt);
const sessionLifetimeMs = 2 * 60 * 60 * 1000;
const userSessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const loginAttempts = new Map();
const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
const uploadDirectory = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
const imageExtensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

// รูปที่ Admin อัปโหลดจะอยู่ใน uploads และใช้ชื่อสุ่มแทนชื่อไฟล์เดิม
fs.mkdirSync(uploadDirectory, { recursive: true });
const productImageStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = imageExtensionByMime.get(file.mimetype);
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`);
  },
});
const productImageUpload = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (imageExtensionByMime.has(file.mimetype)) return callback(null, true);
    const error = new Error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP');
    error.code = 'UNSUPPORTED_IMAGE_TYPE';
    return callback(error);
  },
});

// อ่านเว็บที่อนุญาตให้เรียก API จาก .env (CORS)
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// เปิดรับ Request จาก Frontend และรับ JSON ได้ไม่เกิน 100 KB ต่อครั้ง
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(uploadDirectory, {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
}));
app.disable('x-powered-by');

// สร้าง Connection Pool ไปยัง Database เพื่อไม่ต้องเปิดการเชื่อมต่อใหม่ทุก Request
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

// เก็บ Token ใน DB เป็น SHA-256 แทนการเก็บ Token จริง
function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getPublicUploadUrl(req, filename) {
  const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
  return `${publicBaseUrl || requestBaseUrl}/uploads/${encodeURIComponent(filename)}`;
}

// ลบเฉพาะไฟล์ชื่อที่ระบบสร้างเอง ป้องกันไม่ให้ URL ภายนอกไปแตะไฟล์อื่นบน Server
async function deleteStoredProductImage(imageUrl) {
  try {
    const parsedUrl = new URL(String(imageUrl || ''));
    const prefix = '/uploads/';
    if (!parsedUrl.pathname.startsWith(prefix)) return;
    if (publicBaseUrl && parsedUrl.origin !== new URL(publicBaseUrl).origin) return;

    const filename = decodeURIComponent(parsedUrl.pathname.slice(prefix.length));
    if (!/^\d+-[a-f0-9]{24}\.(jpg|png|webp)$/.test(filename)) return;
    await fs.promises.unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT' && error.name !== 'TypeError') {
      console.error('Delete uploaded image error:', error.message);
    }
  }
}

// เอารหัสที่ผู้ใช้กรอกมาเทียบกับ scrypt hash ที่เก็บไว้ โดยเทียบแบบปลอดภัย
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

// สร้าง hash ใหม่ตอนสมัคร User หรือสร้าง Admin (ไม่มีการเก็บรหัสผ่านดิบ)
async function hashPassword(password) {
  const N = 131072;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64, {
    N,
    r,
    p,
    maxmem: 256 * 1024 * 1024,
  });
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;
}

// สร้างกุญแจแยกตามประเภทบัญชี, IP และชื่อที่ Login เพื่อกันการลองรหัสถี่เกินไป
function getLoginRateKey(mode, ip, identifier) {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase() || 'unknown';
  return `${mode}:${ip}:${normalizedIdentifier}`;
}

// ถ้าผิดเกิน 5 ครั้งใน 15 นาที จะพักการ Login ของบัญชีนั้นชั่วคราว
function isLoginRateLimited(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current) return false;
  if (now > current.resetAt) {
    loginAttempts.delete(key);
    return false;
  }
  return current.count >= 5;
}

function recordLoginFailure(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now > current.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  current.count += 1;
}

// Middleware นี้ใช้ครอบ Route ที่ให้เฉพาะ Admin เข้าได้
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

// ดึง Token จาก Header: Authorization: Bearer <token>
function getBearerToken(req) {
  const authorization = req.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

// ตัด password_hash และข้อมูลภายในออกก่อนส่งข้อมูล User กลับไปที่ Frontend
function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.display_name || row.username,
    email: row.email,
    phone: row.phone,
    role: 'user',
  };
}

// Middleware ตรวจ Session ของ User ปกติ
async function requireUser(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });

  try {
    const [rows] = await pool.execute(
      `SELECT s.id AS session_id, u.id, u.username, u.display_name, u.email, u.phone
       FROM user_sessions AS s
       JOIN user_accounts AS u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
       LIMIT 1`,
      [hashSessionToken(token)],
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    req.user = rows[0];
    return next();
  } catch (error) {
    console.error('User session error:', error.message);
    return res.status(500).json({ error: 'ตรวจสอบสิทธิ์ผู้ใช้ไม่สำเร็จ' });
  }
}

// Order รองรับทั้ง User และ Admin: ลองตรวจ Session User ก่อน แล้วค่อยตรวจ Admin
async function requireOrderActor(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });

  try {
    const tokenHash = hashSessionToken(token);
    const [users] = await pool.execute(
      `SELECT s.id AS session_id, u.id, u.username, u.display_name, u.email, u.phone
       FROM user_sessions AS s
       JOIN user_accounts AS u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
       LIMIT 1`,
      [tokenHash],
    );
    if (users.length > 0) {
      req.orderActor = { role: 'user', id: users[0].id };
      req.user = users[0];
      return next();
    }

    const [admins] = await pool.execute(
      `SELECT s.id AS session_id, u.id, u.username
       FROM admin_sessions AS s
       JOIN admin_users AS u ON u.id = s.admin_user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
       LIMIT 1`,
      [tokenHash],
    );
    if (admins.length > 0) {
      req.orderActor = { role: 'admin', id: admins[0].id };
      req.admin = admins[0];
      return next();
    }

    return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  } catch (error) {
    console.error('Order actor session error:', error.message);
    return res.status(500).json({ error: 'ตรวจสอบสิทธิ์ผู้สั่งซื้อไม่สำเร็จ' });
  }
}

// ตรวจข้อมูลสมัคร User ให้ตรงกับกฎเดียวกับหน้า Login
function validateUserRegistration(body) {
  const username = String(body.username || body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  if (username.length < 2 || username.length > 80) return { error: 'ชื่อผู้ใช้ต้องมี 2-80 ตัวอักษร' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return { error: 'Email ไม่ถูกต้อง' };
  if (!/^0\d{9}$/.test(phone)) return { error: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0' };
  if (password.length < 8 || password.length > 256 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข' };
  }
  return { user: { username, display_name: username, email, phone, password } };
}

// เติม Column ที่อาจยังไม่มีในตารางเก่า โดยไม่ลบข้อมูลเดิม
async function ensureTableColumn(tableName, columnName, definition) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
  if (columns.length === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

// สร้างตาราง Auth/Order ถ้ายังไม่มี และปรับ orders ให้รองรับ Admin buyer
async function ensureAuthTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(80) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_admin_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(80) NOT NULL,
      display_name VARCHAR(80) NOT NULL,
      email VARCHAR(190) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_accounts_username (username),
      UNIQUE KEY uq_user_accounts_email (email),
      UNIQUE KEY uq_user_accounts_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      admin_user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
      KEY idx_admin_sessions_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_sessions_token_hash (token_hash),
      KEY idx_user_sessions_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      admin_user_id BIGINT UNSIGNED NULL,
      buyer_role VARCHAR(16) NOT NULL DEFAULT 'user',
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_orders_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureTableColumn('orders', 'admin_user_id', 'BIGINT UNSIGNED NULL AFTER user_id');
  await ensureTableColumn('orders', 'buyer_role', "VARCHAR(16) NOT NULL DEFAULT 'user' AFTER admin_user_id");
  const [orderUserColumns] = await pool.query('SHOW COLUMNS FROM orders LIKE ?', ['user_id']);
  if (orderUserColumns.length > 0 && orderUserColumns[0].Null === 'NO') {
    await pool.query('ALTER TABLE orders MODIFY COLUMN user_id BIGINT UNSIGNED NULL');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NULL,
      product_name VARCHAR(150) NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      PRIMARY KEY (id),
      KEY idx_order_items_order_id (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// แปลงและตรวจข้อมูลสินค้าก่อน INSERT/UPDATE ทุกครั้ง
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

// เช็กว่า Backend ยังต่อ Database ได้หรือไม่
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: process.env.DB_NAME });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(503).json({ ok: false, error: 'Database is unavailable' });
  }
});

// หน้าร้านใช้ดึงสินค้าทั้งหมดจาก Inventory
app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Inventory ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Products error:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// หน้ารายละเอียดสินค้าใช้ดึงสินค้าทีละ ID
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

// สมัคร User: ตรวจข้อมูล -> hash password -> INSERT -> ส่งข้อมูลปลอดภัยกลับไป
app.post('/api/auth/register', async (req, res) => {
  const parsed = validateUserRegistration(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const passwordHash = await hashPassword(parsed.user.password);
    const [result] = await pool.execute(
      `INSERT INTO user_accounts (username, display_name, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [parsed.user.username, parsed.user.display_name, parsed.user.email, parsed.user.phone, passwordHash],
    );
    const [rows] = await pool.execute(
      'SELECT id, username, display_name, email, phone FROM user_accounts WHERE id = ? LIMIT 1',
      [result.insertId],
    );
    return res.status(201).json({ user: publicUser(rows[0]) });
  } catch (error) {
    console.error('User registration error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'ชื่อผู้ใช้, Email หรือเบอร์โทรศัพท์นี้ถูกใช้แล้ว' });
    return res.status(500).json({ error: 'สมัครสมาชิกไม่สำเร็จ' });
  }
});

// Login User: ค้นหาบัญชี, ตรวจ hash, สร้าง Session Token
app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '');
  if (!identifier || !password || password.length > 256) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้หรือ Email และรหัสผ่าน' });
  const rateKey = getLoginRateKey('user', ip, identifier);
  if (isLoginRateLimited(rateKey)) return res.status(429).json({ error: 'ลองเข้าสู่ระบบบัญชีนี้มากเกินไป กรุณารอ 15 นาที' });

  try {
    const [users] = await pool.execute(
      `SELECT id, username, display_name, email, phone, password_hash
       FROM user_accounts
       WHERE (username = ? OR email = ?) AND is_active = 1
       LIMIT 1`,
      [identifier, identifier.toLowerCase()],
    );
    const isValid = users.length === 1 && await verifyPassword(password, users[0].password_hash);
    if (!isValid) {
      recordLoginFailure(rateKey);
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + userSessionLifetimeMs);
    await pool.execute(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [users[0].id, hashSessionToken(token), expiresAt],
    );
    await pool.execute('UPDATE user_accounts SET last_login_at = NOW() WHERE id = ?', [users[0].id]);
    loginAttempts.delete(rateKey);
    return res.json({ token, expiresAt: expiresAt.toISOString(), user: publicUser(users[0]) });
  } catch (error) {
    console.error('User login error:', error.message);
    return res.status(500).json({ error: 'เข้าสู่ระบบไม่สำเร็จ' });
  }
});

// ตรวจว่ารหัส Session User ที่เก็บไว้ยังใช้ได้หรือไม่
app.get('/api/auth/me', requireUser, async (req, res) => {
  return res.json({ user: publicUser(req.user) });
});

// ลบ Session User ออกจาก Database
app.post('/api/auth/logout', requireUser, async (req, res) => {
  try {
    await pool.execute('DELETE FROM user_sessions WHERE token_hash = ?', [hashSessionToken(getBearerToken(req))]);
    return res.status(204).send();
  } catch (error) {
    console.error('User logout error:', error.message);
    return res.status(500).json({ error: 'ออกจากระบบไม่สำเร็จ' });
  }
});

// ตรวจ Session Admin ที่ Frontend เรียกตอนเปิดแอป/รีเฟรช
app.get('/api/admin/me', requireAdmin, async (req, res) => {
  return res.json({ admin: { username: req.admin.username, role: 'admin' } });
});

// ตรวจรายการในตะกร้าก่อนสร้าง Order และรวมสินค้าซ้ำให้เหลือรายการเดียว
function parseOrderItems(body) {
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    return { error: 'ตะกร้าสินค้าไม่ถูกต้อง' };
  }
  const quantities = new Map();
  for (const item of body.items) {
    const productId = Number(item.productId ?? item.id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { error: 'รายการสินค้าในตะกร้าไม่ถูกต้อง' };
    }
    const nextQuantity = (quantities.get(productId) || 0) + quantity;
    if (nextQuantity > 99) return { error: 'จำนวนสินค้าต่อรายการต้องไม่เกิน 99 ชิ้น' };
    quantities.set(productId, nextQuantity);
  }
  return { quantities };
}

// สร้าง Order จริงด้วย Transaction: ถ้าขั้นใดพังจะ Rollback ทั้งชุด
app.post('/api/orders', requireOrderActor, async (req, res) => {
  const parsed = parseOrderItems(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const productIds = [...parsed.quantities.keys()];
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await connection.execute(
      `SELECT id, product_name, price FROM Inventory WHERE id IN (${placeholders})`,
      productIds,
    );
    if (products.length !== productIds.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'มีสินค้าบางรายการไม่พร้อมจำหน่ายแล้ว กรุณาตรวจสอบตะกร้า' });
    }

    const orderLines = products.map((product) => ({
      productId: Number(product.id),
      productName: String(product.product_name),
      unitPrice: Number(product.price),
      quantity: parsed.quantities.get(Number(product.id)),
    }));
    const totalAmount = orderLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const isAdminOrder = req.orderActor.role === 'admin';
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, admin_user_id, buyer_role, status, total_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [isAdminOrder ? null : req.orderActor.id, isAdminOrder ? req.orderActor.id : null, req.orderActor.role, 'pending', totalAmount.toFixed(2)],
    );
    for (const line of orderLines) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderResult.insertId, line.productId, line.productName, line.unitPrice.toFixed(2), line.quantity],
      );
    }
    await connection.commit();
    return res.status(201).json({
      order: {
        id: orderResult.insertId,
        status: 'pending',
        totalAmount,
        items: orderLines,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error.message);
    return res.status(500).json({ error: 'สร้างคำสั่งซื้อไม่สำเร็จ' });
  } finally {
    connection.release();
  }
});

// ดึงประวัติ Order เฉพาะของผู้ที่ Login อยู่ (User หรือ Admin)
app.get('/api/orders', requireOrderActor, async (req, res) => {
  try {
    const orderFilter = req.orderActor.role === 'admin'
      ? 'buyer_role = \'admin\' AND admin_user_id = ?'
      : 'buyer_role = \'user\' AND user_id = ?';
    const [orders] = await pool.execute(
      `SELECT id, status, total_amount AS totalAmount, created_at AS createdAt, updated_at AS updatedAt
       FROM orders WHERE ${orderFilter} ORDER BY id DESC`,
      [req.orderActor.id],
    );
    if (orders.length === 0) return res.json([]);
    const orderIds = orders.map((order) => order.id);
    const placeholders = orderIds.map(() => '?').join(',');
    const [items] = await pool.execute(
      `SELECT order_id AS orderId, product_id AS productId, product_name AS productName,
              unit_price AS unitPrice, quantity
       FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
      orderIds,
    );
    const itemsByOrder = new Map();
    for (const item of items) {
      const current = itemsByOrder.get(item.orderId) || [];
      current.push(item);
      itemsByOrder.set(item.orderId, current);
    }
    return res.json(orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) || [] })));
  } catch (error) {
    console.error('Orders error:', error.message);
    return res.status(500).json({ error: 'โหลดประวัติคำสั่งซื้อไม่สำเร็จ' });
  }
});

// Admin ดู Order ของทุกคนเพื่อใช้จัดการสถานะ
app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.status, o.buyer_role AS buyerRole, o.total_amount AS totalAmount, o.created_at AS createdAt,
              COALESCE(u.username, a.username) AS username,
              u.email, u.phone
       FROM orders AS o
       LEFT JOIN user_accounts AS u ON o.buyer_role = 'user' AND u.id = o.user_id
       LEFT JOIN admin_users AS a ON o.buyer_role = 'admin' AND a.id = o.admin_user_id
       ORDER BY o.id DESC`,
    );
    return res.json(orders);
  } catch (error) {
    console.error('Admin orders error:', error.message);
    return res.status(500).json({ error: 'โหลดคำสั่งซื้อไม่สำเร็จ' });
  }
});

// Admin เปลี่ยนสถานะ Order จากหน้า Dashboard
app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '').trim();
  const allowedStatuses = new Set(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
  if (!Number.isInteger(id) || id < 1 || !allowedStatuses.has(status)) return res.status(400).json({ error: 'สถานะคำสั่งซื้อไม่ถูกต้อง' });
  try {
    const [result] = await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    return res.json({ id, status });
  } catch (error) {
    console.error('Update order status error:', error.message);
    return res.status(500).json({ error: 'อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ' });
  }
});

// Login Admin แยก Endpoint และ Session ออกจาก User
app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password || password.length > 256) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }
  const rateKey = getLoginRateKey('admin', ip, username);
  if (isLoginRateLimited(rateKey)) return res.status(429).json({ error: 'ลองเข้าสู่ระบบบัญชีนี้มากเกินไป กรุณารอ 15 นาที' });

  try {
    const [users] = await pool.execute(
      'SELECT id, username, password_hash FROM admin_users WHERE username = ? AND is_active = 1 LIMIT 1',
      [username],
    );
    const isValid = users.length === 1 && await verifyPassword(password, users[0].password_hash);
    if (!isValid) {
      recordLoginFailure(rateKey);
      return res.status(401).json({ error: 'ชื่อผู้ดูแลระบบหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    await pool.execute(
      'INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [users[0].id, hashSessionToken(token), expiresAt],
    );
    await pool.execute('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [users[0].id]);
    loginAttempts.delete(rateKey);
    return res.json({ token, expiresAt: expiresAt.toISOString(), admin: { username: users[0].username } });
  } catch (error) {
    console.error('Admin login error:', error.message);
    return res.status(500).json({ error: 'เข้าสู่ระบบ Admin ไม่สำเร็จ' });
  }
});

// ลบ Session Admin ออกจาก Database
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

// รับรูปสินค้าจากหน้า Admin เท่านั้น จำกัด 1 รูปและไม่เกิน 5 MB
app.post('/api/admin/uploads/product-image', requireAdmin, (req, res) => {
  productImageUpload.single('image')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'รูปสินค้าต้องมีขนาดไม่เกิน 5 MB' });
      }
      return res.status(400).json({ error: error.message || 'อัปโหลดรูปสินค้าไม่สำเร็จ' });
    }
    if (!req.file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปสินค้า' });
    return res.status(201).json({
      image_url: getPublicUploadUrl(req, req.file.filename),
      filename: req.file.filename,
    });
  });
});

// Admin เพิ่มสินค้าลง Inventory จริง
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

// Admin แก้ไขสินค้าตาม ID ใน Inventory จริง
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Product ID ไม่ถูกต้อง' });
  const parsed = parseProduct(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { product_name, description, price, image_url, sku, category } = parsed.product;
  try {
    const [existingRows] = await pool.execute('SELECT image_url FROM Inventory WHERE id = ? LIMIT 1', [id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    const [result] = await pool.execute(
      `UPDATE Inventory
       SET product_name = ?, description = ?, price = ?, image_url = ?, sku = ?, category = ?
       WHERE id = ?`,
      [product_name, description, price, image_url, sku, category, id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    if (existingRows[0].image_url !== image_url) await deleteStoredProductImage(existingRows[0].image_url);
    return res.json({ id, ...parsed.product });
  } catch (error) {
    console.error('Update product error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU นี้มีอยู่แล้ว' });
    return res.status(500).json({ error: 'แก้ไขสินค้าไม่สำเร็จ' });
  }
});

// Admin ลบสินค้าออกจาก Inventory จริง
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Product ID ไม่ถูกต้อง' });

  try {
    const [existingRows] = await pool.execute('SELECT image_url FROM Inventory WHERE id = ? LIMIT 1', [id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'ไม่พบสินค้าที่ต้องการลบ' });
    const [result] = await pool.execute('DELETE FROM Inventory WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบสินค้าที่ต้องการลบ' });
    await deleteStoredProductImage(existingRows[0].image_url);
    return res.json({ deleted: true, id });
  } catch (error) {
    console.error('Delete product error:', error.message);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'สินค้านี้ถูกใช้อ้างอิงอยู่ จึงยังไม่สามารถลบได้' });
    }
    return res.status(500).json({ error: 'ลบสินค้าไม่สำเร็จ' });
  }
});

// ตัวดัก Error ชั้นสุดท้าย เผื่อ Route ไหนไม่ได้จัดการ Error เอง
app.use((error, _req, res, _next) => {
  console.error('Unhandled request error:', error.message);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
});

// ตอนเปิด Server จะเตรียมตารางก่อน ถ้าผ่านแล้วค่อยเปิดรับ Request
ensureAuthTables()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Auth/order table initialization failed:', error.message);
    process.exitCode = 1;
  });
