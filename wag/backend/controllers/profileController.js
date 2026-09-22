const { poolPromise } = require("../config/db");
const logger = require("../utils/logger");

const profile = async (req, res) => {
  try {
    // user dari middleware
    const { id, role } = req.user || {};

    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", id)
      .query(`
        SELECT
          Id_Employee,
          nip,
          Name AS nama,
          Phone AS phone
        FROM hris_Employee
        WHERE Id_Employee = @id
      `);

    const user = result.recordset?.[0];

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    res.json({
      success: true,
      user: {
        id: user.Id_Employee,
        nip: user.nip,
        nama: user.nama,
        role,
      },
    });
  } catch (err) {
    logger.error("profile error", { err: err?.message });
    res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
  }
};

module.exports = { profile };
