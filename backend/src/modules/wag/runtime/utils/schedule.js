const { CronExpressionParser } = require("cron-parser");

const APP_TZ = "Asia/Jakarta";

// Hitung waktu eksekusi berikutnya dari ekspresi cron (format node-cron),
// dihitung dalam zona waktu Asia/Jakarta. Mengembalikan Date atau null jika invalid.
function computeNextRun(cronExpression, from = new Date()) {
  if (typeof cronExpression !== "string" || !cronExpression.trim()) return null;
  try {
    const it = CronExpressionParser.parse(cronExpression.trim(), {
      tz: APP_TZ,
      currentDate: from,
    });
    return it.next().toDate();
  } catch (err) {
    return null;
  }
}

// Tanggal hari ini (YYYY-MM-DD) dalam zona Asia/Jakarta — untuk idempotency key
// jadwal harian (mis. "scheduled-5-2026-08-19") supaya satu jadwal tidak
// terkirim dua kali di hari yang sama.
function todayInJakarta() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

module.exports = { computeNextRun, todayInJakarta, APP_TZ };
