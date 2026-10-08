const { query } = require('../../db/pool.js');

function fmtDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function ageBounds() {
  const now = new Date();
  const sub = (n) => fmtDate(new Date(now.getFullYear() - n, now.getMonth(), now.getDate()));
  return { umur18: sub(18), umur30: sub(30), umur45: sub(45), umur55: sub(55) };
}

// M_hris::getEmpJoblevel (model:211)
function getEmpJoblevel(andSql = '', params = {}) {
  return query(
    `select a.WorkingDate,a.FirstWorkingDate,a.Phone,a.BirthPlace,a.BirthDate,a.EmployeeStatus,a.Gender,a.MaritalStatus,
      a.Child,a.NIP,a.Name,b.StartDate,b.is_Archive,b.Id_Jobtitle,b.Jobtitle,b.Joblevel,b.Division,b.is_Active,
      b.Id_Division,b.JobSeq from [BMC].dbo.hris_Employee a left join
      (select c.NIP,c.StartDate,c.is_Archive,a.*,b.JobSeq from [BMC].dbo.hris_Jobtitle a
       inner join [BMC].dbo.hris_Joblevel b on a.Joblevel=b.Joblevel
       inner join [BMC].dbo.[hris_EmployeeCareerPath] c on c.Id_Jobtitle=a.Id_Jobtitle) b on a.NIP=b.NIP
      where a.is_Active='1' AND b.is_Archive=0 ${andSql}`,
    params
  );
}

// M_hris::getEmpAll (model:224)
function getEmpAll(andSql = '', params = {}) {
  return query(`select a.* from [BMC].dbo.hris_Employee a where a.is_Active='1' ${andSql}`, params);
}

// M_hris::geteduactive (model:248)
function geteduactive(andSql = '', params = {}) {
  return query(
    `select a.Gender,a.EmployeeStatus,a.NIP,b.EndEdu,d.EducationLevel,d.Institution,d.Major,a.DeptID,c.DeptName,
      a.Name,a.BirthDate,a.HireDate from [BMC].dbo.hris_Employee a
      left join [BMC].dbo.HRIS_GETLASTEDU b on a.NIP=b.NIP
      left join [BMC].dbo.hris_DeptCode c on a.DeptID=c.DeptCode
      left join [BMC].dbo.hris_EmployeeEducation d on d.NIP=a.NIP and b.EndEdu=d.EduCode
      where a.is_Active='1' ${andSql}`,
    params
  );
}

// M_hris::geteduchart (model:272)
function geteduchart(andSql = '', params = {}) {
  return query(
    `select a.NIP,b.EndEdu,a.DeptID,c.DeptName,a.Name,a.BirthDate,a.HireDate,a.Gender,a.MaritalStatus,a.Child,
      a.EmployeeStatus from [BMC].dbo.hris_Employee a
      left join [BMC].dbo.HRIS_GETLASTEDU b on a.NIP=b.NIP
      left join [BMC].dbo.hris_DeptCode c on a.DeptID=c.DeptCode
      where a.is_Active='1' ${andSql} order by a.NIP`,
    params
  );
}

function getEmpjabatanlevel(nip) {
  return query(
    `select d.JobSeq,a.NIP,upper(b.Division)as Division,c.Name,a.StartDate,a.EndDate,a.Jobtitle,b.Joblevel,CategoryName
     from [BMC].dbo.hris_EmployeeCareerPath a
     left join [BMC].dbo.hris_Jobtitle b on a.Id_Jobtitle=b.Id_Jobtitle
     left join [BMC].dbo.hris_Employee c on a.NIP=c.NIP
     left join [BMC].dbo.hris_Joblevel d on b.Joblevel=d.Joblevel
     left join [BMC].dbo.hris_Category e on a.Id_Category=e.Id_Category
     where a.NIP=@nip AND a.is_Archive=0 order by Id_CareerPath`,
    { nip: nip ?? '' }
  );
}

function getEmpEduAll(nip) {
  return query(
    `select a.*,b.Name from [BMC].dbo.hris_EmployeeEducation a
     left join [BMC].dbo.hris_Employee b on a.NIP=b.NIP
     where a.NIP=@nip order by Id_EmpEdu`,
    { nip: nip ?? '' }
  );
}

function getEmpTraining(nip) {
  return query(
    `select a.*,b.Name from [BMC].dbo.hris_EmployeeTraining a
     left join [BMC].dbo.hris_Employee b on a.NIP=b.NIP
     where a.NIP=@nip order by Id_EmpTraining`,
    { nip: nip ?? '' }
  );
}

function getRetiredThisYear() {
  const year = new Date().getFullYear();
  return query(
    `select *,DATEDIFF(year, BirthDate, Getdate()) as umur from [BMC].dbo.hris_Employee
       where DATEDIFF(year, BirthDate, Getdate()) >= 54 and YEAR(InactiveDate) = @year
     UNION ALL
     select *,DATEDIFF(year, BirthDate, Getdate()) as umur from [BMC].dbo.hris_Employee
       where DATEDIFF(year, BirthDate, Getdate()) = 55 and EmployeeStatus='C'
     UNION ALL
     select *,DATEDIFF(year, BirthDate, Getdate()) as umur from [BMC].dbo.hris_Employee
       where DATEDIFF(year, BirthDate, Getdate()) = 55 and is_Active=1 and EmployeeStatus='P'`,
    { year }
  );
}

// education() hris.php:747
async function education(id, desc) {
  const isZero = id === undefined || id === null || id === '' || id === 0 || String(id) === '0';
  let data;
  let konL = null;
  let konP = null;
  let tetL = null;
  let tetP = null;
  if (isZero) {
    data = await geteduactive('and b.EndEdu is NULL');
  } else {
    const params = { edu: id };
    data = await geteduactive('and b.EndEdu=@edu', params);
    konL = await geteduchart("and b.EndEdu=@edu and a.EmployeeStatus<>'P' and a.Gender='L'", params);
    konP = await geteduchart("and b.EndEdu=@edu and a.EmployeeStatus<>'P' and a.Gender='P'", params);
    tetL = await geteduchart("and b.EndEdu=@edu and a.EmployeeStatus='P' and a.Gender='L'", params);
    tetP = await geteduchart("and b.EndEdu=@edu and a.EmployeeStatus='P' and a.Gender='P'", params);
  }
  return { data, desc, konL, konP, tetL, tetP };
}

// education_dept() hris.php:763
async function educationDept(idDept, edu) {
  const params = { id: idDept };
  let data2;
  if (edu === undefined || edu === null || edu === '') {
    data2 = '';
  } else if (String(edu) === '0') {
    data2 = await geteduactive('and DeptID=@id and EndEdu is NULL', params);
  } else {
    data2 = await geteduactive('and DeptID=@id and EndEdu=@edu', { id: idDept, edu });
  }
  const data = await geteduactive('and DeptID=@id', params);
  return { data, data2, id: idDept };
}

// age() hris.php:779
async function age(id) {
  const p = ageBounds();
  let where = null;
  let params = {};
  if (id === '18 - 30') {
    where = "WHERE is_Active='1' and BirthDate<=@umur18 and BirthDate>=@umur30";
    params = { umur18: p.umur18, umur30: p.umur30 };
  } else if (id === '>30 - 45') {
    where = "WHERE is_Active='1' and BirthDate<@umur30 and BirthDate>=@umur45";
    params = { umur30: p.umur30, umur45: p.umur45 };
  } else if (id === '>45 - 55') {
    where = "WHERE is_Active='1' and BirthDate<@umur45 and BirthDate>=@umur55";
    params = { umur45: p.umur45, umur55: p.umur55 };
  } else if (id === '>55') {
    where = "WHERE is_Active='1' and BirthDate<@umur55";
    params = { umur55: p.umur55 };
  }
  const data = where ? await query(`SELECT * FROM [BMC].dbo.hris_Employee ${where}`, params) : undefined;
  return { data, id };
}

// status_kar() hris.php:798
function employeeStatus(id, name, jen) {
  return { id, title: name, status: { PERMANEN: 'P', CONTRACT: 'C' }, jen };
}

function genStatus(gen, stat, totpri) {
  let ss = 'and a.EmployeeStatus=@status';
  let gf = String(gen) === 'all' ? '' : 'and a.Gender=@gender';
  const params = { status: stat ?? '', gender: gen ?? '' };
  if (String(totpri) === '1') {
    ss = '';
  } else if (String(totpri) === '2') {
    ss = '';
    gf = '';
  }
  return { ss, gf, params };
}

// leveldua() hris.php:806
async function leveldua({ id, gen, stat, jen, totpri }) {
  const { ss, gf, params } = genStatus(gen, stat, totpri);
  const withId = { ...params, id };

  if (jen === 'job') {
    const data = await getEmpJoblevel(`and b.JobSeq=@id ${gf} ${ss}`, withId);
    const doubleJob = await query(
      'select NIP,SUM(1) from [BMC].[dbo].[hris_EmployeeCareerPath] Where is_Archive=0 GROUP BY NIP HAVING SUM(1)>1'
    );
    return { data, jen, doubleJob };
  }

  if (jen === 'edu') {
    const data = await geteduactive(
      `and CASE WHEN b.EndEdu is null THEN 0 else b.EndEdu end=@id ${gf} ${ss}`,
      withId
    );
    return { data, jen };
  }

  if (jen === 'age') {
    const p = ageBounds();
    let and = '';
    const pp = { ...params };
    if (id === '18 - 30') {
      and = 'and a.BirthDate<=@umur18 and a.BirthDate>=@umur30';
      pp.umur18 = p.umur18;
      pp.umur30 = p.umur30;
    } else if (id === '>30 - 45') {
      and = 'and a.BirthDate<@umur30 and a.BirthDate>=@umur45';
      pp.umur30 = p.umur30;
      pp.umur45 = p.umur45;
    } else if (id === '>45 - 55') {
      and = 'and BirthDate<@umur45 and BirthDate>=@umur55';
      pp.umur45 = p.umur45;
      pp.umur55 = p.umur55;
    } else if (id === '>55') {
      and = 'and BirthDate<@umur55';
      pp.umur55 = p.umur55;
    }
    const data = await getEmpAll(` ${and} ${gf} ${ss} `, pp);
    return { data, jen };
  }

  if (jen === 'period') {
    let and = '';
    if (id === '< 10') {
      and = 'and DATEDIFF(YY,WorkingDate,GETDATE()) < 10';
    } else if (id === '>10 - 25') {
      and = 'and DATEDIFF(YY,WorkingDate,GETDATE()) > 10 and DATEDIFF(YY,WorkingDate,GETDATE()) < 25';
    } else if (id === '>25 - 35') {
      and = 'and DATEDIFF(YY,WorkingDate,GETDATE()) > 25 and DATEDIFF(YY,WorkingDate,GETDATE()) < 35';
    } else if (id === '>35') {
      and = 'and DATEDIFF(YY,WorkingDate,GETDATE()) > 35';
    }
    const data = await getEmpAll(` ${and} ${gf} ${ss}`, params);
    return { data, jen };
  }

  return { data: undefined, jen };
}

// levelfamily() hris.php:864
async function levelFamily(nip) {
  const data = await query(
    'SELECT * FROM [BMC].dbo.hris_EmployeeFamily WHERE NIP=@nip',
    { nip: nip ?? '' }
  );
  return { data };
}

// leveltiga() hris.php:871
async function levelTiga(nip) {
  return { data: await getEmpjabatanlevel(nip) };
}

// levelempat() hris.php:877
async function levelEmpat(nip) {
  return { data: await getEmpEduAll(nip) };
}

// leveltraining() hris.php:883
async function levelTraining(nip) {
  return { data: await getEmpTraining(nip) };
}

// employee() hris.php:889
async function employees(id) {
  const base = "SELECT *,DATEDIFF(year, BirthDate, Getdate()) as umur FROM [BMC].dbo.hris_Employee WHERE is_Active='1'";
  let data = await query(base);
  if (id === 'L') data = await query(`${base} and Gender='L'`);
  else if (id === 'P') data = await query(`${base} and Gender='P'`);
  const pria = await query(`${base} and Gender='L'`);
  const wanita = await query(`${base} and Gender='P'`);
  return { data, pria, wanita };
}

// retired() hris.php:904
async function retired(id, jobs) {
  let data;
  if (id === 'retired') {
    data = await getEmpJoblevel("and EmployeeStatus='C' and DATEDIFF(year, BirthDate, Getdate()) >='55'");
  } else if (id === 'jobseq') {
    data = await getEmpJoblevel(
      "and EmployeeStatus='P' and DATEDIFF(year, BirthDate, Getdate()) >='51' and DATEDIFF(year, BirthDate, Getdate()) <='55' and Joblevel=@joblvl",
      { joblvl: jobs }
    );
  } else if (id === 'history') {
    data = await getRetiredThisYear();
  } else {
    data = await getEmpJoblevel("and EmployeeStatus='P' and DATEDIFF(year, BirthDate, Getdate()) =@age", { age: id });
  }
  return { data };
}

// pkb() hris.php:1924
function pkb() {
  return { title: 'PKB 2019-2021' };
}

// dash_online() hris.php:730 (view statis, tanpa data)
function dashboardOnline() {
  return { ok: true };
}

module.exports = { education, educationDept, age, employeeStatus, leveldua, levelFamily, levelTiga, levelEmpat, levelTraining, employees, retired, pkb, dashboardOnline };
