const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

/** Padanan hris/getlistPoling + getDataPoling. */
function pollingRouter() {
  const r = Router();

  r.get('/', asyncHandler(async (_req, res) => res.json(await service.listPolling())));

  r.post(
    '/chart',
    asyncHandler(async (req, res) => {
      const { idPoling } = req.body || {};
      res.json(await service.chart(idPoling));
    })
  );

  return r;
}

module.exports = { pollingRouter };
