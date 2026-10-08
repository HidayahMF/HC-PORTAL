const { Router } = require('express');
const { asyncHandler } = require('../../lib/http.js');
const service = require('./service.js');

function competenceRouter() {
  const r = Router();

  // hris.php:1850 employee_competence()
  r.get(
    '/employee',
    asyncHandler(async (_req, res) => {
      res.json(await service.employeeCompetence());
    })
  );

  // hris.php:1862 competence_detail()
  r.get(
    '/detail',
    asyncHandler(async (req, res) => {
      res.json(await service.competenceDetail(req.query.idNeed));
    })
  );

  // hris.php:1876 competence_std_input()
  r.post(
    '/std',
    asyncHandler(async (req, res) => {
      res.json(await service.competenceStdInput(req.body || {}));
    })
  );

  // hris.php:1932 pride()
  r.get(
    '/pride/:jobseq',
    asyncHandler(async (req, res) => {
      res.json(await service.pride(req.params.jobseq, req.query.nip));
    })
  );

  // hris.php:1962 pride_save()
  r.post(
    '/pride/save',
    asyncHandler(async (req, res) => {
      res.json(await service.prideSave(req.body || {}));
    })
  );

  // hris.php:2003 del_std_pride()
  r.delete(
    '/pride/std',
    asyncHandler(async (req, res) => {
      res.json(await service.delStdPride(req.query));
    })
  );

  // hris.php:2017 ins_std_training_jbttle()
  r.post(
    '/training/jobtitle',
    asyncHandler(async (req, res) => {
      res.json(await service.insStdTrainingJobtitle(req.body || {}));
    })
  );

  // hris.php:2032 del_std_training_jbttle()
  r.delete(
    '/training/jobtitle',
    asyncHandler(async (req, res) => {
      res.json(await service.delStdTrainingJobtitle(req.query));
    })
  );

  // hris.php:2045 pride_training() (HTML lama -> JSON)
  r.get(
    '/pride-training',
    asyncHandler(async (req, res) => {
      res.json(await service.prideTraining(req.query.id));
    })
  );

  // hris.php:2074 ins_std_training_jblvl()
  r.post(
    '/training/joblevel',
    asyncHandler(async (req, res) => {
      res.json(await service.insStdTrainingJoblevel(req.body || {}));
    })
  );

  // hris.php:2091 del_std_training_jblvl()
  r.delete(
    '/training/joblevel',
    asyncHandler(async (req, res) => {
      res.json(await service.delStdTrainingJoblevel(req.query));
    })
  );

  // hris.php:2104 competence_dash()
  r.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
      res.json(await service.competenceDash(req.query));
    })
  );

  return r;
}

module.exports = { competenceRouter };
