const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const service = require('./service.js');

function trainingRouter() {
  const r = Router();

  // Padanan hris/training()
  r.get(
    '/summary',
    asyncHandler(async (_req, res) => {
      res.json({ tra: await service.summary() });
    })
  );

  // Padanan hc_training_participants() default
  r.get(
    '/hc/participants',
    asyncHandler(async (_req, res) => {
      res.json({ tahun: await service.participantYears() });
    })
  );

  // action1=viewtable (?year=)
  r.get(
    '/hc/participants/table',
    asyncHandler(async (req, res) => {
      res.json({ data: await service.participantTable(req.query.year) });
    })
  );

  // action1=training&action2=employee (?code=)
  r.get(
    '/hc/participants/employees',
    asyncHandler(async (req, res) => {
      res.json({ data: await service.participantEmployees(req.query.code) });
    })
  );

  // action1=training&action2=viewdetail (code = hex2bin)
  r.get(
    '/hc/participants/detail/:code',
    asyncHandler(async (req, res) => {
      const detail = await service.participantDetail(req.params.code);
      if (!detail) throw httpError(404, 'Data training tidak ditemukan');
      res.json(detail);
    })
  );

  // action1=training&action2=add
  r.post(
    '/hc/participants',
    asyncHandler(async (req, res) => {
      res.json(await service.addParticipant(req.body));
    })
  );

  return r;
}

module.exports = { trainingRouter };
