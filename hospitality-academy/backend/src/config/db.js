import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const pool = mariadb.createPool({
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'hospitality_academy',
  connectionLimit: 10,
  acquireTimeout: 30000,
  bigIntAsNumber: true,
  dateStrings: true,
  // Managed MySQL providers (Aiven, PlanetScale, Railway, ...) usually require TLS.
  ...(process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {})
});

export async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sql, params);
    return rows;
  } finally {
    if (conn) conn.release();
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, params);
    // mariadb returns OK-packet insertId as a BigInt even with bigIntAsNumber
    // enabled, which breaks JSON.stringify and jwt.sign. IDs are INT columns.
    return { affectedRows: Number(result.affectedRows), insertId: Number(result.insertId) };
  } finally {
    if (conn) conn.release();
  }
}

export default pool;
