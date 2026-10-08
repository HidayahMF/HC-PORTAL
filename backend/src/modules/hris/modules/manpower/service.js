const { query, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const trim = (v) => (v == null ? v : String(v).trim());
const lower = (v) => String(v).toLowerCase();
const ucwords = (v) => String(v).replace(/(^|\s)([a-z])/g, (_, a, b) => a + b.toUpperCase());
const q = (obj) => new URLSearchParams(obj).toString();

// array_map(ucwords(strtolower(trim(v)))) -> null jadi '' (seperti trim(null) di PHP)
const mapUcwords = (row = {}) => {
  const out = {};
  for (const k of Object.keys(row)) out[k] = ucwords(lower(trim(row[k] ?? '')));
  return out;
};

// Padanan hris/man_resource(): kembalikan field HTML yang dipakai view hris/man_resource.php.
async function resource() {
  const empOrg = await query(
    `select DivisionName, DeptName, Joblevel, count(NIP) as Total from (
        select Id_Division, a.DivisionName, a.DeptName, a.Joblevel, a.NIP
          from BMC.dbo.hris_EmployeeAnalisis() a
          left outer join BMC.dbo.hris_Employee b on a.NIP = b.NIP
      ) a1
      where DivisionName is not null
      group by Id_Division, DivisionName, DeptName, Joblevel
      order by Id_Division, DivisionName, DeptName, Joblevel`
  );
  const empJob = await query('select * from BMC.dbo.hris_Joblevel');

  const tempData = {};
  const tempJabatan = [];
  const tempJobSeq = {};
  const arrtableContent = {};
  const arrtableFooter = {};
  const arrrowtotal = {};
  let tableHead_Lv1 = '';
  let tableHead_Lv2 = '';
  let tableBody = '';
  let tableFooter = '';
  let tableHead_Lv2_col = '';
  let endTotal = 0;

  for (const row of empJob) {
    const jl = trim(row.Joblevel);
    tempJabatan.push(jl);
    tempJobSeq[jl] = row.JobSeq;
  }
  for (const row of empOrg) {
    const div = trim(row.DivisionName);
    const dept = trim(row.DeptName);
    const lvl = trim(row.Joblevel);
    if (!tempData[div]) tempData[div] = {};
    if (!tempData[div][dept]) tempData[div][dept] = {};
    tempData[div][dept][lvl] = trim(row.Total);
  }

  for (const key of Object.keys(tempData)) {
    const key_Lv2 = tempData[key];
    const deptCount = Object.keys(key_Lv2).length;
    const colspan = deptCount === 1 ? '' : `colspan="${deptCount}"`;
    tableHead_Lv1 += `<th class="tableexport-string" style="text-align:center; background-color: #35838d; color: white;" ${colspan}>${ucwords(key)}</th>`;

    for (const index_key_Lv2 of Object.keys(key_Lv2)) {
      const key_Lv3 = key_Lv2[index_key_Lv2];
      const alias = index_key_Lv2 ? index_key_Lv2 : key;
      tableHead_Lv2 += `<th class="tableexport-string" style="text-align:center; background-color: #d64d55; color: white;">${ucwords(lower(alias))}</th>`;
      tableHead_Lv2_col += '<col style="width: 130px;"/>';

      for (const jbt of tempJabatan) {
        const rowJbt = trim(jbt);
        if (arrtableContent[rowJbt] === undefined) arrtableContent[rowJbt] = '';
        const val = key_Lv3[rowJbt];
        arrtableContent[rowJbt] +=
          val != null
            ? `<td><a href="man_resource_detail?${q({ div: key, dept: index_key_Lv2, lvl: rowJbt })}"><b>${val}</b></a></td>`
            : '<td>0</td>';

        if (arrtableFooter[key] === undefined) arrtableFooter[key] = {};
        if (arrtableFooter[key][alias] === undefined) arrtableFooter[key][alias] = 0;
        if (arrrowtotal[rowJbt] === undefined) arrrowtotal[rowJbt] = 0;

        const v = val != null ? Number(val) : 0;
        arrtableFooter[key][alias] += v;
        endTotal += v;
        arrrowtotal[rowJbt] += v;
      }
    }
  }

  for (const key of Object.keys(arrrowtotal)) {
    const value = arrrowtotal[key];
    arrtableContent[key] += value
      ? `<td><a href="man_resource_detail?${q({ lvl: key })}"><b>${value}</b></a></td>`
      : '<td>0</td>';
  }

  let i = 1;
  for (const key of Object.keys(arrtableContent)) {
    tableBody += `<tr><td>${i}</td><td class="tableexport-string"><a href="http://127.0.0.1/webapps/hris/pride?jblvl=${tempJobSeq[key]}">${ucwords(lower(key))}</a></td>${arrtableContent[key]}</tr>`;
    i += 1;
  }

  for (const key of Object.keys(arrtableFooter)) {
    for (const index_key_lv_1 of Object.keys(arrtableFooter[key])) {
      const value = arrtableFooter[key][index_key_lv_1];
      tableFooter += value
        ? `<th><a href="man_resource_detail?${q({ div: key, dept: index_key_lv_1 })}">${value}</a></th>`
        : '<th>0</th>';
    }
  }
  tableFooter += `<th><a href="man_resource_detail">${endTotal}</a></th>`;

  return {
    title: 'Man Resource',
    tableHead_Lv1,
    tableHead_Lv2_col,
    tableHead_Lv2,
    tableBody,
    tableFooter,
  };
}

// Padanan hris/man_resource_detail() (?div=&dept=&lvl=)
async function resourceDetail({ div, dept, lvl } = {}) {
  const params = {};
  let sql = `select d.Id_Division, c.JobSeq, a.NIP, a.Name, a.Jobtitle, a.Id_Jobtitle, b.Email, a.umur, a.tgl_pensiun, a.DeptName, a.Joblevel, a.DivisionName
               from BMC.dbo.hris_EmployeeAnalisis() a
               left outer join BMC.dbo.hris_Employee b on a.NIP = b.NIP
               left outer join BMC.dbo.hris_Joblevel c on a.Joblevel = c.Joblevel
               left outer join BMC.dbo.hris_Division d on a.DivisionName = d.DivisionName
              where b.is_Active = 1 `;
  if (div !== undefined) { sql += 'and a.DivisionName = @div '; params.div = div; }
  if (dept !== undefined) { sql += 'and a.DeptName = @dept '; params.dept = dept; }
  if (lvl !== undefined) { sql += 'and a.Joblevel = @lvl '; params.lvl = lvl; }
  sql += `and a.DivisionName is not null
          group by a.NIP, a.Name, a.Jobtitle, a.Id_Jobtitle, b.Email, a.umur, a.tgl_pensiun, a.DeptName, a.Joblevel, a.DivisionName, c.JobSeq, d.Id_Division
          order by c.JobSeq`;

  return query(sql, params);
}

// Padanan man_strategic_planning() default (person_info, person_downLine, downLine_plan, person_plan)
async function strategicDefault(nip) {
  const infoRows = await query(
    `select a.NIP, a.Name, a.DivisionName, a.DeptName, a.Joblevel, a.Id_Jobtitle, b.Id_Parent
       from BMC.dbo.hris_EmployeeAnalisis() a
       left outer join BMC.dbo.hris_Jobtitle b on a.Id_Jobtitle = b.Id_Jobtitle
      where NIP = @nip`,
    { nip }
  );
  if (!infoRows.length) throw httpError(404, 'NIP tidak ditemukan');

  const person_info = mapUcwords(infoRows[0]);
  if (person_info.Joblevel === 'Director') {
    return { redirect: true, to: '/api/manpower/resource/detail' };
  }

  const downLine = await query(
    `select a.Joblevel, a.Jobtitle, a.Id_Parent, a.Id_Jobtitle, b.Name
       from BMC.dbo.hris_Jobtitle a
       left outer join BMC.dbo.hris_EmployeeAnalisis() b on a.Id_Jobtitle = b.Id_Jobtitle
      where a.is_Active = 1 and Id_Parent = @idJobtitle
      order by a.Id_SeqJobtitle`,
    { idJobtitle: person_info.Id_Jobtitle }
  );
  const downLinePlan = await query(
    `select Id_Seq, Tahun, Id_Parent, Id_Jobtitle, Title_Plan, Desc_Plan, Title_Actual, Desc_Actual, StartDate, EndDate
       from BMC.dbo.hris_StrategicPlan
      where Id_Parent = @idJobtitle
      order by Tahun, Id_Seq`,
    { idJobtitle: person_info.Id_Jobtitle }
  );
  const personPlan = await query(
    `select Id_Seq, Tahun, Title_Plan, Desc_Plan, Title_Actual, Desc_Actual, StartDate, EndDate
       from [BMC].[dbo].hris_StrategicPlan
      where Id_Jobtitle = @idJobtitle`,
    { idJobtitle: person_info.Id_Jobtitle }
  );

  const out = { person_info };
  if (downLine.length) out.person_downLine = downLine.map(mapUcwords);
  if (downLinePlan.length) out.downLine_plan = downLinePlan.map(mapUcwords);
  if (personPlan.length) out.person_plan = personPlan.map(mapUcwords);
  return out;
}

// ponytail: InputDate disederhanakan ke 'YYYY-MM-DD HH:MM' (sumber pakai date('Y-m-d h:m') yang salah).
const nowStamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// action=save
async function strategicSave(body = {}) {
  await execute(
    `INSERT INTO BMC.dbo.hris_StrategicPlan (InputDate, InputBy, Tahun, Title_Plan, Desc_Plan, Id_Parent, Id_Jobtitle, StartDate, EndDate)
     VALUES (@InputDate, @InputBy, @Tahun, @Title_Plan, @Desc_Plan, @Id_Parent, @Id_Jobtitle, @StartDate, @EndDate)`,
    {
      InputDate: nowStamp(),
      InputBy: body.NIP ?? null,
      Tahun: body.Tahun ?? null,
      Title_Plan: body.Title_Plan ?? null,
      Desc_Plan: body.Desc_Plan ?? null,
      Id_Parent: body.Id_Parent ?? null,
      Id_Jobtitle: body.Id_Jobtitle ?? null,
      StartDate: body.StartDate ?? null,
      EndDate: body.EndDate ?? null,
    }
  );
  return { message: 'Data Berhasil Disimpan' };
}

// action=viewdata&to=plan|actual
async function strategicViewdata(to, idSeq) {
  let select;
  if (to === 'plan') select = 'Tahun, Title_Plan, Desc_Plan, convert(varchar(10), StartDate, 23) as StartDate, convert(varchar(10), EndDate, 23) as EndDate';
  else if (to === 'actual') select = 'Tahun, Title_Actual, Desc_Actual';
  else throw httpError(400, 'Parameter to wajib / tidak valid');

  return query(`select ${select} from [BMC].[dbo].hris_StrategicPlan where Id_Seq = @idSeq`, { idSeq });
}

// action=update&to=plan|actual
async function strategicUpdate(to, body = {}) {
  if (!body.Id_Seq) throw httpError(400, 'Id_Seq wajib diisi');

  let sets;
  const params = { idSeq: body.Id_Seq };
  if (to === 'plan') {
    sets = ['Tahun = @Tahun', 'Title_Plan = @Title_Plan', 'Desc_Plan = @Desc_Plan', 'StartDate = @StartDate', 'EndDate = @EndDate'];
    Object.assign(params, {
      Tahun: body.Tahun ?? null,
      Title_Plan: body.Title_Plan ?? null,
      Desc_Plan: body.Desc_Plan ?? null,
      StartDate: body.StartDate ?? null,
      EndDate: body.EndDate ?? null,
    });
  } else if (to === 'actual') {
    sets = ['Title_Actual = @Title_Actual', 'Desc_Actual = @Desc_Actual'];
    Object.assign(params, { Title_Actual: body.Title_Actual ?? null, Desc_Actual: body.Desc_Actual ?? null });
  } else {
    throw httpError(400, 'Parameter to wajib / tidak valid');
  }

  await execute(`update BMC.dbo.hris_StrategicPlan set ${sets.join(', ')} where Id_Seq = @idSeq`, params);
  return { message: 'Data Berhasil Diupdate' };
}

// action=delete
async function strategicDelete(idSeq) {
  if (idSeq === undefined || idSeq === null || idSeq === '') throw httpError(400, 'idseq wajib diisi');
  await execute('delete from BMC.dbo.hris_StrategicPlan where Id_Seq = @idSeq', { idSeq });
  return { message: 'Data Berhasil Dihapus' };
}

module.exports = { resource, resourceDetail, strategicDefault, strategicSave, strategicViewdata, strategicUpdate, strategicDelete };
