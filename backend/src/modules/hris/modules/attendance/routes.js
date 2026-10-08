const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

/* Padanan modul attendance di hris.php (log*, timeatt*, etcom*). */
function attendanceRouter() {
  const r = Router();

  // hris/log_datatable()
  r.get(
    '/logs',
    asyncHandler(async (req, res) => {
      const { DateStart, DateEnd } = req.query;
      res.json({ data: await service.getLogs(DateStart, DateEnd) });
    })
  );

  // hris/log_detail($id)
  r.get(
    '/logs/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.getLogDetail(req.params.id));
    })
  );

  // hris/timeatt_datatable()
  r.get(
    '/timeatt',
    asyncHandler(async (req, res) => {
      const { DateStart, DateEnd } = req.query;
      res.json({ data: await service.getTimeatt(DateStart, DateEnd) });
    })
  );

  // hris/etcom_datatable()
  r.get(
    '/etcom',
    asyncHandler(async (req, res) => {
      const { DateStart, DateEnd } = req.query;
      res.json({ data: await service.getEtcom(DateStart, DateEnd) });
    })
  );

  // hris/etcom_detail($id)
  r.get(
    '/etcom/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.getEtcomDetail(req.params.id));
    })
  );

  return r;
}

module.exports = { attendanceRouter };
