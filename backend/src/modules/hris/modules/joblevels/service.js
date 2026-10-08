const { query, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const clean = (v) => String(v ?? '').trim();

function listJoblevels() {
  return query(
    `SELECT RTRIM(JobSeq) AS JobSeq, Joblevel
       FROM BMC.dbo.hris_Joblevel
      ORDER BY TRY_CAST(RTRIM(JobSeq) AS int), JobSeq`
  );
}

async function createJoblevel(b) {
  const seq = clean(b.JobSeq);
  const level = clean(b.Joblevel);
  if (!seq) throw httpError(400, 'JobSeq wajib diisi');
  if (!level) throw httpError(400, 'Joblevel wajib diisi');
  await execute(
    'INSERT INTO BMC.dbo.hris_Joblevel (JobSeq, Joblevel) VALUES (@JobSeq, @Joblevel)',
    { JobSeq: seq, Joblevel: level }
  );
  return { ok: true, JobSeq: seq };
}

async function updateJoblevel(seq, b) {
  const newSeq = clean(b.JobSeq);
  const level = clean(b.Joblevel);
  if (!newSeq) throw httpError(400, 'JobSeq wajib diisi');
  if (!level) throw httpError(400, 'Joblevel wajib diisi');
  const res = await execute(
    `UPDATE BMC.dbo.hris_Joblevel SET JobSeq = @newSeq, Joblevel = @Joblevel WHERE JobSeq = @seq`,
    { seq: clean(seq), newSeq, Joblevel: level }
  );
  return { ok: true, rowsAffected: res.rowsAffected };
}

async function deleteJoblevel(seq) {
  const res = await execute('DELETE FROM BMC.dbo.hris_Joblevel WHERE JobSeq = @seq', { seq: clean(seq) });
  return { ok: true, rowsAffected: res.rowsAffected };
}

module.exports = { listJoblevels, createJoblevel, updateJoblevel, deleteJoblevel };
