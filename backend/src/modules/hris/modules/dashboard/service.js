const { query, queryOne } = require('../../db/pool.js');
const stats = require('../statistics/service.js');

const rowsOf = (v) => (Array.isArray(v) ? v : v?.data ?? []);

const SQL = {
  counts: `
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN Gender = 'L' THEN 1 ELSE 0 END) AS male,
           SUM(CASE WHEN Gender = 'P' THEN 1 ELSE 0 END) AS female
    FROM BMC.dbo.hris_Employee WHERE is_Active = '1'`,

  jobLevel: `
    SELECT b.Joblevel AS label, COUNT(*) AS total
    FROM BMC.dbo.hris_Employee a
    JOIN BMC.dbo.hris_EmployeeCareerPath c ON a.NIP = c.NIP
    JOIN BMC.dbo.hris_Jobtitle b ON c.Id_Jobtitle = b.Id_Jobtitle
    WHERE a.is_Active = '1' AND c.is_Archive = 0
    GROUP BY b.Joblevel
    ORDER BY total DESC`,

  workingTime: `
    SELECT bucket AS label, COUNT(*) AS total
    FROM (
      SELECT CASE
        WHEN WorkingDate IS NULL THEN 'Tidak diketahui'
        WHEN DATEDIFF(YEAR, WorkingDate, GETDATE()) < 10 THEN '< 10 tahun'
        WHEN DATEDIFF(YEAR, WorkingDate, GETDATE()) < 25 THEN '10-25 tahun'
        WHEN DATEDIFF(YEAR, WorkingDate, GETDATE()) < 35 THEN '25-35 tahun'
        ELSE '> 35 tahun' END AS bucket
      FROM BMC.dbo.hris_Employee WHERE is_Active = '1'
    ) t
    GROUP BY bucket
    ORDER BY total DESC`,

  age: `
    SELECT bucket AS label, COUNT(*) AS total
    FROM (
      SELECT CASE
        WHEN BirthDate IS NULL THEN 'Tidak diketahui'
        WHEN DATEDIFF(YEAR, BirthDate, GETDATE()) < 25 THEN '< 25'
        WHEN DATEDIFF(YEAR, BirthDate, GETDATE()) <= 30 THEN '25-30'
        WHEN DATEDIFF(YEAR, BirthDate, GETDATE()) <= 45 THEN '31-45'
        WHEN DATEDIFF(YEAR, BirthDate, GETDATE()) <= 55 THEN '46-55'
        ELSE '> 55' END AS bucket
      FROM BMC.dbo.hris_Employee WHERE is_Active = '1'
    ) t
    GROUP BY bucket
    ORDER BY total DESC`,

  education: `
    SELECT ISNULL(edu.EducationLevel, 'Tidak diisi') AS label, COUNT(*) AS total
    FROM BMC.dbo.hris_Employee a
    LEFT JOIN (
      SELECT e.NIP, e.EducationLevel
      FROM BMC.dbo.hris_EmployeeEducation e
      WHERE e.Id_EmpEdu IN (SELECT MAX(Id_EmpEdu) FROM BMC.dbo.hris_EmployeeEducation GROUP BY NIP)
    ) edu ON a.NIP = edu.NIP
    WHERE a.is_Active = '1'
    GROUP BY ISNULL(edu.EducationLevel, 'Tidak diisi')
    ORDER BY total DESC`,

  recent: `
    SELECT TOP 6 a.NIP, RTRIM(a.Name) AS Name, a.NIK,
           ISNULL(m.NamaDepartemen, '-') AS Department,
           a.WorkingDate,
           CASE WHEN a.EmployeeStatus = 'P' THEN 'Tetap' ELSE 'Kontrak' END AS Status
    FROM BMC.dbo.hris_Employee a
    LEFT JOIN BMC.dbo.MASCOSTCENTER m ON a.DepartID = m.DepartID
    WHERE a.is_Active = '1'
    ORDER BY a.WorkingDate DESC, a.Id_Employee DESC`,
};

/** Satu endpoint agregat dashboard (read-only). Query dijalankan paralel. */
async function summary() {
  const [counts, jobLevel, workingTime, age, education, recent, retired] = await Promise.all([
    queryOne(SQL.counts),
    query(SQL.jobLevel),
    query(SQL.workingTime),
    query(SQL.age),
    query(SQL.education),
    query(SQL.recent),
    stats.retired('history'),
  ]);

  return {
    totals: {
      employees: counts?.total ?? 0,
      male: counts?.male ?? 0,
      female: counts?.female ?? 0,
      retired: rowsOf(retired).length,
    },
    jobLevel,
    workingTime,
    age,
    education,
    recent,
  };
}

module.exports = { summary };
