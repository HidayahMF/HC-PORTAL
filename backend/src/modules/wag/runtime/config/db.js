const sql = require("mssql");
require("dotenv").config();

// Tidak ada fallback credential di sini — semua nilai WAJIB berasal dari environment.
// Jika tidak diset, validasi env di config/env.js akan gagal cepat saat startup.
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== "false",
    enableArithAbort: true,
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || "10", 10),
    min: parseInt(process.env.DB_POOL_MIN || "0", 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000", 10),
  },
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "15000", 10),
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || "30000", 10),
};

let _pool = null;
let _poolPromise = null;
function getPoolPromise() {
  if (!_poolPromise) {
    _poolPromise = connect().catch((error) => { _poolPromise = null; throw error; });
  }
  return _poolPromise;
}
const poolPromise = {
  then(resolve, reject) { return getPoolPromise().then(resolve, reject); },
  catch(reject) { return getPoolPromise().catch(reject); },
  finally(callback) { return getPoolPromise().finally(callback); },
};
async function connect() {
  if (_pool) return _pool;
  try { _pool = await new sql.ConnectionPool(config).connect(); console.log("SQL Server Connected"); return _pool; }
  catch (err) { console.error("SQL Server connection error:", err?.message); throw err; }
}
async function closePool() { if (_pool) { await _pool.close(); _pool = null; } _poolPromise = null; }
function isInitialized() { return Boolean(_pool); }

module.exports = {
  sql,
  poolPromise,
  getPool: getPoolPromise,
  closePool,
  isInitialized,
};
