const { query, queryOne, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const trim = (v) => (v == null ? v : String(v).trim());
const bin2hex = (s) => Buffer.from(String(s), 'utf8').toString('hex');

function hex2bin(hex) {
  if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw httpError(400, 'Kode training tidak valid');
  }
  return Buffer.from(hex, 'hex').toString('utf8');
}

function splitCode(hex) {
  const dec = hex2bin(hex);
  const i = dec.indexOf('|');
  return i < 0 ? { subject: dec, startDate: '' } : { subject: dec.slice(0, i), startDate: dec.slice(i + 1) };
}

// Padanan hris/training()
async function summary() {
  return query(
    `SELECT TrainingSubject, Institution, count(NIP) as emp
       FROM [BMC].dbo.hris_EmployeeTraining
      GROUP BY TrainingSubject, Institution
      ORDER BY TrainingSubject`
  );
}

// Padanan hc_training_participants() default: daftar tahun distinct
async function participantYears() {
  return query(
    `select distinct year(StartDate) as tahun
       from BMC.dbo.hris_EmployeeTraining
      order by year(StartDate) desc`
  );
}

// Padanan action1=viewtable (?year=)
async function participantTable(year) {
  const params = {};
  let filter = '';
  if (year !== undefined && year !== null && year !== '') {
    if (!/^\d+$/.test(String(year))) throw httpError(400, 'Parameter year tidak valid');
    filter = 'and year(StartDate) = @year';
    params.year = Number(year);
  }

  const rows = await query(
    `select TrainingSubject, Institution, Duration, Participants,
            convert(varchar(10), StartDate, 105) as StartDateFmt,
            convert(varchar(10), EndDate, 105) as EndDateFmt,
            convert(varchar(10), StartDate, 23) as StartDateYmd
       from (
         select distinct TrainingSubject, Institution, StartDate, EndDate, Duration, count(TrainingSubject) as Participants
           from BMC.dbo.hris_EmployeeTraining
          group by TrainingSubject, Institution, StartDate, EndDate, Duration
         union all
         select distinct TrainingSubject, Institution, StartDate, EndDate, Duration, count(TrainingSubject) as Participants
           from BMC.dbo.hris_EmployeeTrainingIHT
          group by TrainingSubject, Institution, StartDate, EndDate, Duration
       ) tbl
      where TrainingSubject <> '' ${filter}
      order by tbl.StartDate desc`,
    params
  );

  return rows.map((r) => ({
    TrainingSubject: trim(r.TrainingSubject),
    Institution: trim(r.Institution),
    StartDate: r.StartDateFmt,
    EndDate: r.EndDateFmt,
    Duration: r.Duration,
    Participants: r.Participants,
    code: bin2hex(`${trim(r.TrainingSubject)}|${r.StartDateYmd}`),
  }));
}

// Padanan action1=training&action2=employee (?code=)
async function participantEmployees(code) {
  const training = await query(
    `select distinct NIP, TrainingSubject, convert(varchar(10), cast(StartDate as date), 23) as StartDate
       from BMC.dbo.hris_EmployeeTraining
      union all
     select distinct NIP, TrainingSubject, convert(varchar(10), cast(StartDate as date), 23) as StartDate
       from BMC.dbo.hris_EmployeeTrainingIHT`
  );
  const employee = await query(
    `select a.NIP, a.Name, a.Joblevel, a.DeptName
       from BMC.dbo.hris_EmployeeAnalisis() a
      inner join (
        select NIP, max(orders) as orders from BMC.dbo.hris_EmployeeAnalisis() group by NIP
      ) b on a.NIP = b.NIP and a.orders = b.orders
      order by a.Name`
  );

  if (!employee.length || !training.length) return [];

  let want = null;
  if (code) {
    const { subject, startDate } = splitCode(code);
    want = { subject: trim(subject), startDate: trim(startDate) };
  }
  const key = (nip, subject, startDate) => `${trim(nip)}|${trim(subject)}|${trim(startDate)}`;
  const tset = new Set(training.map((t) => key(t.NIP, t.TrainingSubject, t.StartDate)));

  return employee.map((row) => ({
    NIP: trim(row.NIP),
    Name: trim(row.Name),
    Joblevel: trim(row.Joblevel),
    DeptName: trim(row.DeptName),
    selected: want ? tset.has(key(row.NIP, want.subject, want.startDate)) : false,
  }));
}

// Padanan action1=training&action2=viewdetail (code = hex2bin "TrainingSubject|StartDate")
async function participantDetail(code) {
  const { subject, startDate } = splitCode(code);
  const row = await queryOne(
    `select Id_TrainingCat, Id_TrainingSubCat, TrainingSubject, Institution,
            convert(varchar(10), StartDate, 23) as StartDate,
            convert(varchar(10), EndDate, 23) as EndDate,
            Duration
       from (
         Select Id_TrainingCat, Id_TrainingSubCat, TrainingSubject, Institution, StartDate, EndDate, Duration
           from BMC.dbo.hris_EmployeeTraining
         union all
         Select Id_TrainingCat, Id_TrainingSubCat, TrainingSubject, Institution, StartDate, EndDate, Duration
           from BMC.dbo.hris_EmployeeTrainingIHT
       ) tbl
      where TrainingSubject = @subject and StartDate = @startDate`,
    { subject, startDate }
  );
  if (!row) return null;

  const out = {};
  for (const k of Object.keys(row)) out[k] = trim(row[k]);
  return out;
}

// Padanan action1=training&action2=add. `code` opsional (hex) untuk mode edit: hapus lalu insert.
async function addParticipant(body = {}) {
  const raw = body.NIP ?? body['NIP[]'] ?? [];
  const nips = Array.isArray(raw) ? raw : [raw];

  let table = 'BMC.dbo.hris_EmployeeTraining';
  if (trim(body.Institution) === 'IHT bap') table = 'BMC.dbo.hris_EmployeeTrainingIHT';

  const code = body.code || body.Code;
  if (code) {
    const { subject } = splitCode(code);
    await execute('DELETE FROM BMC.dbo.hris_EmployeeTraining WHERE TrainingSubject = @subject', { subject });
  }

  for (const nip of nips) {
    await execute(
      `INSERT INTO ${table} (Id_TrainingCat, Id_TrainingSubCat, TrainingSubject, Institution, StartDate, EndDate, NIP, Duration)
       VALUES (@Id_TrainingCat, @Id_TrainingSubCat, @TrainingSubject, @Institution, @StartDate, @EndDate, @NIP, @Duration)`,
      {
        Id_TrainingCat: body.Id_TrainingCat ?? null,
        Id_TrainingSubCat: body.Id_TrainingSubCat ?? null,
        TrainingSubject: body.TrainingSubject ?? null,
        Institution: body.Institution ?? null,
        StartDate: body.StartDate ?? null,
        EndDate: body.EndDate ?? null,
        NIP: nip,
        Duration: body.Duration ?? null,
      }
    );
  }

  return { message: 'Data Berhasil Disimpan' };
}

module.exports = { summary, participantYears, participantTable, participantEmployees, participantDetail, addParticipant };
