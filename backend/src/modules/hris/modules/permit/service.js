const { query } = require('../../db/pool.js');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const trimRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));

/** Daftar izin/permit semua karyawan pada periode tertentu.
 *  idType diisi -> filter kategori dari hris_Permit_SubGroup (mis. 2 = special leave). */
async function transactions({ DateStart, DateEnd, idType } = {}) {
  const params = {};
  let where;
  if (DateStart && DateEnd) {
    params.start = DateStart;
    params.end = DateEnd;
    where = 'CAST(p.ProposeStartDate AS date) BETWEEN @start AND @end';
  } else {
    params.start = ymd();
    params.end = ymd();
    where = 'CAST(p.ProposeStartDate AS date) BETWEEN @start AND @end';
  }

  if (idType !== undefined && idType !== null && idType !== '') {
    params.idType = Number(idType);
    where += ' AND RTRIM(p.SubGroup) IN (SELECT RTRIM(sg.SubDetail) FROM BMC.dbo.hris_Permit_SubGroup sg WHERE sg.IdType = @idType)';
  }

  const rows = await query(
    `SELECT p.Id, p.NIP, RTRIM(e.Name) AS Name, p.ProposeStartDate, p.ProposeEndDate,
            p.ProposeStartTime, p.ProposeEndTime, p.Type, p.[Group], p.SubGroup,
            p.NumDays, p.TypeDays, p.Status, p.Description, p.InpDate
       FROM BMC.dbo.vw_hris_Permit_Transaction p
       LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = p.NIP
      WHERE ${where}
      ORDER BY p.ProposeStartDate DESC, p.NIP`,
    params
  );

  return rows.map(trimRow);
}

module.exports = { transactions };
