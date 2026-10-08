const { query, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

const clean = (v) => String(v ?? '').trim();
const order = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());

function listDivisions() {
  return query(
    `SELECT Id_Division, RTRIM(DivisionName) AS DivisionName, RTRIM(Div_orders) AS Div_orders
       FROM BMC.dbo.hris_Division
      ORDER BY Id_Division`
  );
}

async function createDivision(b) {
  const name = clean(b.DivisionName);
  if (!name) throw httpError(400, 'DivisionName wajib diisi');
  const rows = await query(
    `INSERT INTO BMC.dbo.hris_Division (DivisionName, Div_orders)
     VALUES (@DivisionName, @Div_orders);
     SELECT CAST(SCOPE_IDENTITY() AS int) AS Id_Division`,
    { DivisionName: name, Div_orders: order(b.Div_orders) }
  );
  return { ok: true, Id_Division: rows[0]?.Id_Division };
}

async function updateDivision(id, b) {
  const name = clean(b.DivisionName);
  if (!name) throw httpError(400, 'DivisionName wajib diisi');
  const res = await execute(
    `UPDATE BMC.dbo.hris_Division
        SET DivisionName = @DivisionName, Div_orders = @Div_orders
      WHERE Id_Division = @id`,
    { id: Number(id), DivisionName: name, Div_orders: order(b.Div_orders) }
  );
  return { ok: true, rowsAffected: res.rowsAffected };
}

async function deleteDivision(id) {
  const res = await execute('DELETE FROM BMC.dbo.hris_Division WHERE Id_Division = @id', { id: Number(id) });
  return { ok: true, rowsAffected: res.rowsAffected };
}

module.exports = { listDivisions, createDivision, updateDivision, deleteDivision };
