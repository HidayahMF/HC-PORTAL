const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

function manpowerRouter() {
  const r = Router();

  // Padanan hris/man_resource()
  r.get(
    '/resource',
    asyncHandler(async (_req, res) => {
      res.json(await service.resource());
    })
  );

  // Padanan hris/man_resource_detail() (?div=&dept=&lvl=)
  r.get(
    '/resource/detail',
    asyncHandler(async (req, res) => {
      const { div, dept, lvl } = req.query;
      res.json({ title: 'Man Resource Detail', emp_org_detail: await service.resourceDetail({ div, dept, lvl }) });
    })
  );

  // Padanan man_strategic_planning(): action=save/viewdata/update/delete + default
  const strategic = asyncHandler(async (req, res) => {
    const action = req.query.action || '';
    const body = req.body || {};

    switch (action) {
      case 'save':
        res.json(await service.strategicSave(body));
        return;
      case 'viewdata':
        res.json(await service.strategicViewdata(req.query.to, body.Id_Seq));
        return;
      case 'update':
        res.json(await service.strategicUpdate(req.query.to, body));
        return;
      case 'delete':
        res.json(await service.strategicDelete(req.query.idseq));
        return;
      default: {
        const nip = req.query.id || body.NIP;
        if (!nip) {
          res.json({ redirect: true, to: '/api/manpower/resource/detail' });
          return;
        }
        res.json(await service.strategicDefault(nip));
      }
    }
  });
  r.get('/strategic', strategic);
  r.post('/strategic', strategic);

  // Padanan man_strategic_planning() default untuk NIP
  r.get(
    '/strategic/:nip',
    asyncHandler(async (req, res) => {
      res.json(await service.strategicDefault(req.params.nip));
    })
  );

  return r;
}

module.exports = { manpowerRouter };
