const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/db");
const { getAllowedNips, getRoleForNip } = require("../config/env");
const logger = require("../utils/logger");
const { logAudit } = require("../services/auditService");

// Pesan generik untuk semua kegagalan kredensial — mencegah user enumeration.
const GENERIC_LOGIN_FAIL = "NIP atau password salah";

// Audit login tanpa pernah menyimpan password/token.
function auditLogin(nip, success) {
  logAudit({
    nip,
    action: success ? "auth.login_success" : "auth.login_failed",
    target: `nip:${nip}`,
    success,
  });
}

const login = async (req, res) => {
  try {
    const { nip, password } = req.body;

    if (!nip || !password) {
      return res.status(400).json({
        success: false,
        message: "nip dan password wajib diisi",
      });
    }

    const normalizedNip = String(nip).trim();

    // NIP yang boleh login (dari .env) — perilaku whitelist lama dipertahankan.
    const allowedNips = getAllowedNips();

    if (!allowedNips.includes(normalizedNip)) {
      // Jangan bedakan pesan untuk NIP yang tidak diizinkan vs password salah.
      logger.info("login rejected (not whitelisted)", { nip: normalizedNip });
      auditLogin(normalizedNip, false);
      return res.status(401).json({ success: false, message: GENERIC_LOGIN_FAIL });
    }

    const db = await poolPromise;

    const result = await db
      .request()
      .input("nip", sql.VarChar, normalizedNip)
      .query(
        `
        SELECT
          Id_Employee,
          nip,
          Name AS nama,
          Phone AS phone
        FROM hris_Employee
        WHERE nip = @nip
      `
      );

    const user = result.recordset?.[0];

    // User tidak ditemukan → balas pesan generik.
    if (!user) {
      logger.info("login failed (nip not found)", { nip: normalizedNip });
      auditLogin(normalizedNip, false);
      return res.status(401).json({ success: false, message: GENERIC_LOGIN_FAIL });
    }

    // password = nomor HP (mekanisme lama dipertahankan).
    if (String(password).trim() !== String(user.phone).trim()) {
      logger.info("login failed (wrong password)", { nip: normalizedNip });
      auditLogin(normalizedNip, false);
      return res.status(401).json({ success: false, message: GENERIC_LOGIN_FAIL });
    }

    const role = getRoleForNip(normalizedNip);
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    // generate token
    const token = jwt.sign(
      {
        id: user.Id_Employee,
        nip: user.nip,
        nama: user.nama,
        role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn,
      }
    );

    logger.info("login success", { nip: normalizedNip, role });
    auditLogin(normalizedNip, true);

    res.json({
      success: true,
      token,
      user: {
        id: user.Id_Employee,
        nip: user.nip,
        nama: user.nama,
        role,
      },
    });
  } catch (error) {
    logger.error("login error", { err: error?.message });
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

module.exports = {
  login,
};
