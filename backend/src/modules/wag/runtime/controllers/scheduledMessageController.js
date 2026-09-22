const fs = require("fs");
const { sql, poolPromise } = require("../config/db");
const {
  registerSchedule,
  unregisterSchedule,
  persistNextRun,
} = require("../services/schedulerService");
const { isValidCron } = require("../utils/cron");
const { validatePhone } = require("../utils/phone");
const { validateFileMagic } = require("../config/upload");
const { BadRequest, NotFound } = require("../middleware/errorHandler");
const logger = require("../utils/logger");
const { logAudit } = require("../services/auditService");

const MAX_MESSAGE_LENGTH = 4000;
const MAX_RECIPIENTS = 5000;

function parseRecipients(raw) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

// Validasi bersama untuk create/update.
function validateScheduleInput({ name, message, recipients, cron_expression }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return "name wajib diisi";
  }
  if (name.length > 255) return "name terlalu panjang (maksimal 255 karakter)";
  if (!message || typeof message !== "string" || !message.trim()) {
    return "message wajib diisi";
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `message terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter)`;
  }
  if (!cron_expression || typeof cron_expression !== "string") {
    return "cron_expression wajib diisi";
  }
  if (!isValidCron(cron_expression)) {
    return `Cron expression tidak valid: "${cron_expression}"`;
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return "recipients harus berupa array dan tidak boleh kosong";
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return `Terlalu banyak penerima (maksimal ${MAX_RECIPIENTS})`;
  }
  for (const r of recipients) {
    if (!r || typeof r !== "object") return "recipients berisi data tidak valid";
    const { valid } = validatePhone(r.no_hp);
    if (!valid) return `Nomor HP tidak valid untuk penerima ${r.nama || r.no_hp || "?"}`;
  }
  return null;
}

const getAll = async (req, res) => {
  try {
    const db = await poolPromise;

    // NOTE: kolom only_working_days ditangani migration system (002_legacy_tables.sql).

    const result = await db.request().query(`
      SELECT
        id,
        name,
        message,
        recipients,
        cron_expression,
        file_path,
        file_mimetype,
        is_active,
        only_working_days,
        last_run,
        next_run,
        created_at,
        updated_at
      FROM scheduled_messages
      ORDER BY created_at DESC
    `);

    const schedules = result.recordset.map((s) => ({
      ...s,
      recipients:
        typeof s.recipients === "string" ? safeParse(s.recipients) : s.recipients,
    }));

    res.json(schedules);
  } catch (error) {
    logger.error("[ScheduledMsg] getAll error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await poolPromise;
    const result = await db
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT
          id,
          name,
          message,
          recipients,
          cron_expression,
          file_path,
          file_mimetype,
          is_active,
          only_working_days,
          last_run,
          next_run,
          created_at,
          updated_at
        FROM scheduled_messages
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      throw NotFound("Jadwal tidak ditemukan");
    }

    const schedule = result.recordset[0];
    schedule.recipients =
      typeof schedule.recipients === "string"
        ? safeParse(schedule.recipients)
        : schedule.recipients;

    res.json(schedule);
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("[ScheduledMsg] getById error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

function deleteFileIfExists(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
}

const create = async (req, res) => {
  try {
    let { name, message, recipients, cron_expression, is_active, only_working_days } = req.body;
    recipients = parseRecipients(recipients);

    const validationError = validateScheduleInput({ name, message, recipients, cron_expression });
    if (validationError) throw BadRequest(validationError);

    const filePath = req.file?.path || null;
    const fileMimetype = req.file?.mimetype || null;

    if (req.file && !validateFileMagic(req.file.path, req.file.mimetype)) {
      deleteFileIfExists(req.file.path);
      throw BadRequest("Isi file tidak sesuai dengan tipe yang diklaim");
    }

    const db = await poolPromise;
    const result = await db
      .request()
      .input("name", sql.NVarChar(255), name.trim())
      .input("message", sql.NVarChar(sql.MAX), message.trim())
      .input("recipients", sql.NVarChar(sql.MAX), JSON.stringify(recipients))
      .input("cron_expression", sql.NVarChar(100), cron_expression.trim())
      .input("file_path", sql.NVarChar(500), filePath)
      .input("file_mimetype", sql.NVarChar(100), fileMimetype)
      .input("is_active", sql.Bit, is_active !== false ? 1 : 0)
      .input("only_working_days", sql.Bit, only_working_days ? 1 : 0)
      .query(`
        INSERT INTO scheduled_messages (name, message, recipients, cron_expression, file_path, file_mimetype, is_active, only_working_days)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.message, INSERTED.recipients,
               INSERTED.cron_expression, INSERTED.file_path, INSERTED.file_mimetype,
               INSERTED.is_active, INSERTED.only_working_days, INSERTED.created_at
        VALUES (@name, @message, @recipients, @cron_expression, @file_path, @file_mimetype, @is_active, @only_working_days)
      `);

    const newSchedule = result.recordset[0];
    newSchedule.recipients = safeParse(newSchedule.recipients);

    registerSchedule({
      ...newSchedule,
      is_active: !!newSchedule.is_active,
    });

    logAudit({
      nip: req.user?.nip,
      action: "scheduled_message.created",
      target: `schedule:${newSchedule.id}`,
      meta: { name: newSchedule.name, cron: newSchedule.cron_expression, hasFile: !!filePath },
    });

    res.status(201).json(newSchedule);
  } catch (error) {
    // Validasi / DB insert gagal: hapus file upload baru agar tidak jadi orphan.
    if (req.file && req.file.path) {
      deleteFileIfExists(req.file.path);
    }
    if (error && error.expose) throw error;
    logger.error("[ScheduledMsg] create error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, message, recipients, cron_expression, is_active, only_working_days, remove_file } = req.body;
    recipients = parseRecipients(recipients);

    const validationError = validateScheduleInput({ name, message, recipients, cron_expression });
    if (validationError) throw BadRequest(validationError);

    const db = await poolPromise;

    // Ambil record lama untuk handle file & only_working_days default.
    const existing = await db
      .request()
      .input("id", sql.Int, id)
      .query("SELECT file_path, only_working_days FROM scheduled_messages WHERE id = @id");

    if (existing.recordset.length === 0) {
      throw NotFound("Jadwal tidak ditemukan");
    }

    let filePath = null;
    let fileMimetype = null;

    if (req.file) {
      // File baru — hapus file lama.
      if (existing.recordset[0].file_path) {
        deleteFileIfExists(existing.recordset[0].file_path);
      }
      if (!validateFileMagic(req.file.path, req.file.mimetype)) {
        deleteFileIfExists(req.file.path);
        throw BadRequest("Isi file tidak sesuai dengan tipe yang diklaim");
      }
      filePath = req.file.path;
      fileMimetype = req.file.mimetype;
    } else if (remove_file === "true" || remove_file === true) {
      // Hapus file yang ada.
      if (existing.recordset[0].file_path) {
        deleteFileIfExists(existing.recordset[0].file_path);
      }
      filePath = null;
      fileMimetype = null;
    } else {
      // Pertahankan file lama.
      filePath = existing.recordset[0].file_path || null;
    }

    const result = await db
      .request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar(255), name.trim())
      .input("message", sql.NVarChar(sql.MAX), message.trim())
      .input("recipients", sql.NVarChar(sql.MAX), JSON.stringify(recipients))
      .input("cron_expression", sql.NVarChar(100), cron_expression.trim())
      .input("file_path", sql.NVarChar(500), filePath)
      .input("file_mimetype", sql.NVarChar(100), fileMimetype)
      .input("is_active", sql.Bit, is_active !== false ? 1 : 0)
      .input(
        "only_working_days",
        sql.Bit,
        only_working_days !== undefined ? (only_working_days ? 1 : 0) : existing.recordset[0].only_working_days || 0
      )
      .query(`
        UPDATE scheduled_messages
        SET name = @name,
            message = @message,
            recipients = @recipients,
            cron_expression = @cron_expression,
            file_path = @file_path,
            file_mimetype = @file_mimetype,
            is_active = @is_active,
            only_working_days = @only_working_days,
            updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.message, INSERTED.recipients,
               INSERTED.cron_expression, INSERTED.file_path, INSERTED.file_mimetype,
               INSERTED.is_active, INSERTED.only_working_days, INSERTED.created_at
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      throw NotFound("Jadwal tidak ditemukan");
    }

    const updated = result.recordset[0];
    updated.recipients = safeParse(updated.recipients);

    registerSchedule({
      ...updated,
      is_active: !!updated.is_active,
    });

    logAudit({
      nip: req.user?.nip,
      action: "scheduled_message.updated",
      target: `schedule:${updated.id}`,
      meta: { name: updated.name, cron: updated.cron_expression },
    });

    res.json(updated);
  } catch (error) {
    // Validasi / DB update gagal: hapus file upload baru agar tidak jadi orphan.
    // File lama aman — hanya file baru yang dihapus, bukan yang sedang dipakai job lain.
    if (req.file && req.file.path) {
      deleteFileIfExists(req.file.path);
    }
    if (error && error.expose) throw error;
    logger.error("[ScheduledMsg] update error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await poolPromise;

    // Ambil file_path sebelum delete.
    const existing = await db
      .request()
      .input("id", sql.Int, id)
      .query("SELECT file_path FROM scheduled_messages WHERE id = @id");

    const result = await db
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM scheduled_messages OUTPUT DELETED.id WHERE id = @id");

    if (result.recordset.length === 0) {
      throw NotFound("Jadwal tidak ditemukan");
    }

    // Hapus file terkait.
    if (existing.recordset.length > 0 && existing.recordset[0].file_path) {
      deleteFileIfExists(existing.recordset[0].file_path);
    }

    unregisterSchedule(Number(id));

    logAudit({
      nip: req.user?.nip,
      action: "scheduled_message.deleted",
      target: `schedule:${id}`,
    });

    res.json({ message: "Jadwal berhasil dihapus" });
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("[ScheduledMsg] remove error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await poolPromise;
    const result = await db
      .request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE scheduled_messages
        SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
            updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.message, INSERTED.recipients,
               INSERTED.cron_expression, INSERTED.file_path, INSERTED.file_mimetype,
               INSERTED.is_active, INSERTED.only_working_days
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      throw NotFound("Jadwal tidak ditemukan");
    }

    const updated = result.recordset[0];
    updated.recipients =
      typeof updated.recipients === "string"
        ? safeParse(updated.recipients)
        : updated.recipients;

    if (updated.is_active) {
      registerSchedule({
        ...updated,
        is_active: true,
      });
    } else {
      unregisterSchedule(Number(id));
    }

    logAudit({
      nip: req.user?.nip,
      action: updated.is_active ? "scheduled_message.activated" : "scheduled_message.deactivated",
      target: `schedule:${id}`,
      meta: { name: updated.name },
    });

    res.json(updated);
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("[ScheduledMsg] toggleActive error:", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  toggleActive,
};
