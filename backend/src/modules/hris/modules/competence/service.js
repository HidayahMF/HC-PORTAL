const { query, queryOne, execute } = require('../../db/pool.js');

const PRIDE_STANDARD = 'BMC.dbo.hris_Pride_Standard';
const PRIDE_ACTUAL = 'BMC.dbo.hris_Pride_Actual';

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const nowStamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// employee_competence() hris.php:1850
async function employeeCompetence() {
  const [main, manajerial] = await Promise.all([
    query(
      'SELECT IdCompt,IdNeed,Descriptions_2 FROM [BMC].dbo.hris_Competence WHERE IdCompt=1 GROUP BY IdCompt,IdNeed,Descriptions_2'
    ),
    query(
      'SELECT IdCompt,IdNeed,Descriptions_2 FROM [BMC].dbo.hris_Competence WHERE IdCompt=2 GROUP BY IdCompt,IdNeed,Descriptions_2'
    ),
  ]);
  return { main_competencies: main, manajerial_competencies: manajerial };
}

// competence_detail() hris.php:1862
async function competenceDetail(idNeed) {
  const params = { idNeed };
  const [detail, title] = await Promise.all([
    query('SELECT Descriptions_3 FROM [BMC].dbo.hris_Competence WHERE IdNeed=@idNeed', params),
    query('SELECT Distinct(Descriptions_2) FROM [BMC].dbo.hris_Competence WHERE IdNeed=@idNeed', params),
  ]);
  return { detail_competence: detail, title_competence: title };
}

// competence_std_input() hris.php:1876
async function competenceStdInput(body) {
  const job = body.idJob;
  const need = body.idNeed;
  const exist = await query(
    'SELECT * FROM [BMC].[dbo].[hris_Competence_Std] WHERE IdNeed=@need and Id_Jobtitle=@job',
    { need, job }
  );
  if (exist.length === 1) {
    await execute(
      'DELETE FROM [BMC].[dbo].[hris_Competence_Std] WHERE Id_Jobtitle=@job and IdNeed=@need',
      { job, need }
    );
  }
  await execute(
    'INSERT INTO BMC.dbo.hris_Competence_Std (Id_Jobtitle,IdNeed,IdCompt,IdComptHead,CreatedDate) VALUES (@job,@need,@compt,@head,@created)',
    { job, need, compt: body.idCompt, head: body.IdComptHead, created: today() }
  );
  return { ok: true };
}

async function getPride(table, jobseq, andSql = '', extra = {}) {
  return query(
    `SELECT a.*,b.Descriptions,c.Level,c.Descriptions as descr FROM ${table} a
     LEFT JOIN [BMC].dbo.hris_Pride_Competence_Need b ON a.IdNeed=b.IdNeed
     LEFT JOIN [BMC].dbo.hris_Pride_Competence_Head c ON a.Level=c.Level AND a.IdNeed=c.IdNeed
     WHERE JobSeq=@jobseq ${andSql} AND b.Descriptions IS NOT NULL ORDER BY a.IdNeed`,
    { jobseq, ...extra }
  );
}

async function cekname(nip) {
  const row = await queryOne('SELECT * FROM [BMC].dbo.hris_Employee WHERE NIP=@nip', { nip: nip ?? '' });
  return row ? row.Name : '';
}

// pride() hris.php:1932
async function pride(jobseq, nip) {
  const row = await queryOne('SELECT * FROM [BMC].dbo.hris_Joblevel WHERE JobSeq=@jobseq', { jobseq });
  const infostd = await getPride(PRIDE_STANDARD, jobseq);
  const infoact = await getPride(PRIDE_ACTUAL, jobseq, 'AND NIP=@nip', { nip: nip ?? '' });
  const name = await cekname(nip);
  return {
    jobsec: jobseq,
    nip,
    Joblevel: row ? row.Joblevel : undefined,
    infostd,
    infoact,
    name,
    title: row ? `Kamus Kompentensi Inti ${row.Joblevel}` : 'Empty Job Level',
  };
}

// pride_save() hris.php:1962
async function prideSave(body) {
  const needRows = await query('SELECT * FROM [BMC].dbo.hris_Pride_Competence_Need');
  const nip = body.nip;
  let link = null;
  for (const key of needRows) {
    const raw = body['pride' + key.IdNeed];
    if (!raw || raw === '0') continue;
    const [jobseq, idNeed, level] = String(raw).split('|');
    if (nip) {
      const year = body.year;
      await execute(
        'DELETE FROM BMC.dbo.hris_Pride_Actual WHERE JobSeq=@jobseq and IdNeed=@idneed and NIP=@nip and Year=@year',
        { jobseq, idneed: idNeed, nip, year }
      );
      await execute(
        'INSERT INTO BMC.dbo.hris_Pride_Actual (JobSeq,IdNeed,Level,NIP,Year) VALUES (@jobseq,@idneed,@level,@nip,@year)',
        { jobseq, idneed: idNeed, level, nip, year }
      );
      link = `hris/competence_dash?year=${year}&nip=${nip}`;
    } else {
      await execute(
        'DELETE FROM BMC.dbo.hris_Pride_Standard WHERE JobSeq=@jobseq and IdNeed=@idneed',
        { jobseq, idneed: idNeed }
      );
      await execute(
        'INSERT INTO BMC.dbo.hris_Pride_Standard (JobSeq,IdNeed,Level) VALUES (@jobseq,@idneed,@level)',
        { jobseq, idneed: idNeed, level }
      );
      const np = body.np;
      link = np
        ? `hris/competence_dash?year=${body.year}&nip=${np}`
        : `hris/pride?jblvl=${jobseq}`;
    }
  }
  return { ok: true, link };
}

// del_std_pride() hris.php:2003
async function delStdPride({ IdNeed, level, jblevel }) {
  await execute(
    'DELETE FROM BMC.dbo.hris_Pride_Standard WHERE JobSeq=@jblevel and IdNeed=@idneed and Level=@level',
    { jblevel, idneed: IdNeed, level }
  );
  return { success: true };
}

// ins_std_training_jbttle() hris.php:2017
async function insStdTrainingJobtitle(body) {
  const link = String(body.link || '').replace(/\|/g, '&');
  const list = Array.isArray(body.idtraining) ? body.idtraining : [body.idtraining];
  for (const idTraining of list) {
    await execute(
      'INSERT INTO BMC.dbo.hris_Training_Std_Jobtitle (Id_Division,Id_JobLevel,Id_JobTitle,Id_Training,CreatedDate) VALUES (@div,@lvl,@title,@training,@created)',
      {
        div: body.Id_Division,
        lvl: body.JobSeq,
        title: body.Id_Jobtitle,
        training: idTraining,
        created: nowStamp(),
      }
    );
  }
  return { ok: true, link };
}

// del_std_training_jbttle() hris.php:2032
async function delStdTrainingJobtitle({ link, id }) {
  await execute('DELETE FROM BMC.dbo.hris_Training_Std_Jobtitle WHERE Id=@id', { id });
  return { success: true, link: String(link || '').replace(/\|/g, '&') };
}

const SQL_CEK_JOBLEVEL = `SELECT a.Id,e.TrainingSubject,Id_JobLevel,a.Level FROM [BMC].[dbo].[hris_Training_Std_Joblevel] a
  LEFT JOIN [BMC].[dbo].hris_Joblevel d ON a.Id_JobLevel=d.JobSeq
  LEFT JOIN [BMC].[dbo].hris_Training e ON a.Id_Training=e.Id_Training
  WHERE a.Id_JobLevel=@jblvl and a.Id_Need=@need and a.Level<=@level ORDER BY a.Level`;

// pride_training() hris.php:2045 (HTML lama -> JSON)
async function prideTraining(id) {
  const sid = String(id ?? '');
  const need = sid.slice(0, 1);
  const level = sid.slice(1, 2);
  const jblvl = sid.slice(2, 3);
  const type = sid.slice(3, 4);
  const params = { jblvl, need, level };
  const existing = await query(SQL_CEK_JOBLEVEL, params);
  let options = [];
  if (type !== '0') {
    options = await query(
      `SELECT * FROM [BMC].dbo.hris_Training
       WHERE Id_Training NOT IN (
         SELECT Id_Training FROM [BMC].[dbo].[hris_Training_Std_Joblevel]
         WHERE Id_JobLevel=@jblvl and Id_Need=@need and Level<=@level
       ) ORDER BY TrainingSubject`,
      params
    );
  }
  return { id, need, level, jblvl, type, existing, options };
}

// ins_std_training_jblvl() hris.php:2074
async function insStdTrainingJoblevel(body) {
  const sid = String(body.id ?? '');
  const need = sid.slice(0, 1);
  const level = sid.slice(1, 2);
  const jblvl = sid.slice(2, 3);
  const list = Array.isArray(body.idtraining) ? body.idtraining : [body.idtraining];
  for (const idTraining of list) {
    await execute(
      'INSERT INTO BMC.dbo.hris_Training_Std_Joblevel (Id_Need,Level,Id_JobLevel,Id_Training,CreatedDate) VALUES (@need,@level,@jblvl,@training,@created)',
      { need, level, jblvl, training: idTraining, created: nowStamp() }
    );
  }
  return { ok: true, link: `hris/pride?jblvl=${jblvl}` };
}

// del_std_training_jblvl() hris.php:2091
async function delStdTrainingJoblevel({ jblvl, id }) {
  await execute('DELETE FROM BMC.dbo.hris_Training_Std_Joblevel WHERE Id=@id', { id });
  return { success: true, link: `hris/pride?jblvl=${jblvl}` };
}

async function getEmpjabatanlevel(nip) {
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

// competence_dash() hris.php:2104
async function competenceDash({ nip, year }) {
  const bio = await getEmpjabatanlevel(nip);
  return { bio, year: year || String(new Date().getFullYear()) };
}

module.exports = { employeeCompetence, competenceDetail, competenceStdInput, pride, prideSave, delStdPride, insStdTrainingJobtitle, delStdTrainingJobtitle, prideTraining, insStdTrainingJoblevel, delStdTrainingJoblevel, competenceDash };
