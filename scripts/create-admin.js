require('dotenv').config();

const crypto = require('crypto');
const { promisify } = require('util');
const mysql = require('mysql2/promise');

const scryptAsync = promisify(crypto.scrypt);

async function createAdmin() {
  const username = String(process.env.NEW_ADMIN_USERNAME || 'admin').trim();
  const password = String(process.env.NEW_ADMIN_PASSWORD || '');
  if (username.length < 3 || password.length < 12) {
    throw new Error('Set NEW_ADMIN_USERNAME and NEW_ADMIN_PASSWORD (at least 12 characters) before running this script.');
  }

  const N = 131072;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64, { N, r, p, maxmem: 256 * 1024 * 1024 });
  const passwordHash = `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    await connection.execute(
      `INSERT INTO admin_users (username, password_hash)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1`,
      [username, passwordHash],
    );
    console.log(`Admin user "${username}" is ready.`);
  } finally {
    await connection.end();
  }
}

createAdmin().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
