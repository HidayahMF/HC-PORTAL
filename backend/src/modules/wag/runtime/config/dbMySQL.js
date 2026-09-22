const mysql = require("mysql2/promise");
require("dotenv").config();

// Tidak ada fallback credential di sini — semua nilai WAJIB berasal dari environment.
const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.MYSQL_POOL_LIMIT || "10", 10),
  queueLimit: 0,
  connectTimeout: parseInt(process.env.MYSQL_CONNECT_TIMEOUT || "10000", 10),
};

let _pool = null;
let _poolPromise = null;
const mysqlPool = new Proxy({}, { get(_target, property) { if (!_poolPromise) _poolPromise = connect(); return _poolPromise.then(pool => pool[property]); } });
async function connect() {
  if (_pool) return _pool;
  try { _pool = mysql.createPool(mysqlConfig); const conn = await _pool.getConnection(); console.log("MySQL Connected"); conn.release(); return _pool; }
  catch (err) { console.error("MySQL connection error:", err?.message); throw err; }
}

module.exports = { mysqlPool, getPool: connect };
