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
function getPoolPromise() {
  if (!_poolPromise) {
    _poolPromise = connect().catch((error) => { _poolPromise = null; throw error; });
  }
  return _poolPromise;
}
const mysqlPool = {
  then(resolve, reject) { return getPoolPromise().then(resolve, reject); },
  catch(reject) { return getPoolPromise().catch(reject); },
  finally(callback) { return getPoolPromise().finally(callback); },
};
async function connect() {
  if (_pool) return _pool;
  try { _pool = mysql.createPool(mysqlConfig); const conn = await _pool.getConnection(); console.log("MySQL Connected"); conn.release(); return _pool; }
  catch (err) { console.error("MySQL connection error:", err?.message); throw err; }
}
async function closePool() { if (_pool) { await _pool.end(); _pool = null; } _poolPromise = null; }
function isInitialized() { return Boolean(_pool); }

module.exports = { mysqlPool, getPool: getPoolPromise, closePool, isInitialized };
