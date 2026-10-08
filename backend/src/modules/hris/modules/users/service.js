const { query, queryOne, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const pad = (n) => String(n).padStart(2, '0');
const localYmd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDateTime = (d = new Date()) =>
  `${localYmd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const EMP_SELECT = `SELECT a.NIP, a.Name, b.Jobtitle, c.Joblevel, d.JobSeq, a.is_Active, a.DepartID, a.Phone, a.Email
  FROM BMC.dbo.hris_Employee a
  LEFT JOIN BMC.dbo.hris_EmployeeCareerPath b ON a.NIP = b.NIP
  LEFT JOIN BMC.dbo.hris_Jobtitle c ON b.Id_Jobtitle = c.Id_Jobtitle
  LEFT JOIN BMC.dbo.hris_Joblevel d ON c.Joblevel = d.Joblevel
  WHERE a.NIP = @emp AND b.is_Archive = 0 AND a.is_Active = 1`;

async function listPr() {
  const emp = await query(`SELECT a.NIP, a.Name, b.Jobtitle, c.Joblevel, d.JobSeq, a.is_Active, a.DepartID
    FROM BMC.dbo.hris_Employee a
    LEFT JOIN BMC.dbo.hris_EmployeeCareerPath b ON a.NIP = b.NIP
    LEFT JOIN BMC.dbo.hris_Jobtitle c ON b.Id_Jobtitle = c.Id_Jobtitle
    LEFT JOIN BMC.dbo.hris_Joblevel d ON c.Joblevel = d.Joblevel
    WHERE b.is_Archive = 0 AND a.is_Active = 1 AND a.NIP NOT IN (SELECT NIP FROM PURC_USER_PRONLINE)`);
  const user_pr = await query('SELECT * FROM BMC.dbo.PURC_USER_PRONLINE');
  return { emp, user_pr };
}

async function insertPr({ emp, password, role }) {
  if (!emp) throw httpError(400, 'emp wajib diisi');
  const row = await queryOne(EMP_SELECT, { emp });
  if (!row) throw httpError(404, 'Karyawan tidak ditemukan / tidak aktif');

  const username = row.NIP;
  const firstName = String(row.Name ?? '').replace(/'/g, '`');
  await execute(
    `INSERT INTO BMC.dbo.PURC_USER_PRONLINE (UserName, NIP, FirstName, Password, Hp, Email, CreatedDate, DeptId, Approve, Active, Executor)
     VALUES (@username, @username, @firstName, @password, @phone, @email, @createdDate, @deptId, @role, 1, 'Purchasing')`,
    {
      username,
      firstName,
      password: password ?? null,
      phone: row.Phone ?? null,
      email: row.Email ?? null,
      createdDate: localYmd(),
      deptId: row.DepartID ?? null,
      role: role ?? null,
    }
  );
  return { ok: true };
}

async function listEp() {
  const new_user = await query(
    `SELECT a.NIP AS NONIK, a.Name, b.NIP
     FROM BMC.dbo.hris_Employee a
     LEFT JOIN BMC.dbo.PURC_USER b ON a.NIP = b.NIP
     WHERE a.DepartID = '0600' AND a.NIP NOT IN (SELECT NIP FROM BMC.dbo.PURC_USER)`
  );
  const emp = await query('SELECT * FROM BMC.dbo.PURC_USER');
  return { new_user, emp };
}

async function insertEp({ emp, password }) {
  if (!emp) throw httpError(400, 'emp wajib diisi');
  const row = await queryOne('SELECT * FROM BMC.dbo.hris_Employee WHERE NIP = @nip', { nip: emp });
  if (!row) throw httpError(404, 'Karyawan tidak ditemukan');

  await execute(
    `INSERT INTO BMC.dbo.PURC_USER (UserId, Username, NIP, FirstName, Password, Hp, Email, CompCode, Executor, CreatedDate, Type, deptid)
     VALUES ('', @username, @nip, @firstName, @password, @hp, @email, '002', 'Purchasing', @createdDate, 0, @deptid)`,
    {
      username: row.NIP,
      nip: row.NIP,
      firstName: row.Name ?? null,
      password: password ?? null,
      hp: row.Phone ?? null,
      email: row.Email ?? null,
      createdDate: localDateTime(),
      deptid: row.DepartID ?? null,
    }
  );
  return { ok: true };
}

module.exports = { listPr, insertPr, listEp, insertEp };
