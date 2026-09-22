const { sql, poolPromise } = require("../config/db");
const { mysqlPool } = require("../config/dbMySQL");
const { sendWhatsApp } = require("../services/whatsappService");
const { isWorkingDay } = require("../utils/workingDay");
const { validatePhone } = require("../utils/phone");
const { fillTemplate } = require("../utils/template");
const { BadRequest } = require("../middleware/errorHandler");
const logger = require("../utils/logger");
const { logAudit } = require("../services/auditService");

const TEMPLATES = {
  simc:
    "Yth. Bapak/Ibu {{nama}},\n\nKami informasikan bahwa Surat Izin Mengemudi (SIM C) Anda akan habis masa berlakunya pada {{tanggal}}.\n\nMohon untuk segera memperpanjang SIM C Anda agar tetap dapat berkendara dengan legal.\n\nTerima kasih.",
  sima:
    "Yth. Bapak/Ibu {{nama}},\n\nKami informasikan bahwa Surat Izin Mengemudi (SIM A) Anda akan habis masa berlakunya pada {{tanggal}}.\n\nMohon untuk segera memperpanjang SIM A Anda agar tetap dapat berkendara dengan legal.\n\nTerima kasih.",
};

function createSimController(type) {
  const TABLE = `${type}_config`;
  const COL = type === "simc" ? "simC" : "simA";
  const LOG = type.toUpperCase();
  const DEFAULT_TEMPLATE = TEMPLATES[type];

  let _onConfigChange = null;

  // NOTE: pembuatan tabel & seed default ditangani migration system
  // (backend/migrations/002_legacy_tables.sql) — tidak ada schema mutation di request path.

  async function getConfig() {
    const db = await poolPromise;
    const result = await db.request().query(`SELECT TOP 1 * FROM ${TABLE} ORDER BY id ASC`);
    return result.recordset[0] || null;
  }

  const getConfigHandler = async (_req, res) => {
    try {
      const config = await getConfig();
      res.json(config);
    } catch (error) {
      logger.error("getConfig error", { type: LOG, err: error.message });
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  };

  // Validasi nilai konfigurasi agar jadwal tidak meleset / merusak data.
  function validateConfig(body) {
    const { days_before, send_hour, send_minute, message_template } = body;
    if (days_before !== undefined && (!Number.isInteger(Number(days_before)) || Number(days_before) < 1 || Number(days_before) > 365)) {
      return "days_before harus angka antara 1 dan 365";
    }
    if (send_hour !== undefined && (!Number.isInteger(Number(send_hour)) || Number(send_hour) < 0 || Number(send_hour) > 23)) {
      return "send_hour harus angka antara 0 dan 23";
    }
    if (send_minute !== undefined && (!Number.isInteger(Number(send_minute)) || Number(send_minute) < 0 || Number(send_minute) > 59)) {
      return "send_minute harus angka antara 0 dan 59";
    }
    if (message_template !== undefined && (typeof message_template !== "string" || message_template.length > 8000)) {
      return "message_template harus string maksimal 8000 karakter";
    }
    return null;
  }

  const updateConfigHandler = async (req, res) => {
    try {
      const { days_before, send_hour, send_minute, message_template, is_active, only_working_days } = req.body;

      const validationError = validateConfig(req.body);
      if (validationError) throw BadRequest(validationError);

      const db = await poolPromise;

      const existing = await getConfig();
      if (!existing) {
        await db
          .request()
          .input("days_before", sql.Int, days_before ?? 15)
          .input("send_hour", sql.Int, send_hour ?? 8)
          .input("send_minute", sql.Int, send_minute ?? 0)
          .input("message_template", sql.NVarChar(sql.MAX), message_template || DEFAULT_TEMPLATE)
          .input("is_active", sql.Bit, is_active !== undefined ? (is_active ? 1 : 0) : 1)
          .input("only_working_days", sql.Bit, only_working_days !== undefined ? (only_working_days ? 1 : 0) : 0)
          .query(`
            INSERT INTO ${TABLE} (days_before, send_hour, send_minute, message_template, is_active, only_working_days)
            VALUES (@days_before, @send_hour, @send_minute, @message_template, @is_active, @only_working_days)
          `);
      } else {
        await db
          .request()
          .input("id", sql.Int, existing.id)
          .input("days_before", sql.Int, days_before ?? existing.days_before)
          .input("send_hour", sql.Int, send_hour ?? existing.send_hour)
          .input("send_minute", sql.Int, send_minute ?? existing.send_minute)
          .input("message_template", sql.NVarChar(sql.MAX), message_template || existing.message_template)
          .input("is_active", sql.Bit, is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active)
          .input("only_working_days", sql.Bit, only_working_days !== undefined ? (only_working_days ? 1 : 0) : existing.only_working_days || 0)
          .query(`
            UPDATE ${TABLE}
            SET days_before = @days_before,
                send_hour = @send_hour,
                send_minute = @send_minute,
                message_template = @message_template,
                is_active = @is_active,
                only_working_days = @only_working_days,
                updated_at = GETDATE()
            WHERE id = @id
          `);
      }

      const updated = await getConfig();
      if (_onConfigChange) _onConfigChange();

      logAudit({
        nip: req.user?.nip,
        action: "sim_config.updated",
        target: type,
        meta: { days_before: updated.days_before, send_hour: updated.send_hour, send_minute: updated.send_minute, is_active: updated.is_active, only_working_days: updated.only_working_days },
      });

      res.json(updated);
    } catch (error) {
      if (error && error.expose) throw error;
      logger.error("updateConfig error", { type: LOG, err: error.message });
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  };

  async function fetchExpiringFromMySQL(days) {
    const pool = await mysqlPool;
    const [rows] = await pool.query(
      `
        SELECT
          k.NM_KAR AS nama,
          k.${COL} AS sim_date,
          DATE_FORMAT(k.${COL}, '%d-%m-%Y') AS tgl,
          k.telp AS no_hp,
          t.Initial AS divisi,
          DATEDIFF(k.${COL}, CURDATE()) AS sisa_hari
        FROM pw2.KARYAWAN k
        LEFT JOIN budget.tarif t ON k.KODEF = t.kodef
        WHERE k.keluar = 0
          AND k.${COL} <> '0000-00-00'
          AND k.${COL} BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY k.${COL} ASC
      `,
      [days]
    );
    return rows;
  }

  const getExpiringEmployees = async (req, res) => {
    try {
      const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 15));
      const rows = await fetchExpiringFromMySQL(days);
      res.json(rows);
    } catch (error) {
      logger.error("getExpiringEmployees error", { type: LOG, err: error.message });
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  };

  const testSend = async (req, res) => {
    try {
      const { employees, message } = req.body;
      if (!Array.isArray(employees) || employees.length === 0) {
        throw BadRequest("Pilih minimal satu karyawan");
      }
      if (typeof message !== "string" || !message.trim()) {
        throw BadRequest("Pesan wajib diisi");
      }
      if (message.length > 4000) {
        throw BadRequest("Pesan terlalu panjang (maksimal 4000 karakter)");
      }
      if (employees.length > 500) {
        throw BadRequest("Terlalu banyak penerima untuk test send (maksimal 500)");
      }

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const results = [];

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const { valid, phone } = validatePhone(emp.no_hp);

        if (!valid) {
          results.push({ nama: emp.nama, status: "failed", error: "No HP tidak valid" });
          continue;
        }

        const finalMsg = fillTemplate(message, emp);

        try {
          await sendWhatsApp(phone, finalMsg);
          results.push({ nama: emp.nama, status: "success" });
        } catch (err) {
          results.push({ nama: emp.nama, status: "failed", error: "Gagal mengirim pesan" });
        }

        if (i < employees.length - 1) await sleep(10000);
      }

      const success = results.filter((r) => r.status === "success").length;

      logAudit({
        nip: req.user?.nip,
        action: "sim.test_send",
        target: type,
        meta: { total: results.length, success },
      });

      res.json({
        success: success > 0,
        summary: { total: results.length, success, failed: results.length - success },
        results,
      });
    } catch (error) {
      if (error && error.expose) throw error;
      logger.error("testSend error", { type: LOG, err: error.message });
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  };

  async function executeAutoSend(overrideDays) {
    const config = await getConfig();
    if (!config || !config.is_active) return;

    if (config.only_working_days) {
      const working = await isWorkingDay();
      if (!working) {
        logger.info("Auto-send skipped: today is not a working day", { type: LOG });
        return;
      }
    }

    const days = overrideDays || config.days_before;
    logger.info("Auto-send running", { type: LOG, days_before: days });

    const employees = await fetchExpiringFromMySQL(days);
    if (employees.length === 0) {
      logger.info("No expiring employees found", { type: LOG });
      return;
    }

    logger.info("Auto-send sending", { type: LOG, count: employees.length });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const { valid, phone } = validatePhone(emp.no_hp);

      if (!valid) {
        failedCount++;
        continue;
      }

      const finalMsg = fillTemplate(config.message_template, emp);

      try {
        await sendWhatsApp(phone, finalMsg);
        successCount++;
      } catch (err) {
        failedCount++;
        logger.error("Auto-send failed", { type: LOG, nama: emp.nama, err: err.message });
      }

      if (i < employees.length - 1) await sleep(10000);
    }

    const db = await poolPromise;
    await db
      .request()
      .input("last_run", sql.DateTime, new Date())
      .query(`UPDATE ${TABLE} SET last_run = @last_run, updated_at = GETDATE()`);

    logger.info("Auto-send done", { type: LOG, success: successCount, failed: failedCount });
  }

  const triggerAutoSend = async (req, res) => {
    try {
      const days = parseInt(req.body?.days, 10) || undefined;
      if (days !== undefined && (days < 1 || days > 365)) {
        throw BadRequest("days harus angka antara 1 dan 365");
      }
      await executeAutoSend(days);
      const config = await getConfig();

      logAudit({
        nip: req.user?.nip,
        action: "sim.manual_trigger",
        target: type,
        meta: { days: days || null },
      });

      res.json({ message: `Auto-send ${type} triggered`, config });
    } catch (error) {
      if (error && error.expose) throw error;
      logger.error("triggerAutoSend error", { type: LOG, err: error.message });
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  };

  return {
    getConfig,
    getConfigHandler,
    updateConfigHandler,
    getExpiringEmployees,
    testSend,
    executeAutoSend,
    triggerAutoSend,
    setOnConfigChange: (cb) => {
      _onConfigChange = cb;
    },
  };
}

module.exports = {
  createSimController,
};
