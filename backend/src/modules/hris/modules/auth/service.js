const { queryOne } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

/**
 * Konversi tanggal lahir yang diketik di form (ddmmyy) ke ISO yyyy-mm-dd
 * agar bisa dibandingkan dengan kolom BirthDate (datetime) di hris_Employee.
 * Aturan abad: yy <= tahun-berjalan (2 digit) => 20yy, selain itu 19yy.
 */
function ddmmyyToIso(input) {
  const s = String(input ?? '').replace(/\D/g, '');
  if (s.length !== 6) return null;

  const dd = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  const yy = Number(s.slice(4, 6));
  const year = (yy <= new Date().getFullYear() % 100 ? 2000 : 1900) + yy;

  const d = new Date(Date.UTC(year, mm - 1, dd));
  const valid = d.getUTCFullYear() === year && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
  if (!valid) return null;

  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

const toIsoDate = (v) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);

const clean = (s) => String(s ?? '').trim();

/**
 * Padanan hris/login_validate(), dialihkan ke autentikasi hris_Employee:
 * username = NIP, password = tanggal lahir (ddmmyy).
 */
async function login(nip, password) {
  const username = clean(nip);
  if (!username) throw httpError(400, 'NIP wajib diisi');

  const iso = ddmmyyToIso(password);
  if (!iso) {
    throw httpError(400, 'Format tanggal lahir harus ddmmyy, contoh 051207');
  }

  const row = await queryOne(
    'SELECT TOP 1 NIP, Name, BirthDate, RTRIM(LTRIM(DepartID)) AS DepartID FROM BMC.dbo.hris_Employee WHERE NIP = @nip',
    { nip: username }
  );

  // Pesan seragam agar tidak membocorkan NIP mana yang ada.
  if (!row || toIsoDate(row.BirthDate) !== iso) {
    throw httpError(401, 'NIP atau tanggal lahir salah');
  }

  // Gerbang departemen: HRIS hanya untuk DepartID 0300.
  if (String(row.DepartID ?? '').trim() !== '0300') {
    throw httpError(403, 'Akses HRIS hanya untuk Departemen 0300');
  }

  return { username: clean(row.NIP), name: clean(row.Name), role: 'employee' };
}

module.exports = { ddmmyyToIso, login };
