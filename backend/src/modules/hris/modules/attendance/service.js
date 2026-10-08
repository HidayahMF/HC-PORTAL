const { query, queryOne } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const pad = (n) => String(n).padStart(2, '0');

const toDate = (v) => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v === null || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* DB disimpan/dibaca sebagai UTC (node-mssql useUTC default true),
   maka pakai getUTC* agar wall-clock sama dengan nilai di DB. */
const fmtDate = (v) => {
  const d = toDate(v);
  return d ? `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}` : v;
};
const fmtTime = (v) => {
  const d = toDate(v);
  return d ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : v;
};
const fmtDateUS = (v) => {
  const d = toDate(v);
  return d
    ? `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
    : v;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* Padanan `array_map('trim', $row)`: trim semua value string. */
const trimRow = (row) => {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = typeof v === 'string' ? v.trim() : v;
  return out;
};

/* col = identifier statis (bukan input user), jadi aman diinterpolasi.
   Input user tetap lewat @dateStart/@dateEnd. */
const rangeClause = (col, dateStart, dateEnd) =>
  dateStart && dateEnd
    ? { clause: `CAST(${col} AS date) BETWEEN @dateStart AND @dateEnd`, params: { dateStart, dateEnd } }
    : { clause: `CAST(${col} AS date) = @dateEnd`, params: { dateEnd: today() } };

function log_status(v) {
  let label = 'Pulang';
  let bg = 'bg-red';
  if (String(v) === '1') {
    label = 'Masuk';
    bg = 'bg-green';
  }
  return `<small class='label ${bg}'>${label}</small>`;
}

function log_jobstatus(v) {
  if (String(v) === '0') return 'Work From Office';
  if (String(v) === '1') return 'Work From Home';
  if (String(v) === '2') return 'Work Outside Office';
  if (String(v) === '3') return 'Work Outside Office';
  return 'Hand Key';
}

/* Padanan helper timeatt_helper.php button(). */
const button = () =>
  '<button type="button" class="btn btn-info btn-xs btn-detail"><i class="fa fa-info"></i></button>';

const BPIONLINE_HEAD =
  'SELECT a.ID, a.NIP, b.Name AS NAME, a.DATETIME, a.ISWFH, a.STATUS ' +
  'FROM BMC.dbo.bpionline_Absensi a ' +
  'LEFT OUTER JOIN BMC.dbo.vw_bpionline_Employees b ON a.NIP = b.NIP ';

/* Padanan hris/log_datatable() */
async function getLogs(dateStart, dateEnd) {
  const f1 = rangeClause('a.DATETIME', dateStart, dateEnd);
  const rows1 = await query(`${BPIONLINE_HEAD}WHERE ${f1.clause} ORDER BY a.DATETIME DESC`, f1.params);

  const f2 = rangeClause('a.tr_date', dateStart, dateEnd);
  const rows2 = await query(
    "SELECT a.tr_date AS DATETIME, a.empl_code AS NIP, b.Name AS NAME, ISWFH = '3', acc_code AS STATUS " +
      'FROM bmc.dbo.habsen a ' +
      'LEFT OUTER JOIN bmc.dbo.vw_bpionline_Employees b ON a.empl_code = b.NIP ' +
      `WHERE ${f2.clause} ORDER BY a.tr_date DESC`,
    f2.params
  );

  const data = [];
  for (const raw of rows1) {
    const row = trimRow(raw);
    row.DATE = fmtDate(row.DATETIME);
    row.TIME = fmtTime(row.DATETIME);
    row.STATUS = log_status(row.STATUS);
    row.ISWFH = log_jobstatus(row.ISWFH);
    row.ACTION = button();
    data.push(row);
  }
  for (const raw of rows2) {
    const row = trimRow(raw);
    row.ID = '';
    row.DATE = fmtDate(row.DATETIME);
    row.TIME = fmtTime(row.DATETIME);
    row.STATUS = log_status(row.STATUS);
    row.ISWFH = log_jobstatus(row.ISWFH);
    row.ACTION = '';
    data.push(row);
  }
  return data;
}

/* Padanan hris/log_detail($id). HTML log_box_detail tidak diport. */
async function getLogDetail(id) {
  const row = await queryOne(
    'SELECT a.ID, a.NIP, b.Name AS NAME, a.DATETIME, a.ISWFH, a.STATUS, a.ACTIVITY, a.PHOTO, a.COORDINATE ' +
      'FROM BMC.dbo.bpionline_Absensi a ' +
      'LEFT OUTER JOIN BMC.dbo.vw_bpionline_Employees b ON a.NIP = b.NIP ' +
      'WHERE a.ID = @id',
    { id }
  );
  if (!row) throw httpError(404, 'Data absensi tidak ditemukan');

  const data = trimRow(row);
  data.DATE = fmtDate(data.DATETIME);
  data.TIME = fmtTime(data.DATETIME);
  data.STATUS = log_status(data.STATUS);
  data.ISWFH = log_jobstatus(data.ISWFH);
  return data;
}

/* Padanan hris/timeatt_datatable() */
async function getTimeatt(dateStart, dateEnd) {
  const f1 = rangeClause('a.DATETIME', dateStart, dateEnd);
  const rows1 = await query(`${BPIONLINE_HEAD}WHERE ${f1.clause} ORDER BY a.DATETIME DESC`, f1.params);

  const f2 = rangeClause('a.CHECKTIME', dateStart, dateEnd);
  const rows2 = await query(
    "SELECT a.CHECKTIME AS DATETIME, b.SSN AS NIP, NAME = '', ISWFH = '3', " +
      "CASE WHEN CHECKTYPE='I' THEN 1 WHEN CHECKTYPE='O' THEN 2 END AS STATUS " +
      'FROM BMC.dbo.CHECKINOUT a ' +
      'LEFT OUTER JOIN BMC.dbo.USERINFO b ON a.USERID = b.USERID ' +
      'LEFT OUTER JOIN BMC.dbo.vw_bpionline_Employees c ON b.SSN = c.NIP ' +
      `WHERE ${f2.clause} ORDER BY a.CHECKTIME DESC`,
    f2.params
  );

  const data = [];
  for (const raw of rows1) {
    const row = trimRow(raw);
    row.DATE = fmtDate(row.DATETIME);
    row.TIME = fmtTime(row.DATETIME);
    row.STATUS = log_status(row.STATUS);
    row.ISWFH = log_jobstatus(row.ISWFH);
    row.ACTION = button();
    data.push(row);
  }
  for (const raw of rows2) {
    const row = trimRow(raw);
    row.ID = '';
    row.DATE = fmtDate(row.DATETIME);
    row.TIME = fmtTime(row.DATETIME);
    row.STATUS = log_status(row.STATUS);
    row.ISWFH = log_jobstatus(row.ISWFH);
    row.ACTION = '';
    data.push(row);
  }
  return data;
}

/* Padanan hris/etcom_datatable() */
async function getEtcom(dateStart, dateEnd) {
  const f1 = rangeClause('a.DATETIME', dateStart, dateEnd);
  const rows1 = await query(
    "SELECT a.ID, a.DATETIME, replace(convert(varchar(5),a.DATETIME,108),':','') AS TR_TIME, a.NIP, b.Name AS NAME, " +
      "CASE WHEN a.STATUS='2' THEN '3' ELSE 1 END AS KD_IN_OUT, a.ISWFH AS KD, a.ISWFH, a.STATUS, a.ADDRESS " +
      'FROM BMC.dbo.bpionline_Absensi a ' +
      'LEFT OUTER JOIN BMC.dbo.vw_bpionline_Employees b ON a.NIP = b.NIP ' +
      `WHERE ${f1.clause} ORDER BY a.DATETIME DESC`,
    f1.params
  );

  const f2 = rangeClause('a.tr_date', dateStart, dateEnd);
  const rows2 = await query(
    "SELECT a.tr_date AS DATETIME, replace(convert(varchar(5),a.tr_date,108),':','') AS TR_TIME, a.empl_code AS NIP, " +
      "b.Name AS NAME, a.acc_code AS KD_IN_OUT, KD = '3', ISWFH = '3', acc_code AS STATUS, ADDRESS = 'Handkey' " +
      'FROM BMC.dbo.habsen a ' +
      'LEFT OUTER JOIN BMC.dbo.vw_bpionline_Employees b ON a.empl_code = b.NIP ' +
      `WHERE ${f2.clause} ORDER BY a.tr_date DESC`,
    f2.params
  );

  const data = [];
  for (const raw of rows1) {
    const row = trimRow(raw);
    row.DATE = fmtDateUS(row.DATETIME);
    row.STATUS = log_status(row.STATUS);
    row.ISWFH = log_jobstatus(row.ISWFH);
    row.ACTION = button();
    data.push(row);
  }
  for (const raw of rows2) {
    const row = trimRow(raw);
    row.ID = '';
    row.DATE = fmtDateUS(row.DATETIME);
    row.STATUS = log_status(row.STATUS);
    row.ISWFH = log_jobstatus(row.ISWFH);
    row.ACTION = '';
    data.push(row);
  }
  return data;
}

/* Padanan hris/etcom_detail($id): join RIGHT(NIP,4). HTML log_box_detail tidak diport. */
async function getEtcomDetail(id) {
  const row = await queryOne(
    'SELECT a.ID, a.NIP, b.Name AS NAME, a.DATETIME, a.ISWFH, a.STATUS, a.ACTIVITY, a.PHOTO, a.COORDINATE ' +
      'FROM BMC.dbo.bpionline_Absensi a ' +
      'LEFT OUTER JOIN BMC.dbo.vw_bpionline_Employees b ON RIGHT(a.NIP,4) = RIGHT(b.NIP,4) ' +
      'WHERE a.ID = @id',
    { id }
  );
  if (!row) throw httpError(404, 'Data absensi tidak ditemukan');

  const data = trimRow(row);
  data.DATE = fmtDate(data.DATETIME);
  data.TIME = fmtTime(data.DATETIME);
  data.STATUS = log_status(data.STATUS);
  data.ISWFH = log_jobstatus(data.ISWFH);
  return data;
}

module.exports = { log_status, log_jobstatus, button, getLogs, getLogDetail, getTimeatt, getEtcom, getEtcomDetail };
