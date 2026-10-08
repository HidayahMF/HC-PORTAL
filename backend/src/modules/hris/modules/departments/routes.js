const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const service = require('./service.js');

function departmentsRouter() {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await service.listDepartments(req.query.level));
    })
  );

  // daftar induk (Board Of Director / Divisi / Departemen) - harus sebelum '/:id'
  r.get(
    '/parents',
    asyncHandler(async (_req, res) => {
      res.json(await service.listParentDepartments());
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.getDepartment(req.params.id));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = req.body || {};
      if (!body.DepartID) throw httpError(400, 'DepartID wajib diisi');
      res.status(201).json(await service.createDepartment(body));
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.updateDepartment(req.params.id, req.body || {}));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.deleteDepartment(req.params.id));
    })
  );

  return r;
}

module.exports = { departmentsRouter };
