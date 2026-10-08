const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const { jpgUpload } = require('../../lib/upload.js');
const { dateYmd, warningLetterName } = require('./service.js');
const service = require('./service.js');

/** Padanan hris/disciplinary() dengan action inputpage/employee_by_dept/refoffence/viewedit/save/delete/default. */
function disciplinaryRouter() {
  const r = Router();

  const uploadWarning = jpgUpload('uploads/bap/hris/disciplinary', (req) => {
    const nip = req.params.nip ?? req.body.NIP;
    const date = req.params.date ?? dateYmd(req.body.IncidentDate);
    const seq = req.params.seq ?? req.body.IncidentSeq ?? '';
    return warningLetterName(nip, date, seq);
  });

  r.get('/', asyncHandler(async (_req, res) => res.json(await service.listDisciplinary())));

  r.get('/input-options', asyncHandler(async (_req, res) => res.json(await service.inputOptions())));

  r.get(
    '/employees-by-dept',
    asyncHandler(async (req, res) => {
      const deptId = req.query.DeptID ?? req.body?.DeptID;
      if (!deptId) throw httpError(400, 'DeptID wajib diisi');
      res.json(await service.employeesByDept(deptId));
    })
  );

  r.get(
    '/ref-offence',
    asyncHandler(async (req, res) => {
      const warningNumber = req.query.WarningNumber ?? req.body?.WarningNumber;
      if (!warningNumber) throw httpError(400, 'WarningNumber wajib diisi');
      res.json(await service.refOffence(warningNumber));
    })
  );

  r.get(
    '/:nip/:date/:seq',
    asyncHandler(async (req, res) => {
      const { nip, date, seq } = req.params;
      res.json(await service.getDisciplinary(nip, date, seq));
    })
  );

  r.post(
    '/',
    uploadWarning,
    asyncHandler(async (req, res) => res.json(await service.insertDisciplinary(req.body, req.file)))
  );

  r.put(
    '/:nip/:date/:seq',
    uploadWarning,
    asyncHandler(async (req, res) => {
      const { nip, date, seq } = req.params;
      res.json(await service.updateDisciplinary(nip, date, seq, req.body, req.file));
    })
  );

  r.delete(
    '/:nip/:date/:seq',
    asyncHandler(async (req, res) => {
      const { nip, date, seq } = req.params;
      res.json(await service.deleteDisciplinary(nip, date, seq));
    })
  );

  return r;
}

module.exports = { disciplinaryRouter };
