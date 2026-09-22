const { sql, poolPromise } = require("../config/db");
const { invalidateCache } = require("../utils/workingDay");
const { BadRequest } = require("../middleware/errorHandler");
const logger = require("../utils/logger");
const { logAudit } = require("../services/auditService");

// NOTE: tabel `holidays` dibuat oleh migration system (002_legacy_tables.sql),
// bukan di request path.

// Validasi format YYYY-MM-DD dan nilai tanggal riil.
function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const getAll = async (_req, res) => {
  try {
    const db = await poolPromise;
    const result = await db.request().query(`
      SELECT id, holiday_date, description, created_at
      FROM holidays
      ORDER BY holiday_date ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    logger.error("[Holidays] getAll error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const create = async (req, res) => {
  try {
    const { holiday_date, description } = req.body;
    if (!isValidDateString(holiday_date)) {
      throw BadRequest("holiday_date wajib diisi dengan format YYYY-MM-DD");
    }
    if (description !== undefined && description !== null && String(description).length > 255) {
      throw BadRequest("description maksimal 255 karakter");
    }

    const db = await poolPromise;
    const result = await db
      .request()
      .input("holiday_date", sql.Date, holiday_date)
      .input("description", sql.NVarChar(255), description || null)
      .query(`
        INSERT INTO holidays (holiday_date, description)
        OUTPUT INSERTED.id, INSERTED.holiday_date, INSERTED.description, INSERTED.created_at
        VALUES (@holiday_date, @description)
      `);

    invalidateCache();

    logAudit({
      nip: req.user?.nip,
      action: "holiday.created",
      target: `date:${holiday_date}`,
      meta: { description: description || null },
    });

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    if (error && error.expose) throw error;
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ message: "Tanggal merah sudah ada" });
    }
    logger.error("[Holidays] create error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const createBulk = async (req, res) => {
  try {
    const { holidays } = req.body;
    if (!Array.isArray(holidays) || holidays.length === 0) {
      throw BadRequest("holidays harus berupa array dan tidak boleh kosong");
    }
    if (holidays.length > 1000) {
      throw BadRequest("Terlalu banyak data (maksimal 1000)");
    }
    for (const h of holidays) {
      if (!isValidDateString(h?.holiday_date)) {
        throw BadRequest("Setiap holiday_date wajib format YYYY-MM-DD");
      }
    }

    const db = await poolPromise;
    const added = [];
    const skipped = [];

    for (const h of holidays) {
      try {
        const result = await db
          .request()
          .input("holiday_date", sql.Date, h.holiday_date)
          .input("description", sql.NVarChar(255), h.description || null)
          .query(`
            INSERT INTO holidays (holiday_date, description)
            OUTPUT INSERTED.id, INSERTED.holiday_date, INSERTED.description
            VALUES (@holiday_date, @description)
          `);
        added.push(result.recordset[0]);
      } catch (err) {
        if (err.number === 2601 || err.number === 2627) {
          skipped.push(h.holiday_date);
        } else {
          throw err;
        }
      }
    }

    invalidateCache();

    logAudit({
      nip: req.user?.nip,
      action: "holiday.bulk_import",
      target: `count:${holidays.length}`,
      meta: { added: added.length, skipped: skipped.length },
    });

    res.status(201).json({ added: added.length, skipped: skipped.length, skippedDates: skipped });
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("[Holidays] createBulk error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await poolPromise;
    const result = await db
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM holidays OUTPUT DELETED.id WHERE id = @id");

    if (result.recordset.length === 0) {
      throw new (require("../middleware/errorHandler").NotFound)("Tanggal merah tidak ditemukan");
    }

    invalidateCache();

    logAudit({
      nip: req.user?.nip,
      action: "holiday.deleted",
      target: `id:${id}`,
    });

    res.json({ message: "Tanggal merah berhasil dihapus" });
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("[Holidays] remove error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

module.exports = { getAll, create, createBulk, remove };
