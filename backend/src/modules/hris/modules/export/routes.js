const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

/* Padanan modul export di hris.php (data_employ, emp_datatable). */
function exportRouter() {
  const r = Router();

  // hris/emp_datatable()
  r.get(
    '/employees',
    asyncHandler(async (_req, res) => {
      res.json({ data: await service.getEmployees() });
    })
  );

  // hris/data_employ(): hanya menampilkan view hris/data_emp, tanpa query data.
  r.get('/employees/raw', (_req, res) => res.json({ data: [] }));

  return r;
}

module.exports = { exportRouter };
