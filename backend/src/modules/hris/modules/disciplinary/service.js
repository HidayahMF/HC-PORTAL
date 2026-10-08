const fs = require('node:fs');
const path = require('node:path');
const { query, queryOne, execute } = require('../../db/pool.js');

/** Padanan hris::date_Ymd() -> 'Y-m-d'. */
function dateYmd(val) {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Nama file warning letter (padanan 'WarningLetter_'.NIP.'_'.IncidentDate.'_'.IncidentSeq). */
const warningLetterName = (nip, date, seq) => `WarningLetter_${nip}_${date}_${seq}`;

const titleCase = (v) => (typeof v === 'string' ? v.trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : v);
const titleRow = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, titleCase(v)]));
const titleRows = (rows) => rows.map(titleRow);
const trimRow = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));

async function inputOptions() {
  const employee = await query('select NIP, Name from BMC.dbo.hris_EmployeeAnalisis() order by Name');
  const hrManager = await query("select NIP, Name from BMC.dbo.hris_EmployeeAnalisis() where DeptCode = '2600' and Joblevel = 'MANAGER' order by Name");
  const dept = await query('select DeptCode, DeptName from BMC.dbo.hris_EmployeeAnalisis() group by DeptCode, DeptName');
  const refWarning = await query('select * from BMC.dbo.hris_RefWarningNumber order by WarningNumber');
  return {
    Employee: titleRows(employee),
    HRManager: titleRows(hrManager),
    Dept: titleRows(dept),
    RefWarning: refWarning.map(trimRow),
  };
}

async function employeesByDept(deptId) {
  const rows = await query('select NIP, Name from BMC.dbo.hris_EmployeeAnalisis() where DeptCode = @deptId', { deptId });
  return titleRows(rows);
}

async function refOffence(warningNumber) {
  const rows = await query(
    'select OffenceType, Description from BMC.dbo.hris_RefOffence where WarningNumber = @warningNumber order by Description',
    { warningNumber }
  );
  return titleRows(rows);
}

async function listDisciplinary() {
  const rows = await query(`select a.NIP, a.IncidentSeq, b.Name, b.DeptName, a.IncidentDate, c.Description as Offence, a.WarningNumber, a.WarningLeter
    from BMC.dbo.hris_Disciplinary a
    left outer join BMC.dbo.hris_EmployeeAnalisis() b on a.NIP = b.NIP and a.DeptID = b.DeptCode
    left outer join BMC.dbo.hris_RefOffence c on a.OffenceType = c.OffenceType
    group by a.NIP, a.IncidentSeq, b.Name, b.DeptName, a.IncidentDate, c.Description, a.WarningNumber, a.WarningLeter`);
  return titleRows(rows);
}

async function getDisciplinary(nip, date, seq) {
  const rows = await query(
    `select * from BMC.dbo.hris_Disciplinary
     where NIP = @nip and IncidentDate = @date and IncidentSeq = @seq
     order by IncidentDate desc`,
    { nip, date, seq }
  );
  if (!rows.length) return {};
  const record = trimRow(rows[0]);
  delete record.WarningLeter;
  for (const f of [
    'IncidentDate',
    'WarningfStartDate',
    'WarningEndDate',
    'EmployeeSignDate',
    'SubmitedDate',
    'witnessed_date',
    'HRManagerDate',
  ]) {
    if (record[f] !== undefined) record[f] = dateYmd(record[f]);
  }
  return record;
}

function offenceFields(body) {
  return [
    ['incidentTime', body.incidentTime],
    ['IncidentPlace', body.IncidentPlace],
    ['OffenceType', body.OffenceType],
    ['Description', body.Description],
    ['EmployeeStatement', body.EmployeeStatement],
    ['WarningNumber', body.WarningNumber],
    ['WarningfStartDate', dateYmd(body.WarningfStartDate)],
    ['WarningEndDate', body.WarningEndDate],
    ['NotifToEmployer', body.NotifToEmployer],
    ['NotifToEmployee', body.NotifToEmployee],
    ['NotifConsequence', body.NotifConsequence],
    ['witnessed_by', body.witnessed_by],
    ['witnessed_date', dateYmd(body.witnessed_date)],
    ['SubmitedBy', body.SubmitedBy],
    ['SubmitedDate', dateYmd(body.SubmitedDate)],
    ['EmployeeSignDate', dateYmd(body.EmployeeSignDate)],
    ['HRManagerSign', body.HRManagerSign],
    ['HRManagerDate', dateYmd(body.HRManagerDate)],
  ];
}

async function insertDisciplinary(body, file) {
  const incidentDate = dateYmd(body.IncidentDate);
  const seqRow = await queryOne(
    'select max(IncidentSeq) as IncidentSeq from BMC.dbo.hris_Disciplinary where NIP = @nip and IncidentDate = @date',
    { nip: body.NIP, date: incidentDate }
  );
  const seq = seqRow && seqRow.IncidentSeq != null ? seqRow.IncidentSeq + 1 : 1;

  const fields = [['DeptID', body.DeptID], ['NIP', body.NIP], ['IncidentSeq', seq], ['IncidentDate', incidentDate], ...offenceFields(body)];

  if (file) {
    const finalName = `${warningLetterName(body.NIP, incidentDate, seq)}.jpg`;
    if (file.filename !== finalName) {
      try {
        fs.renameSync(file.path, path.join(path.dirname(file.path), finalName));
      } catch {
        /* pertahankan nama asli bila gagal rename */
      }
    }
    fields.push(['WarningLeter', finalName]);
  }

  const bound = fields.map((f, i) => ({ col: f[0], p: `p${i}`, val: f[1] ?? null }));
  const params = Object.fromEntries(bound.map((b) => [b.p, b.val]));
  const cols = bound.map((b) => b.col).join(', ');
  const vals = bound.map((b) => `@${b.p}`).join(', ');
  await execute(`insert into BMC.dbo.hris_Disciplinary (${cols}) values (${vals})`, params);
  return { ok: true };
}

async function updateDisciplinary(nip, date, seq, body, file) {
  const fields = offenceFields(body);
  if (file) fields.push(['WarningLeter', file.filename]);

  const bound = fields.map((f, i) => ({ col: f[0], p: `p${i}`, val: f[1] ?? null }));
  const params = Object.fromEntries(bound.map((b) => [b.p, b.val]));
  params.nip = nip;
  params.seq = seq;
  params.incidentDate = dateYmd(date);
  const set = bound.map((b) => `${b.col} = @${b.p}`).join(', ');
  await execute(
    `update BMC.dbo.hris_Disciplinary set ${set} where NIP = @nip and IncidentSeq = @seq and IncidentDate = @incidentDate`,
    params
  );
  return { ok: true };
}

async function deleteDisciplinary(nip, date, seq) {
  await execute('delete from BMC.dbo.hris_Disciplinary where NIP = @nip and IncidentSeq = @seq and IncidentDate = @date', {
    nip,
    seq,
    date: dateYmd(date),
  });
  return { ok: true };
}

module.exports = { dateYmd, warningLetterName, inputOptions, employeesByDept, refOffence, listDisciplinary, getDisciplinary, insertDisciplinary, updateDisciplinary, deleteDisciplinary };
