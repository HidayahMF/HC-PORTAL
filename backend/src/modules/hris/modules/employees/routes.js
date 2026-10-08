const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const { jpgUpload } = require('../../lib/upload.js');
const service = require('./service.js');

function employeesRouter() {
  const r = Router();

  const uploadPhoto = jpgUpload('hris/Foto', (req) => String(req.body.nip).slice(-4));

  // Padanan hris/ins_prof()
  r.post(
    '/profiles',
    uploadPhoto,
    asyncHandler(async (req, res) => {
      const result = await service.insertProfile(req.body || {});
      res.json({ ...result, file: req.file ? req.file.filename : null });
    })
  );

  // Padanan hris/upd_prof()
  r.put(
    '/profiles/:nip',
    uploadPhoto,
    asyncHandler(async (req, res) => {
      const result = await service.updateProfile(req.params.nip, req.body || {});
      res.json({ ...result, file: req.file ? req.file.filename : null });
    })
  );

  // Padanan hris/emp_insert()
  r.post(
    '/records',
    asyncHandler(async (req, res) => {
      const result = await service.insertRecord(req.body || {});
      res.json(result);
    })
  );

  // Padanan hris/emp_edit() (?id=<pk>|<type>)
  r.get(
    '/records/edit',
    asyncHandler(async (req, res) => {
      const rows = await service.getRecordEdit(req.query.id);
      res.json({ res: rows });
    })
  );

  // Padanan hris/emp_update()
  r.put(
    '/records/:id',
    asyncHandler(async (req, res) => {
      const result = await service.updateRecord(req.params.id, req.body || {});
      res.json(result);
    })
  );

  // Padanan hris/emp_delete() (?type=<2..6>)
  r.delete(
    '/records/:pk',
    asyncHandler(async (req, res) => {
      const result = await service.deleteRecord(req.params.pk, req.query.type);
      res.json(result);
    })
  );

  // Pencarian karyawan (autocomplete Emp Data). Harus sebelum '/:nip'.
  r.get(
    '/search',
    asyncHandler(async (req, res) => {
      res.json({ data: await service.searchEmployees(req.query.q) });
    })
  );

  // Padanan hris/emp() tanpa ?nip (fallback karyawan terakhir)
  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const data = await service.getEmployee('', req.query.id);
      res.json(data);
    })
  );

  // Padanan hris/emp()
  r.get(
    '/:nip',
    asyncHandler(async (req, res) => {
      const data = await service.getEmployee(req.params.nip, req.query.id);
      res.json(data);
    })
  );

  return r;
}

module.exports = { employeesRouter };
