const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const service = require('./service.js');

function jobtitlesRouter() {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.listJobtitles());
    })
  );

  // daftar referensi (lvl/div/cat) - harus sebelum '/:id'
  r.get(
    '/references',
    asyncHandler(async (_req, res) => {
      res.json(await service.references());
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.getJobtitle(req.params.id));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = req.body || {};
      if (!body.jb) throw httpError(400, 'Jobtitle wajib diisi');
      res.status(201).json(await service.createJobtitle(body));
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.updateJobtitle(req.params.id, req.body || {}));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.deleteJobtitle(req.params.id));
    })
  );

  return r;
}

module.exports = { jobtitlesRouter };
