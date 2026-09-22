const { sql, poolPromise } = require("../config/db");

let cachedHolidays = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

// NOTE: pembuatan tabel `holidays` sekarang ditangani migration system
// (backend/migrations/002_legacy_tables.sql) — tidak ada lagi schema mutation
// di request path.

async function loadHolidays() {
    const now = Date.now();
    if (cachedHolidays.length > 0 && now - lastFetch < CACHE_TTL) {
        return cachedHolidays;
    }

    const db = await poolPromise;
    const result = await db.request().query(`SELECT holiday_date FROM holidays`);
    cachedHolidays = result.recordset.map((r) => {
        const d = new Date(r.holiday_date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    lastFetch = now;
    return cachedHolidays;
}

function invalidateCache() {
    cachedHolidays = [];
    lastFetch = 0;
}

async function isHoliday(date) {
    const holidays = await loadHolidays();
    const d = date || new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return holidays.includes(dateStr);
}

async function isWorkingDay(date) {
    const d = date || new Date();
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    return !(await isHoliday(d));
}

module.exports = { isWorkingDay, isHoliday, loadHolidays, invalidateCache };
