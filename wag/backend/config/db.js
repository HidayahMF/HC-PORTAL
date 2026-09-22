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

const poolPromise = (async () => {
  if (_pool) return _pool;
  try {
    _pool = await new sql.ConnectionPool(config).connect();
    // eslint-disable-next-line no-console
    console.log("SQL Server Connected");
    return _pool;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("SQL Server connection error:", err?.message);
    throw err;
  }
})();

module.exports = {
  sql,
  poolPromise,
};
