const { sql, getPool } = require('../../../config/database.js');

/**
 * Parameterized query. Semua binding input WAJIB lewat params
 * (menggantikan interpolasi string di M_hris/hris.php yang rawan injection).
 * Memakai pool SQL Server bersama milik backend HC-PORTAL.
 */
async function query(text, params = {}) {
  const p = await getPool();
  const request = p.request();
  for (const [name, value] of Object.entries(params)) {
    request.input(name, value);
  }
  const result = await request.query(text);
  return result.recordset;
}

async function queryOne(text, params = {}) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/** Untuk batch multi-statement (generate_cuti mengirim 2 insert sekaligus). */
async function execute(text, params = {}) {
  const p = await getPool();
  const request = p.request();
  for (const [name, value] of Object.entries(params)) {
    request.input(name, value);
  }
  return request.query(text);
}

module.exports = { getPool, query, queryOne, execute, sql };
