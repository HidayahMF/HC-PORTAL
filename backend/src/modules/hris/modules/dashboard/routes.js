const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

function dashboardRouter() {
  const r = Router();

  // Agregat dashboard (read-only): totals, jobLevel, education, age, workingTime, recent
  r.get(
    '/summary',
    asyncHandler(async (_req, res) => {
      res.json(await service.summary());
    })
  );

  return r;
}

module.exports = { dashboardRouter };
