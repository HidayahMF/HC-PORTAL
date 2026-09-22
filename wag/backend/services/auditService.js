const { sql, poolPromise } = require("../config/db");
const logger = require("../utils/logger");

// Catat aksi penting. Tidak menyimpan password/token. Kegagalan audit TIDAK
// boleh mengganggu alur utama aplikasi — makanya error ditelan & di-log saja.
async function logAudit({ nip, action, target, meta, success = true }) {
  try {
    const db = await poolPromise;
    await db
      .request()
      .input("nip", sql.NVarChar(50), nip || null)
      .input("action", sql.NVarChar(100), action)
      .input("target", sql.NVarChar(255), target || null)
      .input("meta", sql.NVarChar(sql.MAX), meta ? JSON.stringify(meta) : null)
      .input("success", sql.Bit, success ? 1 : 0)
      .query(
        `INSERT INTO audit_logs (nip, action, target, meta, success)
         VALUES (@nip, @action, @target, @meta, @success)`
      );
  } catch (err) {
    logger.error("audit log failed", { action, err: err?.message });
  }
}

module.exports = { logAudit };
