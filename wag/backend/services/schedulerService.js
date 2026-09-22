const cron = require("node-cron");
const { sql, poolPromise } = require("../config/db");
const logger = require("../utils/logger");
const { isValidCron } = require("../utils/cron");
const { computeNextRun, todayInJakarta, APP_TZ } = require("../utils/schedule");
const { createJob } = require("./jobQueueService");

const activeJobs = new Map();
// Lock in-memory: mencegah eksekusi jadwal yang sama berjalan tumpang tindih
// (mis. jadwal tiap menit yang lambat selesai).
const executing = new Set();

async function persistNextRun(scheduleId, cronExpression) {
  const nextRun = computeNextRun(cronExpression);
  if (!nextRun) return null;
  try {
    const db = await poolPromise;
    await db
      .request()
      .input("id", sql.Int, scheduleId)
      .input("next_run", sql.DateTime, nextRun)
      .query("UPDATE scheduled_messages SET next_run = @next_run, updated_at = GETDATE() WHERE id = @id");
  } catch (err) {
    logger.error("failed to persist next_run", { scheduleId, err: err?.message });
  }
  return nextRun;
}

// Eksekusi jadwal: buat job ke antrian, worker yang mengirim (retry + history).
async function executeSchedule(schedule) {
  const { id, name, message, recipients, file_path, file_mimetype, only_working_days, cron_expression } = schedule;

  if (executing.has(id)) {
    logger.warn("schedule already executing, skipped", { scheduleId: id });
    return;
  }
  executing.add(id);

  try {
    logger.info("schedule execution started", { scheduleId: id, name });

    if (only_working_days) {
      const { isWorkingDay } = require("../utils/workingDay");
      const working = await isWorkingDay();
      if (!working) {
        logger.info("schedule skipped (not a working day)", { scheduleId: id });
        return;
      }
    }

    let parsedRecipients;
    try {
      parsedRecipients =
        typeof recipients === "string" ? JSON.parse(recipients) : recipients;
    } catch (err) {
      logger.error("failed to parse recipients", { scheduleId: id, err: err?.message });
      return;
    }

    if (!Array.isArray(parsedRecipients) || parsedRecipients.length === 0) {
      logger.info("schedule has no recipients, skipped", { scheduleId: id });
      return;
    }

    const idempotencyKey = `scheduled-${id}-${todayInJakarta()}`;

    const job = await createJob({
      type: "scheduled",
      message,
      recipients: parsedRecipients,
      filePath: file_path || null,
      fileMimetype: file_mimetype || null,
      scheduleId: id,
      idempotencyKey,
    });

    logger.info("schedule job created", { scheduleId: id, jobId: job.id });

    // Setelah eksekusi: simpan last_run dan hitung ulang next_run.
    // next_run dihitung dari ekspresi cron dalam zona Asia/Jakarta sehingga
    // selalu mengarah ke occurrence berikutnya setelah eksekusi ini.
    try {
      const db = await poolPromise;
      await db
        .request()
        .input("id", sql.Int, id)
        .input("last_run", sql.DateTime, new Date())
        .query("UPDATE scheduled_messages SET last_run = @last_run, updated_at = GETDATE() WHERE id = @id");
    } catch (err) {
      logger.error("failed to persist last_run", { scheduleId: id, err: err?.message });
    }
    await persistNextRun(id, cron_expression);
  } catch (err) {
    logger.error("schedule execution failed", { scheduleId: id, err: err?.message });
  } finally {
    executing.delete(id);
  }
}

function registerSchedule(schedule) {
  const { id, cron_expression, is_active, only_working_days } = schedule;

  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
  }

  if (!is_active) {
    return;
  }

  if (!isValidCron(cron_expression)) {
    logger.error(`Invalid cron expression "${cron_expression}" for schedule #${id}`);
    return;
  }

  // Hitung & simpan next_run setiap kali jadwal didaftarkan (create/update/toggle/reload).
  persistNextRun(id, cron_expression);

  const job = cron.schedule(
    cron_expression,
    () => {
      executeSchedule(schedule);
    },
    { timezone: APP_TZ }
  );

  activeJobs.set(id, job);
  const modeLabel = only_working_days ? " [working days only]" : "";
  logger.info(`Registered schedule #${id}`, { cron: cron_expression, mode: modeLabel });
}

function unregisterSchedule(id) {
  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
    logger.info(`Unregistered schedule #${id}`);
  }
}

async function loadAllSchedules() {
  try {
    const db = await poolPromise;

    // NOTE: kolom only_working_days ditangani migration system
    // (002_legacy_tables.sql) — tidak ada lagi ALTER di request path.

    const result = await db.request().query(`
      SELECT id, name, message, recipients, cron_expression, file_path, file_mimetype, is_active, only_working_days
      FROM scheduled_messages
      WHERE is_active = 1
    `);

    for (const schedule of result.recordset) {
      registerSchedule(schedule);
    }

    logger.info(`Loaded ${result.recordset.length} active schedule(s)`);
  } catch (err) {
    logger.error("Failed to load schedules", { err: err?.message });
  }
}

module.exports = {
  registerSchedule,
  unregisterSchedule,
  loadAllSchedules,
  persistNextRun,
};
