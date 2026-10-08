const { query, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');
const { sendWa } = require('../../lib/notify.js');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
// Padanan array_map('trim', $row): nilai string di-trim, angka/tanggal apa adanya.
const trimRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));

/** Padanan cuti_datatable() hris.php 2287-2329. */
async function transactions({ DateStart, DateEnd } = {}) {
  const params = {};
  let dateFilter;
  if (DateStart && DateEnd) {
    params.dateStart = DateStart;
    params.dateEnd = DateEnd;
    dateFilter = 'CAST(ActualDate AS date) BETWEEN @dateStart AND @dateEnd';
  } else {
    params.today = ymd();
    dateFilter = 'CAST(ActualDate AS date) = @today';
  }

  const rows = await query(
    `SELECT d.ActualDate, a.NIP, b.Name, c.NamaDepartemen,
            (CASE WHEN e.LeaveType='1' THEN 'Cuti Tahunan' WHEN e.LeaveType='2' THEN 'Cuti Besar' END) AS [Jenis-Cuti],
            e.Remark
     FROM BMC.dbo.vw_hris_Leave_Transaction a
     LEFT OUTER JOIN BMC.dbo.hris_Employee b ON b.NIP = a.NIP
     LEFT OUTER JOIN BMC.dbo.MASCOSTCENTER c ON c.DepartID = b.DepartID
     LEFT OUTER JOIN (SELECT * FROM BMC.dbo.hris_Leave_Prop_Detail WHERE IsActive='1') d ON d.PropId = a.Id
     LEFT OUTER JOIN BMC.dbo.hris_Leave_Prop e ON e.Id = d.PropId
     WHERE a.LeaveStatus='3' AND a.IsMassLeave='0' AND ${dateFilter}`,
    params
  );

  return { data: rows.map((r) => ({ ...trimRow(r), DATE: dmy(r.ActualDate) })) };
}

/** Padanan massal_datatable() hris.php 2338-2382. */
async function massal({ DateStart, DateEnd } = {}) {
  const params = {};
  let dateFilter;
  if (DateStart && DateEnd) {
    params.dateStart = DateStart;
    params.dateEnd = DateEnd;
    dateFilter = 'CAST(ActualDate AS date) BETWEEN @dateStart AND @dateEnd';
  } else {
    params.today = ymd();
    dateFilter = 'CAST(ActualDate AS date) = @today';
  }

  const rows = await query(
    `SELECT d.ActualDate, a.LeaveRemark
     FROM BMC.dbo.vw_hris_Leave_Transaction a
     LEFT OUTER JOIN (SELECT * FROM BMC.dbo.hris_Leave_Prop_Detail WHERE IsActive='1') d ON d.PropId = a.Id
     LEFT OUTER JOIN BMC.dbo.hris_Leave_Prop e ON e.Id = d.PropId
     WHERE a.IsMassLeave='1' AND ${dateFilter}
     GROUP BY ActualDate, LeaveRemark`,
    params
  );

  return { data: rows.map((r) => ({ ...trimRow(r), DATE: dmy(r.ActualDate) })) };
}

/** Padanan getEmpLeaveDay($where) M_hris.php 326-362. `nip` opsional. */
async function day(nip) {
  const params = {};
  let where = '';
  if (nip) {
    params.nip = nip;
    where = 'AND t1.NIP = @nip';
  }

  return query(
    `SELECT t1.NIP, t1.Name,
            t1.BegPeriod AS PeriodeAwalTahunan, t1.EndPeriod AS PeriodeAkhirTahunan,
            t2.BegPeriod AS PeriodeAwalBesar,   t2.EndPeriod AS PeriodeAkhirBesar,
            t1.Saldo + t1.Transaksi AS Tahunan,
            t2.Saldo + t2.Transaksi AS Besar,
            t1.Transaksi AS TrxTahunan,
            t2.Transaksi AS TrxBesar,
            t1.Saldo AS SaldoBesar,
            t2.Saldo AS SaldoTahunan
     FROM BMC.dbo.vw_hris_Leave_Saldo t1
     INNER JOIN BMC.dbo.vw_hris_Leave_Saldo t2
       ON t1.NIP = t2.NIP AND t1.LeaveType = '1' AND t1.LeaveType != t2.LeaveType
     ${where}
     GROUP BY t1.NIP, t1.Name, t1.BegPeriod, t1.EndPeriod, t2.BegPeriod, t2.EndPeriod,
              t1.Saldo, t2.Saldo, t1.Transaksi, t2.Transaksi`,
    params
  );
}

// Padanan generate_cuti() M_hris.php 8-21: dua insert GETDATE(), tanpa input user.
const GENERATE_SQL = `
  INSERT INTO [BMC].dbo.hris_Leave_Day (NIP,CalcDate,BegPeriod,EndPeriod,LeaveType,LeaveDays,InpBy)
  SELECT NIP,getdate(),convert(date,(dateadd(year, -1, getdate()))),CONVERT (date, GETDATE()-1),
         '1','9','System'
  FROM [BMC].dbo.hris_Leave_Day
  WHERE LeaveType='1' AND BegPeriod=convert(date,(dateadd(year, -2, getdate())));

  INSERT INTO [BMC].dbo.hris_Leave_Day (NIP,CalcDate,BegPeriod,EndPeriod,LeaveType,LeaveDays,InpBy)
  SELECT NIP,getdate(),convert(date,(dateadd(year, -6, getdate()))),CONVERT (date, GETDATE()-1),
         '2','30','System'
  FROM [BMC].dbo.hris_Leave_Day
  WHERE LeaveType='2' AND BegPeriod=convert(date,(dateadd(year, -12, getdate())));`;

/** Padanan generate_cuti() hris.php 38-42 + model 8-21. */
async function generate() {
  await execute(GENERATE_SQL);
  sendWa('081977785738', 'Generate Cuti Running BMC!!!');
  return { ok: true };
}

/** Padanan infoCutiGroupHeadDeptHead() hris.php 2554-2586. */
async function notifyHeads() {
  const date = ymd();

  const cuti = await query(
    `SELECT a.*, b.NIP, c.Name, e.Joblevel, f.JobSeq
     FROM hris_Leave_Prop_Detail a
     LEFT JOIN hris_Leave_Prop b ON a.PropId = b.Id
     LEFT JOIN hris_Employee c ON b.NIP = c.NIP
     LEFT JOIN hris_EmployeeCareerPath d ON b.NIP = d.NIP
     LEFT JOIN hris_Jobtitle e ON d.Id_Jobtitle = e.Id_Jobtitle
     LEFT JOIN hris_Joblevel f ON e.Joblevel = f.Joblevel
     WHERE ActualDate = @date AND f.JobSeq < 5 AND d.is_Archive = 0
     ORDER BY f.JobSeq`,
    { date }
  );

  let notified = 0;
  for (const v of cuti) {
    const nip = v.NIP;
    const name = typeof v.Name === 'string' ? v.Name.trim() : v.Name;

    const bawahan = await query(
      `SELECT a.*, b.Phone
       FROM hris_GetDownLevel(@nip) a
       LEFT JOIN hris_Employee b ON a.NIP = b.NIP
       WHERE JobSeq < 5`,
      { nip }
    );

    for (const w of bawahan) {
      if (!w.Phone) continue; // deviasi kecil: skip nomor kosong agar tidak kirim ke "undefined".
      const message = `*HRIS System*\nDiberitahukan kepada anda bahwa hari ini atasan anda \n*${name}*\nsedang cuti.\nTerima Kasih`;
      sendWa(w.Phone, message);
      notified += 1;
    }
  }

  return { notified };
}

/** Padanan updateLeaveStatus() M_hris.php 393-396. */
async function approval({ NIP, PropStartDate } = {}) {
  if (!NIP || !PropStartDate) throw httpError(400, 'NIP dan PropStartDate wajib diisi');
  const result = await execute(
    'UPDATE [BMC].[dbo].[hris_Leave_Prop] SET ApprovedStatus = 2 WHERE NIP = @NIP AND PropStartDate = @PropStartDate',
    { NIP, PropStartDate }
  );
  return { updated: result.rowsAffected?.[0] ?? 0 };
}

/** Padanan updateEmpTemp() M_hris.php 398-401. */
async function temporaryConfirm({ NIP, InpDate } = {}) {
  if (!NIP || !InpDate) throw httpError(400, 'NIP dan InpDate wajib diisi');
  const result = await execute(
    'UPDATE [BMC].[dbo].[hris_EmployeeTemp] SET Status = 2 WHERE NIP = @NIP AND InpDate = @InpDate',
    { NIP, InpDate }
  );
  return { updated: result.rowsAffected?.[0] ?? 0 };
}

/** Daftar karyawan aktif untuk dropdown NIP. */
function employees() {
  return query(
    `SELECT NIP, RTRIM(Name) AS Name FROM BMC.dbo.hris_Employee WHERE is_Active = '1' ORDER BY Name`
  );
}

/** Saldo cuti tahunan (LeaveType=1) per karyawan: awal, transaksi, sisa. */
function balance() {
  return query(
    `SELECT v.NIP, RTRIM(v.Name) AS Name, v.BegPeriod, v.EndPeriod,
            (v.Saldo + v.Transaksi) AS SaldoAwal, v.Transaksi AS Transaksi, v.Saldo AS Sisa
       FROM BMC.dbo.vw_hris_Leave_Saldo v
      WHERE v.LeaveType = 1
      ORDER BY v.Name`
  );
}

/**
 * Tambah cuti. Saat Cuti Tahunan (type '1') ditambahkan, Cuti Besar (type '2')
 * otomatis dibuat: periode 6 tahun, dimulai 7 tahun sebelum awal tahunan.
 */
async function addLeaveDay({ NIP, LeaveType, BegPeriod, EndPeriod, LeaveDays, InpBy } = {}) {
  if (!NIP || !BegPeriod) throw httpError(400, 'NIP dan Beg Period wajib diisi');
  const type = String(LeaveType || '1');
  const beg = BegPeriod;
  const end = EndPeriod || null;
  const days = Number(LeaveDays) || (type === '2' ? 30 : 9);

  await execute(
    `INSERT INTO BMC.dbo.hris_Leave_Day (NIP, CalcDate, BegPeriod, EndPeriod, LeaveType, LeaveDays, InpBy)
     VALUES (@NIP, getdate(), @BegPeriod, @EndPeriod, @LeaveType, @LeaveDays, @InpBy)`,
    { NIP, BegPeriod: beg, EndPeriod: end, LeaveType: type, LeaveDays: days, InpBy: InpBy || 'System' }
  );

  if (type === '1') {
    await execute(
      `INSERT INTO BMC.dbo.hris_Leave_Day (NIP, CalcDate, BegPeriod, EndPeriod, LeaveType, LeaveDays, InpBy)
       VALUES (@NIP, getdate(), dateadd(year, -7, @BegPeriod), dateadd(day, -1, dateadd(year, -1, @BegPeriod)),
               '2', 30, @InpBy)`,
      { NIP, BegPeriod: beg, InpBy: InpBy || 'System' }
    );
  }

  return { ok: true, nip: NIP, type };
}

/** Ubah satu record cuti (dikenali NIP + LeaveType + BegPeriod). */
async function updateLeaveDay({ NIP, LeaveType, BegPeriod, NewBegPeriod, EndPeriod, LeaveDays, UpdBy } = {}) {
  if (!NIP || !LeaveType || !BegPeriod) throw httpError(400, 'NIP, tipe, dan periode wajib diisi');
  const result = await execute(
    `UPDATE BMC.dbo.hris_Leave_Day
        SET BegPeriod = @NewBeg, EndPeriod = @End, LeaveDays = @Days, UpdDate = getdate(), UpdBy = @UpdBy
      WHERE NIP = @NIP AND LeaveType = @LeaveType AND CAST(BegPeriod AS date) = CAST(@BegPeriod AS date)`,
    {
      NIP,
      LeaveType: String(LeaveType),
      BegPeriod,
      NewBeg: NewBegPeriod || BegPeriod,
      End: EndPeriod || null,
      Days: Number(LeaveDays) || 0,
      UpdBy: UpdBy || 'System',
    }
  );
  return { ok: true, rowsAffected: result.rowsAffected?.[0] ?? 0 };
}

/** Hapus satu record cuti (dikenali NIP + LeaveType + BegPeriod). */
async function deleteLeaveDay({ NIP, LeaveType, BegPeriod } = {}) {
  if (!NIP || !LeaveType || !BegPeriod) throw httpError(400, 'NIP, tipe, dan periode wajib diisi');
  const result = await execute(
    `DELETE FROM BMC.dbo.hris_Leave_Day
      WHERE NIP = @NIP AND LeaveType = @LeaveType AND CAST(BegPeriod AS date) = CAST(@BegPeriod AS date)`,
    { NIP, LeaveType: String(LeaveType), BegPeriod }
  );
  return { ok: true, rowsAffected: result.rowsAffected?.[0] ?? 0 };
}

const EMERGENCY_REMARK = 'Cuti Emergency - Generate By Admin HR';

/** Daftar cuti dadakan (detail ber-Remark Emergency), dikelompokkan per pengajuan. */
function sudden() {
  return query(
    `SELECT p.NIP, RTRIM(e.Name) AS Name,
            MIN(d.ActualDate) AS StartDate, MAX(d.ActualDate) AS EndDate,
            COUNT(*) AS Days, MAX(p.Remark) AS Reason
       FROM BMC.dbo.hris_Leave_Prop_Detail d
       INNER JOIN BMC.dbo.hris_Leave_Prop p ON p.Id = d.PropId
       LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = p.NIP
      WHERE d.Remark LIKE '%Emergency%'
      GROUP BY p.Id, p.NIP, e.Name
      ORDER BY MIN(d.ActualDate) DESC`
  );
}

/** Tambah cuti dadakan: 1 pengajuan + detail per hari (ditandai Remark Emergency). */
async function addSudden({ NIP, StartDate, EndDate, Remark, InpBy } = {}) {
  if (!NIP || !StartDate) throw httpError(400, 'NIP dan tanggal wajib diisi');
  const end = EndDate || StartDate;
  const id = `C.${NIP}.${Math.floor(Date.now() / 1000)}`;

  await execute(
    `INSERT INTO BMC.dbo.hris_Leave_Prop (Id, NIP, LeaveType, Remark, IsMassLeave, InpDate)
     VALUES (@Id, @NIP, 1, @Remark, 0, getdate())`,
    { Id: id, NIP, Remark: String(Remark ?? '').trim() }
  );

  const days = await query(
    `;WITH d AS (
        SELECT CAST(@Start AS date) AS dt
        UNION ALL SELECT DATEADD(day, 1, dt) FROM d WHERE dt < CAST(@End AS date)
     ) SELECT dt FROM d OPTION (MAXRECURSION 400)`,
    { Start: StartDate, End: end }
  );

  for (const r of days) {
    await execute(
      `INSERT INTO BMC.dbo.hris_Leave_Prop_Detail (PropId, ProposeDate, ActualDate, IsActive, Remark, UpdDate, UpdBy)
       VALUES (@PropId, @dt, @dt, 1, @Remark, getdate(), @UpdBy)`,
      { PropId: id, dt: r.dt, Remark: EMERGENCY_REMARK, UpdBy: InpBy || 'Admin HR' }
    );
  }

  return { ok: true, id, days: days.length };
}

module.exports = { transactions, massal, day, generate, notifyHeads, approval, temporaryConfirm, employees, balance, addLeaveDay, updateLeaveDay, deleteLeaveDay, sudden, addSudden };
