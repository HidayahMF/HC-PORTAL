const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const service = require('./service.js');

/* Padanan modul export di hris.php (data_employ, emp_datatable). */
function exportRouter() {
  const r = Router();

  // hris/emp_datatable()
  r.get(
    '/employees',
    asyncHandler(async (req, res) => {
      res.json({ data: await service.getEmployees(req.query.q) });
    })
  );

  r.post('/employees/deactivate', asyncHandler(async (req, res) => {
    const { action = 'deactivate', nips, reason } = req.body || {};
    if (!['deactivate', 'activate'].includes(action) || !Array.isArray(nips) || nips.some((nip) => typeof nip !== 'string' || !nip.trim()) || (action === 'deactivate' && typeof reason !== 'string')) {
      throw httpError(400, 'action, nips, dan reason tidak valid');
    }
    res.json({ success: true, ...(await service.deactivateEmployees(action, nips, reason, req.user?.sub)) });
  }));

  // hris/data_employ(): hanya menampilkan view hris/data_emp, tanpa query data.
  r.get('/employees/raw', (_req, res) => res.json({ data: [] }));

  return r;
}

module.exports = { exportRouter };
