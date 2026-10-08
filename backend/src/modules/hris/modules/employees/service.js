const { query, queryOne, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const n = (v) => (v === undefined ? null : v);
const last4 = (v) => String(v == null ? '' : v).slice(-4);

/** Pencarian karyawan untuk autocomplete Emp Data (read-only). */
async function searchEmployees(term, limit = 10) {
  const q = String(term ?? '').trim();
  if (q.length < 2) return [];
  return query(
    `SELECT TOP (@limit) a.NIP, RTRIM(a.Name) AS Name,
            ISNULL(m.NamaDepartemen, '-') AS Department
     FROM BMC.dbo.hris_Employee a
     LEFT JOIN BMC.dbo.MASCOSTCENTER m ON a.DepartID = m.DepartID
     WHERE a.is_Active = '1' AND (a.Name LIKE @like OR a.NIP LIKE @like)
     ORDER BY a.Name`,
    { limit: Number(limit) || 10, like: `%${q}%` }
  );
}


async function getEmployee(nipParam, idParam) {
  let nip;
  let id;

  if (nipParam !== undefined && nipParam !== null && nipParam !== '') {
    nip = String(nipParam).slice(-4);
    id = n(idParam);
  } else {
    const last = await queryOne(
      'SELECT TOP 1 * FROM BMC.dbo.hris_Employee ORDER BY Id_Employee DESC'
    );
    nip = last ? last.NIP : null;
    id = last ? last.Id_Employee : null;
  }

  const emp = await query(
    `select
       case when is_Active = '1' then 'Active' else 'InActive' end as isActive,
       case when Gender = 'L' then 'Laki-Laki' else 'Perempuan' end as gen,
       case when EmployeeStatus = 'P' then 'Permanent' else 'Contract' end as stt,
       case when MaritalStatus = 'K' then 'Kawin' else 'Tidak Kawin' end as marit,
       *
     from [BMC].dbo.hris_Employee a
     left join [BMC].dbo.MASCOSTCENTER b on a.DepartID = b.DepartID
     where NIP = @nip and is_Active = '1'`,
    { nip }
  );

  const car = await query(
    `select Id_CareerPath, a.NIP, b.Jobtitle, a.StartDate, a.EndDate, d.CategoryName,
            case when a.is_Archive = '0' then 'Active' else 'InActive' end as stat,
            c.Joblevel
     from [BMC].dbo.hris_EmployeeCareerPath a
     inner join [BMC].dbo.hris_Jobtitle b on a.Id_Jobtitle = b.Id_Jobtitle
     inner join [BMC].dbo.hris_Joblevel c on b.Joblevel = c.Joblevel
     inner join [BMC].dbo.hris_Category d on b.Id_Category = d.Id_Category
     where a.NIP = @nip order by a.StartDate desc`,
    { nip }
  );

  const edu = await query(
    'select * from [BMC].dbo.hris_EmployeeEducation WHERE NIP = @nip',
    { nip }
  );

  const fam = await query(
    'select * from [BMC].dbo.hris_EmployeeFamily WHERE NIP = @nip',
    { nip }
  );

  const tra = await query(
    'select * from [BMC].dbo.hris_EmployeeTraining WHERE NIP = @nip order by Id_EmpTraining desc',
    { nip }
  );

  const exp = await query(
    'select * from [BMC].dbo.hris_EmployeeExperience WHERE NIP = @nip order by StartDate desc',
    { nip }
  );

  const dept = await query(
    `select * from [BMC].dbo.MASCOSTCENTER
     WHERE LevelDepartemen = 'Departemen' OR LevelDepartemen = 'Sub Departemen'
        OR LevelDepartemen = 'Board Of Director'
     order by Id_Division, DepartID`
  );

  const abs = await query(
    `select *, case when STATUS = '1' then 'IN' else 'OUT' end as stt,
            case when ISWFH = '1' then 'WFH' else 'WFO' end as wf
     from [BMC].dbo.bpionline_absensi where right(NIP, 4) = @nip`,
    { nip }
  );

  return { emp, car, edu, fam, tra, exp, dept, abs, id, nip };
}

const PROFILE_COLS = [
  ['Name', 'name'],
  ['Addressdomisili', 'adddom'],
  ['Keldomisili', 'keldom'],
  ['Kecdomisili', 'kecdom'],
  ['KabKotadomisili', 'kabkotadom'],
  ['Provincedomisili', 'provdom'],
  ['NIK', 'nik'],
  ['Address', 'add'],
  ['Kelurahan', 'kel'],
  ['Kecamatan', 'kec'],
  ['KabupatenKota', 'kabkota'],
  ['PostalCode', 'pos'],
  ['Province', 'prov'],
  ['Phone', 'ph'],
  ['Email', 'em'],
  ['BirthPlace', 'bpl'],
  ['BirthDate', 'bd'],
  ['Gender', 'gen'],
  ['MaritalStatus', 'mar'],
  ['Child', 'ch'],
  ['Religion', 'aga'],
  ['EmployeeStatus', 'stt'],
  ['NPWP', 'npwp'],
  ['NRIC', 'nric'],
  ['BPJSTK', 'bpjstk'],
  ['BPJSKS', 'bpjsks'],
  ['FirstWorkingDate', 'fwo'],
  ['WorkingDate', 'wo'],
  ['DepartID', 'dept'],
  ['is_Active', 'act'],
];

function profileParams(b) {
  const params = {};
  for (const [col, src] of PROFILE_COLS) params[col] = n(b[src]);
  return params;
}

async function insertProfile(b) {
  const cols = ['NIP', ...PROFILE_COLS.map(([c]) => c)];
  const binds = ['@NIP', ...PROFILE_COLS.map(([c]) => `@${c}`)];
  await execute(
    `INSERT INTO BMC.dbo.hris_Employee (${cols.join(', ')})
     VALUES (${binds.join(', ')})`,
    { NIP: n(b.nip), ...profileParams(b) }
  );
  return { ok: true, nip: last4(b.nip) };
}

async function updateProfile(nip, b) {
  const sets = PROFILE_COLS.map(([c]) => `${c} = @${c}`).join(', ');
  await execute(
    `UPDATE BMC.dbo.hris_Employee SET ${sets} WHERE NIP = @nip`,
    { nip: n(nip), ...profileParams(b) }
  );
  return { ok: true, nip: last4(nip) };
}

async function insertRecord(b) {
  const type = String(b.id);
  const nip = n(b.nip);

  switch (type) {
    case '2': {
      const [idJobtitle, jobtitle] = String(b.Id_Jobtitle || '').split('|');
      await execute(
        `INSERT INTO BMC.dbo.hris_EmployeeCareerPath
           (NIP, Id_Jobtitle, Jobtitle, StartDate, EndDate, CategoryName, is_Archive)
         VALUES (@NIP, @Id_Jobtitle, @Jobtitle, @StartDate, @EndDate, @CategoryName, @is_Archive)`,
        {
          NIP: nip,
          Id_Jobtitle: n(idJobtitle),
          Jobtitle: n(jobtitle),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
          CategoryName: n(b.CategoryName),
          is_Archive: n(b.is_Archive),
        }
      );
      break;
    }
    case '3':
      await execute(
        `INSERT INTO BMC.dbo.hris_EmployeeEducation
           (NIP, EducationLevel, Institution, Major, StartDate, EndDate)
         VALUES (@NIP, @EducationLevel, @Institution, @Major, @StartDate, @EndDate)`,
        {
          NIP: nip,
          EducationLevel: n(b.EducationLevel),
          Institution: n(b.Institution),
          Major: n(b.Major),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
        }
      );
      break;
    case '4':
      await execute(
        `INSERT INTO BMC.dbo.hris_EmployeeFamily
           (NIP, NIK, Name, Gender, BirthPlace, BirthDate, FamilyRelation, EducationLevel, Major)
         VALUES (@NIP, @NIK, @Name, @Gender, @BirthPlace, @BirthDate, @FamilyRelation, @EducationLevel, @Major)`,
        {
          NIP: nip,
          NIK: n(b.NIK),
          Name: n(b.Name),
          Gender: n(b.Gender),
          BirthPlace: n(b.BirthPlace),
          BirthDate: n(b.BirthDate),
          FamilyRelation: n(b.FamilyRelation),
          EducationLevel: n(b.EducationLevel),
          Major: n(b.Major),
        }
      );
      break;
    case '5':
      await execute(
        `INSERT INTO BMC.dbo.hris_EmployeeTraining
           (NIP, TrainingSubject, Institution, StartDate, EndDate, Duration)
         VALUES (@NIP, @TrainingSubject, @Institution, @StartDate, @EndDate, @Duration)`,
        {
          NIP: nip,
          TrainingSubject: n(b.TrainingSubject),
          Institution: n(b.Institution),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
          Duration: n(b.Duration),
        }
      );
      break;
    case '6':
      await execute(
        `INSERT INTO BMC.dbo.hris_EmployeeExperience
           (NIP, Company, Jobtitle, Address, Phone, StartDate, EndDate)
         VALUES (@NIP, @Company, @Jobtitle, @Address, @Phone, @StartDate, @EndDate)`,
        {
          NIP: nip,
          Company: n(b.Company),
          Jobtitle: n(b.Jobtitle),
          Address: n(b.Address),
          Phone: n(b.Phone),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
        }
      );
      break;
    default:
      throw httpError(400, 'id tidak valid');
  }

  return { ok: true, id: type, nip: last4(b.nip) };
}

async function updateRecord(rowId, b) {
  const type = String(b.id);

  switch (type) {
    case '2': {
      const [idJobtitle, jobtitle] = String(b.Id_Jobtitle || '').split('|');
      await execute(
        `UPDATE BMC.dbo.hris_EmployeeCareerPath SET
           Id_Jobtitle = @Id_Jobtitle, Jobtitle = @Jobtitle, StartDate = @StartDate,
           EndDate = @EndDate, CategoryName = @CategoryName, is_Archive = @is_Archive
         WHERE Id_CareerPath = @rowId`,
        {
          rowId: n(rowId),
          Id_Jobtitle: n(idJobtitle),
          Jobtitle: n(jobtitle),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
          CategoryName: n(b.CategoryName),
          is_Archive: n(b.is_Archive),
        }
      );
      break;
    }
    case '3':
      await execute(
        `UPDATE BMC.dbo.hris_EmployeeEducation SET
           EducationLevel = @EducationLevel, Institution = @Institution, Major = @Major,
           StartDate = @StartDate, EndDate = @EndDate
         WHERE Id_EmpEdu = @rowId`,
        {
          rowId: n(rowId),
          EducationLevel: n(b.EducationLevel),
          Institution: n(b.Institution),
          Major: n(b.Major),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
        }
      );
      break;
    case '4':
      await execute(
        `UPDATE BMC.dbo.hris_EmployeeFamily SET
           NIK = @NIK, Name = @Name, Gender = @Gender, BirthPlace = @BirthPlace,
           BirthDate = @BirthDate, FamilyRelation = @FamilyRelation,
           EducationLevel = @EducationLevel, Major = @Major
         WHERE Id_Empfamily = @rowId`,
        {
          rowId: n(rowId),
          NIK: n(b.NIK),
          Name: n(b.Name),
          Gender: n(b.Gender),
          BirthPlace: n(b.BirthPlace),
          BirthDate: n(b.BirthDate),
          FamilyRelation: n(b.FamilyRelation),
          EducationLevel: n(b.EducationLevel),
          Major: n(b.Major),
        }
      );
      break;
    case '5':
      await execute(
        `UPDATE BMC.dbo.hris_EmployeeTraining SET
           TrainingSubject = @TrainingSubject, Institution = @Institution,
           StartDate = @StartDate, EndDate = @EndDate, Duration = @Duration
         WHERE Id_EmpTraining = @rowId`,
        {
          rowId: n(rowId),
          TrainingSubject: n(b.TrainingSubject),
          Institution: n(b.Institution),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
          Duration: n(b.Duration),
        }
      );
      break;
    case '6':
      await execute(
        `UPDATE BMC.dbo.hris_EmployeeExperience SET
           Company = @Company, Jobtitle = @Jobtitle, Address = @Address, Phone = @Phone,
           JobDesc = @JobDesc, StartDate = @StartDate, EndDate = @EndDate
         WHERE Id_EmpEx = @rowId`,
        {
          rowId: n(rowId),
          Company: n(b.Company),
          Jobtitle: n(b.Jobtitle),
          Address: n(b.Address),
          Phone: n(b.Phone),
          JobDesc: n(b.JobDesc),
          StartDate: n(b.StartDate),
          EndDate: n(b.EndDate),
        }
      );
      break;
    default:
      throw httpError(400, 'id tidak valid');
  }

  return { ok: true, id: type };
}

const EDIT_TARGETS = {
  2: ['BMC.dbo.hris_EmployeeCareerPath', 'Id_CareerPath'],
  3: ['BMC.dbo.hris_EmployeeEducation', 'Id_EmpEdu'],
  4: ['BMC.dbo.hris_EmployeeFamily', 'Id_Empfamily'],
  5: ['BMC.dbo.hris_EmployeeTraining', 'Id_EmpTraining'],
  6: ['BMC.dbo.hris_EmployeeExperience', 'Id_EmpEx'],
};

async function getRecordEdit(id) {
  const [pk, type] = String(id == null ? '' : id).split('|');
  const target = EDIT_TARGETS[type];
  if (!target) throw httpError(400, 'id tidak valid');
  const [table, key] = target;
  return query(`select * from ${table} where ${key} = @pk`, { pk: n(pk) });
}

async function deleteRecord(pk, type) {
  const target = EDIT_TARGETS[String(type)];
  if (!target) throw httpError(400, 'type tidak valid');
  const [table, key] = target;
  await execute(`DELETE FROM ${table} WHERE ${key} = @pk`, { pk: n(pk) });
  return { ok: true, type: String(type) };
}

module.exports = { searchEmployees, getEmployee, insertProfile, updateProfile, insertRecord, updateRecord, getRecordEdit, deleteRecord };
