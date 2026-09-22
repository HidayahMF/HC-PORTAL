const { poolPromise } = require("../config/db");
const logger = require("../utils/logger");
const fs = require("fs");
const { validateFileMagic } = require("../config/upload");
const {
  createJob,
  getJob,
  getJobDeliveries,
} = require("../services/jobQueueService");
const { BadRequest, NotFound } = require("../middleware/errorHandler");
const { logAudit } = require("../services/auditService");

const getEmployees = async (req, res) => {
  try {
    const db = await poolPromise;

    // NOTE: filter `is_Active = 1` TIDAK dipakai karena keberadaan kolom belum
    // terverifikasi terhadap schema aktual (lihat docs/FIX_REPORT.md, BLOCKED).
    // Perilaku lama dipertahankan: semua karyawan dikembalikan.
    let result;
    try {
      result = await db.request().query(`
        SELECT
          Id_Employee AS id,
          nip,
          Name AS nama,
          Phone AS no_hp,
          Department AS divisi
        FROM hris_Employee
      `);
    } catch {
      result = await db.request().query(`
        SELECT
          Id_Employee AS id,
          nip,
          Name AS nama,
          Phone AS no_hp
        FROM hris_Employee
      `);
    }

    res.json(result.recordset);
  } catch (error) {
    logger.error("getEmployees error", { err: error.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// Broadcast dibuat sebagai JOB; worker mengirim asinkron dengan retry & history.
const sendBroadcast = async (req, res) => {
  try {
    const { message } = req.body;
    const nip = req.user?.nip;

    let employees = req.body.employees;
    if (typeof employees === "string") {
      try {
        employees = JSON.parse(employees);
      } catch {
        // tetap string → akan gagal validasi di bawah
      }
    }

    if (typeof message !== "string" || !message.trim()) {
      throw BadRequest("message wajib berupa string dan tidak boleh kosong");
    }
    if (!Array.isArray(employees) || employees.length === 0) {
      throw BadRequest("employees wajib berupa array dan tidak boleh kosong");
    }
    if (message.length > 4000) {
      throw BadRequest("Pesan terlalu panjang (maksimal 4000 karakter)");
    }
    if (employees.length > 5000) {
      throw BadRequest("Terlalu banyak penerima (maksimal 5000)");
    }

    // Validasi magic bytes: isi file harus cocok dengan tipe yang diklaim.
    if (req.file && !validateFileMagic(req.file.path, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      throw BadRequest("Isi file tidak sesuai dengan tipe yang diklaim");
    }

    const job = await createJob({
      type: "broadcast",
      message: message.trim(),
      recipients: employees,
      filePath: req.file?.path || null,
      fileMimetype: req.file?.mimetype || null,
      createdByNip: nip,
    });

    // Duplicate job terdeteksi (idempotency): job lama yang dipakai,
    // file upload dari request ini TIDAK dipakai — wajib dibersihkan.
    if (req.file && job && job.file_path !== req.file.path) {
      fs.unlink(req.file.path, () => {});
      logger.info("cleaned unused upload on duplicate job", { jobId: job.id });
    }

    logAudit({
      nip,
      action: "broadcast.created",
      target: `job:${job.id}`,
      meta: { total: job.total_count, hasFile: !!req.file },
    });

    res.status(201).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: "Broadcast dijadwalkan dan sedang diproses",
    });
  } catch (error) {
    // Validasi / DB insert gagal: hapus file upload agar tidak jadi orphan.
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    if (error && error.expose) throw error;
    logger.error("sendBroadcast error", { err: error?.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const getJobStatus = async (req, res) => {
  try {
    const job = await getJob(req.params.id);
    if (!job) throw NotFound("Job tidak ditemukan");

    // Sembunyikan recipients mentah (bisa berisi data pribadi) dari respons ini.
    res.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        total_count: job.total_count,
        success_count: job.success_count,
        failed_count: job.failed_count,
        created_at: job.created_at,
        started_at: job.started_at,
        finished_at: job.finished_at,
        error_message: job.error_message,
      },
    });
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("getJobStatus error", { err: error?.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const getJobRecipients = async (req, res) => {
  try {
    const job = await getJob(req.params.id);
    if (!job) throw NotFound("Job tidak ditemukan");

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);

    const result = await getJobDeliveries(job.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    if (error && error.expose) throw error;
    logger.error("getJobRecipients error", { err: error?.message });
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

module.exports = {
  getEmployees,
  sendBroadcast,
  getJobStatus,
  getJobRecipients,
};
