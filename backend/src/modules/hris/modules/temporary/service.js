const { query, queryOne, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');
const { sendWa } = require('../../lib/notify.js');

async function listTemporary() {
  return query(
    `select a.*, b.nama
     from [BMC].[dbo].[hris_EmployeeTemp] a
     left join [BMC].[dbo].[hris_vw_Employee] b on a.NIP = b.nip
     order by a.InpDate`
  );
}

function confirmInfo(nip, date) {
  return { id: nip, date };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

/** Padanan strtotime() untuk 'Y-m-d [H:i:s]' tanpa pergeseran timezone. */
function parseLocal(val) {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Padanan date('Y-m-d H:i:s', strtotime($val)). */
function toSqlDateTime(val) {
  const d = parseLocal(val);
  if (!d) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Padanan date('d M Y', strtotime($val)). */
function formatDMY(val) {
  const d = parseLocal(val);
  if (!d) return '';
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

async function confirmAct(nip, date) {
  const inpDate = toSqlDateTime(date);
  const row = await queryOne('select Phone, Email from [BMC].[dbo].[hris_EmployeeTemp] where NIP = @nip and InpDate = @date', {
    nip,
    date: inpDate,
  });
  if (!row) throw httpError(404, 'Data temporary tidak ditemukan');

  await execute('update [BMC].[dbo].[hris_Employee] set Phone = @phone, Email = @email where NIP = @nip', {
    phone: row.Phone ?? null,
    email: row.Email ?? null,
    nip,
  });

  await execute('update [BMC].[dbo].[hris_EmployeeTemp] set Status = 2 where NIP = @nip and InpDate = @date', {
    nip,
    date: inpDate,
  });

  const noWa = String(row.Phone ?? '').trim();
  const pesan = `Dear user, kami informasikan bahwa perubahan data yang anda lakukan di aplikasi BMC Online pada tanggal ${formatDMY(inpDate)} telah tervalidasi oleh personalia. Terima kasih`;
  if (noWa) sendWa(noWa, pesan);

  return { ok: true };
}

module.exports = { listTemporary, confirmInfo, confirmAct };
