const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

function statisticsRouter() {
  const r = Router();

  // hris.php:747 education()
  r.get(
    '/education',
    asyncHandler(async (req, res) => {
      res.json(await service.education(req.query.id, req.query.desc));
    })
  );

  // hris.php:763 education_dept()
  r.get(
    '/education/dept',
    asyncHandler(async (req, res) => {
      res.json(await service.educationDept(req.query.id_dept, req.query.edu));
    })
  );

  // hris.php:779 age()
  r.get(
    '/age',
    asyncHandler(async (req, res) => {
      res.json(await service.age(req.query.id));
    })
  );

  // hris.php:798 status_kar()
  r.get(
    '/employee-status',
    asyncHandler(async (req, res) => {
      res.json(service.employeeStatus(req.query.id, req.query.name, req.query.jen));
    })
  );

  // hris.php:806 leveldua()
  r.get(
    '/level-two',
    asyncHandler(async (req, res) => {
      res.json(await service.leveldua(req.query));
    })
  );

  // hris.php:864 levelfamily()
  r.get(
    '/family',
    asyncHandler(async (req, res) => {
      res.json(await service.levelFamily(req.query.nip));
    })
  );

  // hris.php:871 leveltiga()
  r.get(
    '/level-three',
    asyncHandler(async (req, res) => {
      res.json(await service.levelTiga(req.query.nip));
    })
  );

  // hris.php:877 levelempat()
  r.get(
    '/level-four',
    asyncHandler(async (req, res) => {
      res.json(await service.levelEmpat(req.query.nip));
    })
  );

  // hris.php:883 leveltraining()
  r.get(
    '/level-training',
    asyncHandler(async (req, res) => {
      res.json(await service.levelTraining(req.query.nip));
    })
  );

  // hris.php:889 employee()
  r.get(
    '/employees',
    asyncHandler(async (req, res) => {
      res.json(await service.employees(req.query.id));
    })
  );

  // hris.php:904 retired()
  r.get(
    '/retired',
    asyncHandler(async (req, res) => {
      res.json(await service.retired(req.query.id, req.query.jobs));
    })
  );

  // hris.php:1924 pkb()
  r.get(
    '/pkb',
    asyncHandler(async (_req, res) => {
      res.json(service.pkb());
    })
  );

  // hris.php:730 dash_online()
  r.get(
    '/dashboard-online',
    asyncHandler(async (_req, res) => {
      res.json(service.dashboardOnline());
    })
  );

  return r;
}

module.exports = { statisticsRouter };
