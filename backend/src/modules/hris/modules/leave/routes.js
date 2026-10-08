const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

function leaveRouter() {
  const r = Router();

  // Padanan hris/cuti_datatable
  r.get(
    '/transactions',
    asyncHandler(async (req, res) => {
      res.json(await service.transactions(req.query));
    })
  );

  // Padanan hris/massal_datatable
  r.get(
    '/massal',
    asyncHandler(async (req, res) => {
      res.json(await service.massal(req.query));
    })
  );

  // Padanan M_hris/getEmpLeaveDay (?nip= opsional)
  r.get(
    '/day',
    asyncHandler(async (req, res) => {
      res.json(await service.day(req.query.nip));
    })
  );

  // Saldo cuti tahunan per karyawan (Employee Leave Balance)
  r.get(
    '/balance',
    asyncHandler(async (_req, res) => {
      res.json(await service.balance());
    })
  );

  // Daftar karyawan aktif untuk dropdown NIP
  r.get(
    '/employees',
    asyncHandler(async (_req, res) => {
      res.json(await service.employees());
    })
  );

  // Tambah cuti (tahunan otomatis membuat cuti besar)
  r.post(
    '/day',
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.addLeaveDay({ ...(req.body || {}), InpBy: req.user?.sub }));
    })
  );

  // Ubah record cuti
  r.put(
    '/day',
    asyncHandler(async (req, res) => {
      res.json(await service.updateLeaveDay({ ...(req.body || {}), UpdBy: req.user?.sub }));
    })
  );

  // Hapus record cuti
  r.delete(
    '/day',
    asyncHandler(async (req, res) => {
      res.json(await service.deleteLeaveDay(req.query));
    })
  );

  // Cuti dadakan (Emergency)
  r.get(
    '/sudden',
    asyncHandler(async (_req, res) => {
      res.json(await service.sudden());
    })
  );

  r.post(
    '/sudden',
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.addSudden({ ...(req.body || {}), InpBy: req.user?.sub }));
    })
  );

  // Padanan hris/generate_cuti (cron)
  r.post(
    '/generate',
    asyncHandler(async (_req, res) => {
      res.json(await service.generate());
    })
  );

  // Padanan hris/infoCutiGroupHeadDeptHead
  r.post(
    '/notify-heads',
    asyncHandler(async (_req, res) => {
      res.json(await service.notifyHeads());
    })
  );

  // Padanan M_hris/updateLeaveStatus
  r.put(
    '/approval',
    asyncHandler(async (req, res) => {
      res.json(await service.approval(req.body || {}));
    })
  );

  // Padanan M_hris/updateEmpTemp
  r.put(
    '/temporary-confirm',
    asyncHandler(async (req, res) => {
      res.json(await service.temporaryConfirm(req.body || {}));
    })
  );

  return r;
}

module.exports = { leaveRouter };
