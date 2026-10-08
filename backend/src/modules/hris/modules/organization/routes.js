const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const service = require('./service.js');

function organizationRouter() {
  const r = Router();

  r.get(
    '/hierarchy/:nip',
    asyncHandler(async (req, res) => {
      res.json(await service.getHierarchy(req.params.nip));
    })
  );

  r.put(
    '/hierarchy/:nip',
    asyncHandler(async (req, res) => {
      const body = req.body || {};
      if (body.DEPARTEMEN === undefined || body.DEPARTEMEN === null) {
        throw httpError(400, 'DEPARTEMEN wajib diisi');
      }
      res.json(await service.changeHierarchy(req.params.nip, body.DEPARTEMEN));
    })
  );

  return r;
}

module.exports = { organizationRouter };
