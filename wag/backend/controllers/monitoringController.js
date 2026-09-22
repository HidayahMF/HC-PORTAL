const { mysqlPool } = require("../config/dbMySQL");
const logger = require("../utils/logger");

async function getSimMonitoring(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const offset = (page - 1) * limit;

    const pool = await mysqlPool;

    const whereClause = `
      WHERE k.keluar = 0
        AND (k.SIMC <> '0000-00-00' OR k.SIMA <> '0000-00-00')
        ${search ? "AND (k.NM_KAR LIKE ? OR k.telp LIKE ?)" : ""}
    `;
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM pw2.KARYAWAN k ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(
      `
        SELECT
          k.NM_KAR AS nama,
          k.telp AS no_hp,
          t.Initial AS divisi,
          IF(k.SIMC = '0000-00-00', NULL, DATE_FORMAT(k.SIMC, '%d-%m-%Y')) AS simc_tgl,
          IF(k.SIMC = '0000-00-00', NULL, DATEDIFF(k.SIMC, CURDATE())) AS simc_sisa,
          IF(k.SIMA = '0000-00-00', NULL, DATE_FORMAT(k.SIMA, '%d-%m-%Y')) AS sima_tgl,
          IF(k.SIMA = '0000-00-00', NULL, DATEDIFF(k.SIMA, CURDATE())) AS sima_sisa
        FROM pw2.KARYAWAN k
        LEFT JOIN budget.tarif t ON k.KODEF = t.kodef
        ${whereClause}
        ORDER BY LEAST(
          IF(k.SIMC = '0000-00-00', '9999-12-31', k.SIMC),
          IF(k.SIMA = '0000-00-00', '9999-12-31', k.SIMA)
        ) ASC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("[Monitoring] getSimMonitoring error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
}

module.exports = { getSimMonitoring };
