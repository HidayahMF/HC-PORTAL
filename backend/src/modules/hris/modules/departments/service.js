const { query, execute } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

// Padanan hris/dept() + M_hris::getlist
function listDepartments(level) {
  if (level) {
    return query(
      'SELECT * FROM BMC.dbo.MASCOSTCENTER WHERE LevelDepartemen = @level ORDER BY Id_Division, DepartID',
      { level }
    );
  }
  return query('SELECT * FROM BMC.dbo.MASCOSTCENTER ORDER BY Id_Division, DepartID');
}

// Padanan hris/dept_edit() (view pakai $res[0] -> kembalikan array baris)
async function getDepartment(id) {
  const rows = await query('SELECT * FROM BMC.dbo.MASCOSTCENTER WHERE DepartID = @id', { id });
  if (!rows.length) throw httpError(404, 'Departemen tidak ditemukan');
  return rows;
}

// Opsi Departemen Induk: level yang boleh menjadi induk.
function listParentDepartments() {
  return query(
    `SELECT RTRIM(DepartID) AS DepartID, RTRIM(NamaDepartemen) AS NamaDepartemen,
            RTRIM(LevelDepartemen) AS LevelDepartemen, RTRIM(DepartemenInduk) AS DepartemenInduk
       FROM BMC.dbo.MASCOSTCENTER
      WHERE RTRIM(LevelDepartemen) IN ('Board Of Director', 'Divisi', 'Departemen')
      ORDER BY Id_Division, DepartID`
  );
}

// Padanan hris/dept_insert() + M_hris::Save_data
async function createDepartment(body) {
  const result = await execute(
    `INSERT INTO BMC.dbo.MASCOSTCENTER
       (compcode, DepartID, NamaDepartemen, TipeDepartemen, LevelDepartemen, DepartemenInduk, KodeCostCenter)
     VALUES ('0', @DepartID, @NamaDepartemen, @TipeDepartemen, @LevelDepartemen, @DepartemenInduk, @KodeCostCenter)`,
    {
      DepartID: body.DepartID,
      NamaDepartemen: body.NamaDepartemen,
      TipeDepartemen: body.TipeDepartemen,
      LevelDepartemen: body.Level,
      DepartemenInduk: body.DepartemenInduk,
      KodeCostCenter: body.KodeCostCenter,
    }
  );
  return { ok: true, rowsAffected: result.rowsAffected };
}

// Padanan hris/dept_update() + M_hris::Update_data2
async function updateDepartment(id, body) {
  const result = await execute(
    `UPDATE BMC.dbo.MASCOSTCENTER
        SET compcode = '0',
            NamaDepartemen = @NamaDepartemen,
            TipeDepartemen = @TipeDepartemen,
            LevelDepartemen = @LevelDepartemen,
            DepartemenInduk = @DepartemenInduk,
            KodeCostCenter = @KodeCostCenter
      WHERE DepartID = @id`,
    {
      id,
      NamaDepartemen: body.NamaDepartemen,
      TipeDepartemen: body.TipeDepartemen,
      LevelDepartemen: body.Level,
      DepartemenInduk: body.DepartemenInduk,
      KodeCostCenter: body.KodeCostCenter,
    }
  );
  return { ok: true, rowsAffected: result.rowsAffected };
}

// Soft delete: tandai inactive, baris tidak dihapus.
async function deleteDepartment(id) {
  const result = await execute(
    "UPDATE BMC.dbo.MASCOSTCENTER SET TidakAktif = 'Y' WHERE DepartID = @id",
    { id }
  );
  return { ok: true, rowsAffected: result.rowsAffected };
}

module.exports = { listDepartments, getDepartment, listParentDepartments, createDepartment, updateDepartment, deleteDepartment };
