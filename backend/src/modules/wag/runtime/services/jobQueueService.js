const fs = require("fs");
const crypto = require("crypto");
const { sql, poolPromise } = require("../config/db");
const logger = require("../utils/logger");
const { sendWhatsApp, sendWhatsAppWithMedia } = require("./whatsappService");
const { validatePhone } = require("../utils/phone");
const { logAudit } = require("./auditService");

const INTERVAL_MS = 10 * 1000; // jeda antar penerima (perilaku lama dipertahankan)
const MAX_ATTEMPTS = 2; // 1 percobaan awal + 1 retry
const IDLE_POLL_MS = 5000;
const DUP_WINDOW_MIN = 5; // jendela deteksi broadcast duplikat (menit)

let workerActive = false;
let workerRunning = false;

// --- Helper DB ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryJobById(db, id) {
  const result = await db
    .request()
    .input("id", sql.Int, id)
    .query("SELECT * FROM message_jobs WHERE id = @id");
  return result.recordset[0] || null;
}

// --- API public ---

// Buat job pengiriman. Idempotent untuk jadwal (satu key per hari per jadwal).
// Broadcast diberi key hash payload agar duplikat dalam jendela waktu pendek
// mengembalikan job yang sama (anti double-click / retry ganda).
async function createJob({
  type,
  message,
  recipients,
  filePath,
  fileMimetype,
  createdByNip,
  scheduleId,
  idempotencyKey,
}) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("message wajib berupa string dan tidak boleh kosong");
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("recipients wajib berupa array dan tidak boleh kosong");
  }

  const db = await poolPromise;

  // Dedupe penerima berdasarkan nomor HP ternormalisasi (perilaku baru yang aman:
  // penerima duplikat dalam satu job dikirim satu kali saja).
  const seen = new Map();
  for (const r of recipients) {
    if (!r || typeof r !== "object") continue;
    const { valid, phone } = validatePhone(r.no_hp);
    const key = valid ? phone : String(r.no_hp || "");
    if (!key || seen.has(key)) continue;
    seen.set(key, r);
  }
  const uniqueRecipients = Array.from(seen.values());
  if (uniqueRecipients.length === 0) {
    throw new Error("Tidak ada nomor HP valid pada daftar penerima");
  }

  let key = idempotencyKey;
  if (type === "broadcast" && !key) {
    const hash = crypto
      .createHash("sha1")
      .update(
        [
          message.trim(),
          JSON.stringify(uniqueRecipients.map((r) => r.no_hp).sort()),
          fileMimetype || "",
          createdByNip || "",
        ].join("|")
      )
      .digest("hex");
    key = `broadcast-${hash}`;

    // Jika job identik masih dalam proses (queued/running) dalam jendela waktu,
    // kembalikan job tersebut — jangan buat duplikat.
    const dup = await db
      .request()
      .input("key", sql.NVarChar(200), key)
      .input("minutes", sql.Int, DUP_WINDOW_MIN)
      .query(
        `SELECT TOP 1 * FROM message_jobs
         WHERE idempotency_key = @key
           AND status IN ('queued', 'running')
           AND created_at > DATEADD(MINUTE, -@minutes, GETDATE())
         ORDER BY id DESC`
      );
    if (dup.recordset.length > 0) {
      logger.info("duplicate broadcast job detected, returning existing", { jobId: dup.recordset[0].id });
      return dup.recordset[0];
    }
  }

  let job;
  try {
    const result = await db
      .request()
      .input("type", sql.NVarChar(50), type)
      .input("status", sql.NVarChar(20), "queued")
      .input("message", sql.NVarChar(sql.MAX), message)
      .input("recipients", sql.NVarChar(sql.MAX), JSON.stringify(uniqueRecipients))
      .input("file_path", sql.NVarChar(500), filePath || null)
      .input("file_mimetype", sql.NVarChar(100), fileMimetype || null)
      .input("total_count", sql.Int, uniqueRecipients.length)
      .input("created_by_nip", sql.NVarChar(50), createdByNip || null)
      .input("schedule_id", sql.Int, scheduleId || null)
      .input("idempotency_key", sql.NVarChar(200), key || null)
      .query(
        `INSERT INTO message_jobs
           (type, status, message, recipients, file_path, file_mimetype,
            total_count, created_by_nip, schedule_id, idempotency_key)
         OUTPUT INSERTED.id, INSERTED.type, INSERTED.status, INSERTED.message,
                INSERTED.recipients, INSERTED.file_path, INSERTED.file_mimetype,
                INSERTED.total_count, INSERTED.created_by_nip, INSERTED.schedule_id,
                INSERTED.idempotency_key, INSERTED.error_message,
                INSERTED.created_at, INSERTED.started_at, INSERTED.finished_at,
                INSERTED.success_count, INSERTED.failed_count
         VALUES (@type, @status, @message, @recipients, @file_path, @file_mimetype,
                 @total_count, @created_by_nip, @schedule_id, @idempotency_key)`
      );

    job = result.recordset[0];
    logger.info("job created", { jobId: job.id, type, total: job.total_count });
  } catch (insertErr) {
    if (insertErr.message && insertErr.message.includes("UQ_message_jobs_idempotency") && key) {
      const existing = await db
        .request()
        .input("key", sql.NVarChar(200), key)
        .query(
          `SELECT TOP 1 * FROM message_jobs WHERE idempotency_key = @key ORDER BY id DESC`
        );
      if (existing.recordset.length > 0) {
        logger.info("race condition caught, returning existing job", { jobId: existing.recordset[0].id });
        return existing.recordset[0];
      }
    }
    throw insertErr;
  }

  // Daftarkan semua penerima sebagai delivery row (status queued).
  for (const r of uniqueRecipients) {
    const { valid, phone } = validatePhone(r.no_hp);
    await db
      .request()
      .input("job_id", sql.Int, job.id)
      .input("recipient_name", sql.NVarChar(255), r.nama || null)
      .input("phone", sql.NVarChar(20), valid ? phone : String(r.no_hp || "").slice(0, 20))
      .query(
        `INSERT INTO message_deliveries (job_id, recipient_name, phone, status)
         VALUES (@job_id, @recipient_name, @phone, 'queued')`
      );
  }

  return job;
}

async function getJob(jobId) {
  const db = await poolPromise;
  return queryJobById(db, jobId);
}

async function getJobDeliveries(jobId, { page = 1, limit = 50 } = {}) {
  const db = await poolPromise;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const totalResult = await db
    .request()
    .input("job_id", sql.Int, jobId)
    .query("SELECT COUNT(*) AS total FROM message_deliveries WHERE job_id = @job_id");
  const total = totalResult.recordset[0]?.total || 0;

  const result = await db
    .request()
    .input("job_id", sql.Int, jobId)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limitNum)
    .query(
      `SELECT id, job_id, recipient_name, phone, status, attempt,
              error_code, error_message, queued_at, started_at, sent_at, failed_at
       FROM message_deliveries
       WHERE job_id = @job_id
       ORDER BY id
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
    );

  return {
    data: result.recordset,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

async function listJobs({ page = 1, limit = 20, type, status } = {}) {
  const db = await poolPromise;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let where = "WHERE 1=1";
  const request = db.request();
  if (type) {
    where += " AND type = @type";
    request.input("type", sql.NVarChar(50), type);
  }
  if (status) {
    where += " AND status = @status";
    request.input("status", sql.NVarChar(20), status);
  }

  const totalResult = await request.query(`SELECT COUNT(*) AS total FROM message_jobs ${where}`);
  const total = totalResult.recordset[0]?.total || 0;

  const result = await request.query(
    `SELECT id, type, status, total_count, success_count, failed_count,
            created_by_nip, schedule_id, created_at, started_at, finished_at, error_message
     FROM message_jobs ${where}
     ORDER BY id DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
  );

  return {
    data: result.recordset,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

// --- Worker ---

async function claimNextJob() {
  const db = await poolPromise;
  const result = await db
    .request()
    .query(
      `UPDATE TOP (1) message_jobs
       SET status = 'running', started_at = GETDATE()
       OUTPUT INSERTED.id, INSERTED.type, INSERTED.status, INSERTED.message,
              INSERTED.recipients, INSERTED.file_path, INSERTED.file_mimetype,
              INSERTED.total_count, INSERTED.created_by_nip, INSERTED.schedule_id,
              INSERTED.idempotency_key, INSERTED.created_at, INSERTED.started_at
       WHERE status = 'queued'`
    );
  return result.recordset[0] || null;
}

async function updateDeliveryStatus(deliveryId, { status, attempt, errorCode, errorMessage, sentAt, failedAt }) {
  const db = await poolPromise;
  await db
    .request()
    .input("id", sql.Int, deliveryId)
    .input("status", sql.NVarChar(20), status)
    .input("attempt", sql.Int, attempt ?? null)
    .input("error_code", sql.NVarChar(50), errorCode || null)
    .input("error_message", sql.NVarChar(500), errorMessage ? String(errorMessage).slice(0, 500) : null)
    .input("sent_at", sql.DateTime, sentAt || null)
    .input("failed_at", sql.DateTime, failedAt || null)
    .query(
      `UPDATE message_deliveries
       SET status = @status,
           attempt = COALESCE(@attempt, attempt),
           error_code = @error_code,
           error_message = @error_message,
           sent_at = COALESCE(@sent_at, sent_at),
           failed_at = COALESCE(@failed_at, failed_at)
       WHERE id = @id`
    );
}

async function getDeliveryAttempt(deliveryId) {
  const db = await poolPromise;
  const result = await db
    .request()
    .input("id", sql.Int, deliveryId)
    .query("SELECT attempt, status FROM message_deliveries WHERE id = @id");
  return result.recordset[0] || null;
}

async function sendToRecipient(emp, job) {
  const { valid, phone } = validatePhone(emp?.no_hp);
  if (!valid) {
    const err = new Error("No HP tidak valid");
    err.code = "INVALID_PHONE";
    throw err;
  }
  if (job.file_path && fs.existsSync(job.file_path)) {
    await sendWhatsAppWithMedia(phone, job.message, job.file_path, job.file_mimetype);
  } else {
    await sendWhatsApp(phone, job.message);
  }
  return phone;
}

function errorCodeOf(err) {
  return err?.code || "SEND_FAILED";
}

async function processJob(job) {
  let recipients = [];
  try {
    recipients = JSON.parse(job.recipients || "[]");
  } catch (err) {
    recipients = [];
  }

  logger.info("processing job", { jobId: job.id, total: recipients.length });
  const hasBroadcastFile = job.type === "broadcast" && !!job.file_path;

  // Audit: job mulai diproses worker.
  logAudit({
    nip: job.created_by_nip,
    action: `${job.type}.started`,
    target: `job:${job.id}`,
    meta: { total: recipients.length },
  });

  // Ambil semua delivery rows untuk job ini (sudah dibuat saat createJob).
  const db = await poolPromise;
  const deliveryRows = await db
    .request()
    .input("job_id", sql.Int, job.id)
    .query("SELECT id, phone FROM message_deliveries WHERE job_id = @job_id ORDER BY id");
  const deliveries = deliveryRows.recordset;

  let success = 0;
  let failed = 0;

  for (let i = 0; i < deliveries.length; i++) {
    const delivery = deliveries[i];
    const emp = recipients[i] || {};

    await updateDeliveryStatus(delivery.id, { status: "sending", attempt: 1 });

    let attempt = 1;
    let lastError = null;

    while (attempt <= MAX_ATTEMPTS) {
      try {
        await sendToRecipient(emp, job);
        await updateDeliveryStatus(delivery.id, { status: "sent", sentAt: new Date() });
        success++;
        logger.info("delivery sent", { jobId: job.id, deliveryId: delivery.id });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        const isInvalid = err.code === "INVALID_PHONE";
        if (attempt < MAX_ATTEMPTS && !isInvalid) {
          // Retry terbatas dengan jeda singkat; nomor invalid tidak di-retry.
          await updateDeliveryStatus(delivery.id, {
            status: "retrying",
            attempt: attempt + 1,
            errorCode: errorCodeOf(err),
            errorMessage: err.message,
          });
          logger.warn("delivery retry", { jobId: job.id, deliveryId: delivery.id, attempt });
          await sleep(5000);
        } else {
          await updateDeliveryStatus(delivery.id, {
            status: "failed",
            attempt,
            errorCode: errorCodeOf(err),
            errorMessage: err.message,
            failedAt: new Date(),
          });
          failed++;
          logger.error("delivery failed", { jobId: job.id, deliveryId: delivery.id, err: err.message });
        }
        attempt++;
      }
    }
    if (lastError && attempt > MAX_ATTEMPTS) {
      // sudah dihitung failed di loop; tidak ada aksi tambahan
    }

    if (i < deliveries.length - 1) {
      await sleep(INTERVAL_MS);
    }
  }

  const finalStatus = failed === 0 ? "completed" : success > 0 ? "completed" : "failed";
  await db
    .request()
    .input("id", sql.Int, job.id)
    .input("success_count", sql.Int, success)
    .input("failed_count", sql.Int, failed)
    .input("status", sql.NVarChar(20), finalStatus)
    .input("finished_at", sql.DateTime, new Date())
    .query(
      `UPDATE message_jobs
       SET success_count = @success_count,
           failed_count = @failed_count,
           status = @status,
           finished_at = @finished_at
       WHERE id = @id`
    );

  // File broadcast bersifat sementara — hapus setelah job selesai (sukses/gagal).
  if (hasBroadcastFile) {
    fs.unlink(job.file_path, (err) => {
      if (err) logger.warn("failed to delete broadcast temp file", { path: job.file_path, err: err.message });
    });
  }

  // Audit: job selesai (completed / failed).
  logAudit({
    nip: job.created_by_nip,
    action: `${job.type}.${finalStatus === "failed" ? "failed" : "completed"}`,
    target: `job:${job.id}`,
    meta: { total: recipients.length, success, failed, status: finalStatus },
    success: finalStatus !== "failed",
  });

  logger.info("job finished", { jobId: job.id, status: finalStatus, success, failed });
}

async function workerLoop() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (workerActive) {
      let job = null;
      try {
        job = await claimNextJob();
      } catch (err) {
        logger.error("worker claim failed", { err: err?.message });
        await sleep(IDLE_POLL_MS);
        continue;
      }
      if (!job) {
        await sleep(IDLE_POLL_MS);
        continue;
      }
      try {
        await processJob(job);
      } catch (err) {
        logger.error("worker job crashed", { jobId: job.id, err: err?.message });
        // Tandai gagal agar tidak tersangkut status running selamanya.
        try {
          const db = await poolPromise;
          await db
            .request()
            .input("id", sql.Int, job.id)
            .input("err", sql.NVarChar(sql.MAX), err?.message || "worker crash")
            .query(
              `UPDATE message_jobs
               SET status = 'failed', finished_at = GETDATE(), error_message = @err
               WHERE id = @id`
            );
          logAudit({
            nip: job.created_by_nip,
            action: `${job.type}.failed`,
            target: `job:${job.id}`,
            meta: { reason: "worker_crash" },
            success: false,
          });
        } catch (e) {
          logger.error("failed to mark crashed job", { err: e?.message });
        }
      }
    }
  } finally {
    workerRunning = false;
  }
}

function startWorker() {
  if (workerActive) return;
  workerActive = true;
  logger.info("job worker started");
  workerLoop();
}

function stopWorker() {
  workerActive = false;
  logger.info("job worker stopping");
}

// Setelah restart server, job yang tersangkut status 'running' dianggap gagal
// (tidak di-resend otomatis — hindari pesan ganda). Job 'queued' tetap diproses.
async function resetStaleJobs() {
  try {
    const db = await poolPromise;
    const result = await db
      .request()
      .query(
        `UPDATE message_jobs
         SET status = 'failed',
             finished_at = GETDATE(),
             error_message = 'Server restart: job belum selesai dan tidak dilanjutkan'
         WHERE status = 'running'`
      );
    logger.info("stale running jobs marked failed", { count: result.rowsAffected?.[0] || 0 });
  } catch (err) {
    logger.error("resetStaleJobs failed", { err: err?.message });
  }
}

module.exports = {
  createJob,
  getJob,
  getJobDeliveries,
  listJobs,
  startWorker,
  stopWorker,
  resetStaleJobs,
  INTERVAL_MS,
  MAX_ATTEMPTS,
};
