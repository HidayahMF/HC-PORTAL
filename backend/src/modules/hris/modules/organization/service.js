const { query, execute } = require('../../db/pool.js');

// Padanan hris/detail(): TVF hris_GetDownLevel/hris_GetTopLevel + join referensi
async function getHierarchy(nip) {
  const [down, top, info, mascos] = await Promise.all([
    query(
      `SELECT a.NIP, a.Name, a.DepartID, a.DepartName, a.DepartemenInduk, b.NamaDepartemen, a.JobSeq AS Level, c.Joblevel AS LevelName
         FROM BMC.dbo.hris_GetDownLevel(@nip) a
         LEFT JOIN BMC.dbo.MASCOSTCENTER b ON a.DepartemenInduk = b.DepartID
         LEFT JOIN BMC.dbo.hris_Joblevel c ON a.JobSeq = c.JobSeq
        ORDER BY Level`,
      { nip }
    ),
    query(
      `SELECT a.NIP, a.Name, a.DepartID, b.NamaDepartemen, a.JobSeq AS Level, c.Joblevel AS LevelName
         FROM BMC.dbo.hris_GetTopLevel(@nip) a
         LEFT JOIN BMC.dbo.MASCOSTCENTER b ON a.DepartID = b.DepartID
         LEFT JOIN BMC.dbo.hris_Joblevel c ON a.JobSeq = c.JobSeq
        ORDER BY Level`,
      { nip }
    ),
    query(
      `SELECT a.NIP, c.Name, b.Jobtitle, b.Joblevel, NamaDepartemen, JobSeq, d.DepartID, b.Division AS DivisionName
         FROM BMC.dbo.hris_EmployeeCareerPath a
         INNER JOIN BMC.dbo.hris_Jobtitle b ON a.Id_Jobtitle = b.Id_Jobtitle
         INNER JOIN BMC.dbo.hris_Employee c ON a.NIP = c.NIP
         INNER JOIN BMC.dbo.MASCOSTCENTER d ON c.DepartID = d.DepartID
         INNER JOIN BMC.dbo.hris_Joblevel e ON b.Joblevel = e.Joblevel
        WHERE a.NIP = @nip AND a.is_Archive = 0`,
      { nip }
    ),
    query('SELECT deptid, NamaDepartemen FROM BMC.dbo.MASCOSTCENTER ORDER BY deptid'),
  ]);

  return { down, top, info, mascos };
}

// Padanan hris/change_hierarki() + M_hris::Update_data (rtrim DEPARTEMEN)
async function changeHierarchy(nip, department) {
  const depart = String(department ?? '').replace(/\s+$/, '');
  const result = await execute('UPDATE BMC.dbo.hris_Employee SET DepartID = @depart WHERE NIP = @nip', {
    depart,
    nip,
  });
  return { ok: true, rowsAffected: result.rowsAffected };
}

module.exports = { getHierarchy, changeHierarchy };
