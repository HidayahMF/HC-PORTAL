const { query } = require('../../db/pool.js');

const pad = (n) => String(n).padStart(2, '0');

const toDate = (v) => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v === null || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* date('Y/m/d', strtotime(...)) dengan asumsi UTC (useUTC node-mssql default). */
const fmtDateYmd = (v) => {
  const d = toDate(v);
  return d ? `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}` : v;
};

/* Padanan `array_map('trim', $row)`. */
const trimRow = (row) => {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = typeof v === 'string' ? v.trim() : v;
  return out;
};

/* Padanan hris/emp_datatable() (export data karyawan). */
async function getEmployees(q) {
  const term = String(q ?? '').trim();

  /* Filter keyword dibangun dari string tetap; nilai di-bind lewat params.
     Alias kolom mengikuti join shape di bawah (a=Employee, b=MASCOSTCENTER,
     c=CareerPath, d=Jobtitle, div=Division). */
  const params = {};
  let keywordFilter = '';
  if (term.length >= 2) {
    keywordFilter =
      ' AND (a.NIP LIKE @q OR a.Name LIKE @q OR d.Jobtitle LIKE @q OR b.NamaDepartemen LIKE @q OR div.DivisionName LIKE @q) ';
    params.q = `%${term}%`;
  }

  const rows = await query(
    'SELECT a.NIP, a.Name, div.DivisionName, b.NamaDepartemen AS Departemen, d.Jobtitle, d.CategoryName, ' +
      "CASE WHEN a.EmployeeStatus='P' THEN 'Tetap' ELSE 'Kontrak' END AS Status, " +
      'a.FirstWorkingDate, a.WorkingDate, a.NIK, a.NPWP, a.Gender, a.BirthDate, a.EducationArchive, a.Address, a.Phone, ' +
      "CASE WHEN a.Child='1' THEN 'K1' WHEN a.Child='2' THEN 'K2' WHEN a.Child='3' THEN 'K3' WHEN a.MaritalStatus='K' THEN 'K0' ELSE 'TK' END AS StatusPajak " +
      'FROM BMC.dbo.hris_Employee a ' +
      'LEFT JOIN BMC.dbo.MASCOSTCENTER b ON a.DepartID = b.DepartID ' +
      'LEFT JOIN BMC.dbo.hris_EmployeeCareerPath c ON a.NIP = c.NIP AND c.is_Archive = 0 ' +
      'LEFT JOIN BMC.dbo.hris_Jobtitle d ON c.Id_Jobtitle = d.Id_Jobtitle ' +
      'LEFT JOIN BMC.dbo.hris_Division div ON b.Id_Division = div.Id_Division ' +
      "WHERE a.is_Active = '1' " +
      keywordFilter +
      'ORDER BY a.NIP',
    params
  );

  return rows.map((raw) => {
    const row = trimRow(raw);
    row.WorkingDate = fmtDateYmd(row.WorkingDate);
    row.BirthDate = fmtDateYmd(row.BirthDate);
    return row;
  });
}

module.exports = { getEmployees };
