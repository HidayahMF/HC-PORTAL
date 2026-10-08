const { query, queryOne, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

// Padanan hris/jobtitle() + M_hris::getlist
function listJobtitles() {
  return query(
    `SELECT CASE WHEN is_Active = 1 THEN 'Active' ELSE 'InActive' END AS stt, *
       FROM BMC.dbo.hris_Jobtitle
      ORDER BY Id_Jobtitle DESC`
  );
}

// Padanan hris/jbtitle_edit(): jb + referensi lvl/div/cat
async function getJobtitle(id) {
  const [jb, lvl, div, cat] = await Promise.all([
    query('SELECT * FROM BMC.dbo.hris_Jobtitle WHERE Id_Jobtitle = @id', { id }),
    query('SELECT * FROM BMC.dbo.hris_Joblevel'),
    query('SELECT * FROM BMC.dbo.hris_Division'),
    query('SELECT * FROM BMC.dbo.hris_Category'),
  ]);
  if (!jb.length) throw httpError(404, 'Jobtitle tidak ditemukan');
  return { jb, lvl, div, cat };
}

// Padanan referensi pada hris/jobtitle() & hris/jbtitle_edit()
async function references() {
  const [lvl, div, cat] = await Promise.all([
    query('SELECT * FROM BMC.dbo.hris_Joblevel'),
    query('SELECT * FROM BMC.dbo.hris_Division'),
    query('SELECT * FROM BMC.dbo.hris_Category'),
  ]);
  return { lvl, div, cat };
}

// explode('|', ...) -> { id, name }
const splitPair = (value) => {
  const [id, name] = String(value ?? '').split('|');
  return { id, name };
};

// Padanan hris/jbtitle_add() + M_hris::save_data
async function createJobtitle(body) {
  const seq = await queryOne("SELECT IDENT_CURRENT('BMC.dbo.hris_Jobtitle') AS cek");
  const iddiv = splitPair(body.div);
  const idcat = splitPair(body.cat);
  const result = await execute(
    `INSERT INTO BMC.dbo.hris_Jobtitle
       (Id_SeqJobtitle, Jobtitle, Joblevel, Id_Division, Division, Id_Category, CategoryName, is_Active)
     VALUES (@Id_SeqJobtitle, @Jobtitle, @Joblevel, @Id_Division, @Division, @Id_Category, @CategoryName, @is_Active)`,
    {
      Id_SeqJobtitle: seq?.cek ?? null,
      Jobtitle: body.jb,
      Joblevel: body.lvl,
      Id_Division: iddiv.id,
      Division: iddiv.name,
      Id_Category: idcat.id,
      CategoryName: idcat.name,
      is_Active: body.act,
    }
  );
  return { ok: true, Id_SeqJobtitle: seq?.cek ?? null, rowsAffected: result.rowsAffected };
}

// Padanan hris/jobtitle_upd() + M_hris::update_data2
async function updateJobtitle(id, body) {
  const iddiv = splitPair(body.div);
  const idcat = splitPair(body.cat);
  const result = await execute(
    `UPDATE BMC.dbo.hris_Jobtitle
        SET Jobtitle = @Jobtitle,
            Joblevel = @Joblevel,
            Id_Division = @Id_Division,
            Division = @Division,
            Id_Category = @Id_Category,
            CategoryName = @CategoryName,
            is_Active = @is_Active
      WHERE Id_Jobtitle = @id`,
    {
      id,
      Jobtitle: body.jb,
      Joblevel: body.lvl,
      Id_Division: iddiv.id,
      Division: iddiv.name,
      Id_Category: idcat.id,
      CategoryName: idcat.name,
      is_Active: body.act,
    }
  );
  return { ok: true, rowsAffected: result.rowsAffected };
}

// Padanan hris/jobtitle_delete() + M_hris::Del_data
async function deleteJobtitle(id) {
  const result = await execute('DELETE FROM BMC.dbo.hris_Jobtitle WHERE Id_Jobtitle = @id', { id });
  return { ok: true, rowsAffected: result.rowsAffected };
}

module.exports = { listJobtitles, getJobtitle, references, createJobtitle, updateJobtitle, deleteJobtitle };
