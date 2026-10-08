const { query } = require('../../db/pool.js');
const { httpError } = require('../../lib/http.js');

async function listPolling() {
  const data = await query('select * from hris_poling');
  return { data };
}

async function chart(idPoling) {
  if (!idPoling) throw httpError(400, 'idPoling wajib diisi');
  const dataChart = await query(
    `SELECT CAST(a.isi AS NVARCHAR(MAX)) AS isi,
            COUNT(*) AS jumlah,
            MAX(CAST(c.judul AS NVARCHAR(MAX))) AS judul
     FROM hris_poling_jawaban a
     LEFT JOIN hris_poling_pertanyaan b ON a.id_pertanyaan = b.id_pertanyaan
     LEFT JOIN hris_poling c ON b.id_judul = c.id
     WHERE c.id = @idPoling
     GROUP BY CAST(a.isi AS NVARCHAR(MAX))`,
    { idPoling }
  );
  return { dataChart };
}

module.exports = { listPolling, chart };
