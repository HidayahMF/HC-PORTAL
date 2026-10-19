const { query, getPool, sql } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

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
      'SELECT a.NIP, a.Name, a.is_Active, div.DivisionName, b.NamaDepartemen AS Departemen, d.Jobtitle, d.CategoryName, ' +
      "CASE WHEN a.EmployeeStatus='P' THEN 'Tetap' ELSE 'Kontrak' END AS Status, " +
      'a.FirstWorkingDate, a.WorkingDate, a.NIK, a.NPWP, a.Gender, a.BirthDate, a.EducationArchive, a.Address, a.Phone, ' +
      "CASE WHEN a.Child='1' THEN 'K1' WHEN a.Child='2' THEN 'K2' WHEN a.Child='3' THEN 'K3' WHEN a.MaritalStatus='K' THEN 'K0' ELSE 'TK' END AS StatusPajak " +
      'FROM BMC.dbo.hris_Employee a ' +
      'LEFT JOIN BMC.dbo.MASCOSTCENTER b ON a.DepartID = b.DepartID ' +
      'LEFT JOIN BMC.dbo.hris_EmployeeCareerPath c ON a.NIP = c.NIP AND c.is_Archive = 0 ' +
      'LEFT JOIN BMC.dbo.hris_Jobtitle d ON c.Id_Jobtitle = d.Id_Jobtitle ' +
      'LEFT JOIN BMC.dbo.hris_Division div ON b.Id_Division = div.Id_Division ' +
      'WHERE 1 = 1 ' +
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

async function deactivateEmployees(rawAction, rawNips, rawReason, actorNip) {
  const action = rawAction || 'deactivate';
  const nips = [...new Set(rawNips.map((nip) => nip.trim()))];
  const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
  if (!['deactivate', 'activate'].includes(action)) throw httpError(400, 'action tidak valid');
  if (!nips.length || nips.length > 500) throw httpError(400, 'NIP tidak valid');
  if (action === 'deactivate' && (!reason || reason.length > 500)) throw httpError(400, 'Alasan wajib diisi maksimal 500 karakter');
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const actorRequest = new sql.Request(transaction).input('actorNip', sql.VarChar, String(actorNip ?? '').trim());
    const actor = (await actorRequest.query("SELECT TOP 1 NIP, DepartID FROM BMC.dbo.hris_Employee WITH (UPDLOCK) WHERE NIP=@actorNip")).recordset[0];
    if (!actor || String(actor.DepartID ?? '').trim() !== '0300') throw httpError(403, 'Tidak memiliki izin menonaktifkan karyawan');
    if (action === 'deactivate' && nips.includes(String(actor.NIP).trim())) throw httpError(400, 'Tidak dapat menonaktifkan akun sendiri');
    const request = new sql.Request(transaction);
    if (action === 'deactivate') request.input('reason', sql.NVarChar(500), reason);
    const names = nips.map((nip, i) => { const name = `nip${i}`; request.input(name, sql.VarChar, nip); return `@${name}`; });
    const found = (await request.query(`SELECT NIP FROM BMC.dbo.hris_Employee WITH (UPDLOCK) WHERE NIP IN (${names.join(',')})`)).recordset;
    if (found.length !== nips.length) throw httpError(400, 'Satu atau lebih NIP tidak ditemukan');
    const result = await request.query(action === 'deactivate'
      ? `UPDATE BMC.dbo.hris_Employee SET is_Active='0', InactiveDate=GETDATE(), InactiveReason=@reason WHERE NIP IN (${names.join(',')})`
      : `UPDATE BMC.dbo.hris_Employee SET is_Active='1', InactiveDate=NULL, InactiveReason=NULL WHERE NIP IN (${names.join(',')})`);
    await transaction.commit();
    return { affectedCount: result.rowsAffected[0] ?? 0 };
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }
}

module.exports = { getEmployees, deactivateEmployees };
