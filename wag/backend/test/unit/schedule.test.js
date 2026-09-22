"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { computeNextRun, todayInJakarta, APP_TZ } = require("../../utils/schedule");

test("APP_TZ adalah Asia/Jakarta", () => {
  assert.strictEqual(APP_TZ, "Asia/Jakarta");
});

test("computeNextRun: harian 08:00 dihitung dalam zona Asia/Jakarta", () => {
  // Senin, 2026-08-18 10:00 WIB (07:00 UTC)
  const from = new Date("2026-08-18T07:00:00.000Z");
  const next = computeNextRun("0 8 * * *", from);
  assert.ok(next instanceof Date);
  // Eksekusi berikutnya: Selasa 08:00 WIB = 01:00 UTC
  assert.strictEqual(next.toISOString(), "2026-08-19T01:00:00.000Z");
});

test("computeNextRun: only weekday dari Jumat → Senin", () => {
  // Jumat, 2026-08-21 12:00 WIB
  const from = new Date("2026-08-21T05:00:00.000Z");
  const next = computeNextRun("0 8 * * 1-5", from);
  assert.strictEqual(next.toISOString(), "2026-08-24T01:00:00.000Z");
});

test("computeNextRun: dari Sabtu dengan only weekday → Senin", () => {
  const from = new Date("2026-08-22T05:00:00.000Z"); // Sabtu 12:00 WIB
  const next = computeNextRun("0 8 * * 1-5", from);
  assert.strictEqual(next.toISOString(), "2026-08-24T01:00:00.000Z");
});

test("computeNextRun: occurrence berikutnya di hari yang sama jika belum lewat", () => {
  const from = new Date("2026-08-18T00:30:00.000Z"); // 07:30 WIB
  const next = computeNextRun("0 8 * * *", from);
  assert.strictEqual(next.toISOString(), "2026-08-18T01:00:00.000Z");
});

test("computeNextRun: ekspresi invalid → null", () => {
  assert.strictEqual(computeNextRun("bukan cron"), null);
  assert.strictEqual(computeNextRun(""), null);
  assert.strictEqual(computeNextRun(null), null);
  assert.strictEqual(computeNextRun(123), null);
});

test("todayInJakarta: format YYYY-MM-DD", () => {
  const today = todayInJakarta();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});
