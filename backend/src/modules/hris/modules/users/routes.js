const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

/** Padanan hris/user_app_pr(_insert) + user_app_ep(_insert). Password disimpan apa adanya (bukan hash). */
function usersRouter() {
  const r = Router();

  r.get('/pr', asyncHandler(async (_req, res) => res.json(await service.listPr())));
  r.post('/pr', asyncHandler(async (req, res) => res.json(await service.insertPr(req.body || {}))));

  r.get('/ep', asyncHandler(async (_req, res) => res.json(await service.listEp())));
  r.post('/ep', asyncHandler(async (req, res) => res.json(await service.insertEp(req.body || {}))));

  return r;
}

module.exports = { usersRouter };
