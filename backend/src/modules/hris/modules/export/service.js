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
async function getEmployees() {
  const rows = await query(
    'SELECT a.NIP, a.Name, d.DivisionName, c.Departemen, f.NamaDepartemen AS SubDept, b.Jobtitle, e.CategoryName, ' +
      "CASE WHEN a.EmployeeStatus='P' THEN 'Tetap' ELSE 'Kontrak' END AS Status, " +
      'a.FirstWorkingDate, a.WorkingDate, a.NIK, a.NPWP, a.Gender, a.BirthDate, a.EducationArchive, a.Address, a.Phone, ' +
      "CASE WHEN a.Child='1' THEN 'K1' WHEN a.Child='2' THEN 'K2' WHEN a.Child='3' THEN 'K3' WHEN a.MaritalStatus='K' THEN 'K0' ELSE 'TK' END AS StatusPajak " +
      'FROM BMC.dbo.hris_Employee a ' +
      'LEFT OUTER JOIN BMC.dbo.hris_EmployeeCareerPath b ON RIGHT(a.NIP,4) = RIGHT(b.NIP,4) ' +
      "LEFT OUTER JOIN (SELECT LEFT(DepartID,2) AS grup, NamaDepartemen AS Departemen, Id_Division " +
      "FROM BMC.dbo.MASCOSTCENTER WHERE LevelDepartemen='Departemen') c ON LEFT(a.DepartID,2) = grup " +
      'LEFT OUTER JOIN BMC.dbo.MASCOSTCENTER f ON a.DepartID = f.DepartID ' +
      'LEFT OUTER JOIN BMC.dbo.hris_Division d ON d.Id_Division = c.Id_Division ' +
      'LEFT OUTER JOIN BMC.dbo.hris_Jobtitle e ON e.Id_Jobtitle = b.Id_Jobtitle ' +
      "WHERE a.is_Active='1' AND b.is_Archive='0' " +
      'ORDER BY RIGHT(a.NIP,4) DESC'
  );

  return rows.map((raw) => {
    const row = trimRow(raw);
    row.WorkingDate = fmtDateYmd(row.WorkingDate);
    row.BirthDate = fmtDateYmd(row.BirthDate);
    return row;
  });
}

module.exports = { getEmployees };
