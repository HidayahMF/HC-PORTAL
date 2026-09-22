"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { mockModule, clearModule } = require("../helpers/mockModule");

const DB_PATH = path.join(__dirname, "../../config/db.js");

// State shared oleh stub — diubah per test. Modul target hanya di-require sekali.
const state = { holidayDates: [], fetchCount: 0 };

const fakeDb = {
  poolPromise: Promise.resolve({
    request: () => ({
      input() { return this; },
      query(sqlText) {
        if (/SELECT holiday_date FROM holidays/.test(sqlText)) {
          state.fetchCount++;
          return Promise.resolve({
            recordset: state.holidayDates.map((d) => ({ holiday_date: new Date(d) })),
          });
        }
        return Promise.resolve({ recordset: [] });
      },
    }),
  }),
  sql: require("mssql"),
};

before(() => {
  mockModule(DB_PATH, fakeDb);
});

after(() => {
  clearModule(DB_PATH);
});

let wd;

before(() => {
  wd = require("../../utils/workingDay");
});

function reset(dates) {
  state.holidayDates = dates;
  state.fetchCount = 0;
  wd.invalidateCache(); // cache internal per test
}

test("isWorkingDay: Sabtu tidak working day", async () => {
  reset([]);
  const sat = new Date("2026-08-22T03:00:00Z"); // Sabtu
  assert.strictEqual(await wd.isWorkingDay(sat), false);
});

test("isWorkingDay: Minggu tidak working day", async () => {
  reset([]);
  const sun = new Date("2026-08-23T03:00:00Z"); // Minggu
  assert.strictEqual(await wd.isWorkingDay(sun), false);
});

test("isWorkingDay: Senin normal adalah working day", async () => {
  reset([]);
  const mon = new Date("2026-08-24T03:00:00Z"); // Senin
  assert.strictEqual(await wd.isWorkingDay(mon), true);
});

test("isWorkingDay: Senin yang merupakan hari libur → bukan working day", async () => {
  reset(["2026-08-24"]); // Senin 24-08-2026 libur
  const mon = new Date("2026-08-24T03:00:00Z");
  assert.strictEqual(await wd.isWorkingDay(mon), false);
});

test("isHoliday: tanggal di daftar libur terdeteksi", async () => {
  reset(["2026-08-17"]);
  const d = new Date("2026-08-17T03:00:00Z");
  assert.strictEqual(await wd.isHoliday(d), true);
});

test("invalidateCache: memaksa reload dari DB", async () => {
  reset(["2026-08-10"]); // daftar non-kosong agar cache aktif
  await wd.isHoliday(new Date("2026-08-10T03:00:00Z"));
  const afterFirst = state.fetchCount;
  await wd.isHoliday(new Date("2026-08-11T03:00:00Z"));
  assert.strictEqual(state.fetchCount, afterFirst); // TTL: tidak fetch ulang

  wd.invalidateCache();
  await wd.isHoliday(new Date("2026-08-12T03:00:00Z"));
  assert.strictEqual(state.fetchCount, afterFirst + 1);
});
