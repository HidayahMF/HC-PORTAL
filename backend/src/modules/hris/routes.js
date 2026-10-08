const { Router } = require('express');
const { requireAuth } = require('./middleware/auth.js');
const { authRouter } = require('./modules/auth/routes.js');

/**
 * Agregator semua router modul HRIS.
 * Padanan mapping method controller hris.php -> endpoint ada di ../docs/API.md
 */
function router() {
  const r = Router();

  // publik
  r.use('/auth', authRouter());

  // wajib login (padanan session user='Admin')
  const secured = Router();
  secured.use(requireAuth);

  secured.use('/employees', employeesRouter());
  secured.use('/departments', departmentsRouter());
  secured.use('/divisions', divisionsRouter());
  secured.use('/joblevels', joblevelsRouter());
  secured.use('/jobtitles', jobtitlesRouter());
  secured.use('/organization', organizationRouter());
  secured.use('/training', trainingRouter());
  secured.use('/attendance', attendanceRouter());
  secured.use('/leave', leaveRouter());
  secured.use('/permit', permitRouter());
  secured.use('/disciplinary', disciplinaryRouter());
  secured.use('/competence', competenceRouter());
  secured.use('/statistics', statisticsRouter());
  secured.use('/dashboard', dashboardRouter());
  secured.use('/manpower', manpowerRouter());
  secured.use('/temporary', temporaryRouter());
  secured.use('/users', usersRouter());
  secured.use('/polling', pollingRouter());
  secured.use('/export', exportRouter());

  r.use(secured);
  return r;
}

const { employeesRouter } = require('./modules/employees/routes.js');
const { departmentsRouter } = require('./modules/departments/routes.js');
const { divisionsRouter } = require('./modules/divisions/routes.js');
const { joblevelsRouter } = require('./modules/joblevels/routes.js');
const { jobtitlesRouter } = require('./modules/jobtitles/routes.js');
const { organizationRouter } = require('./modules/organization/routes.js');
const { trainingRouter } = require('./modules/training/routes.js');
const { attendanceRouter } = require('./modules/attendance/routes.js');
const { leaveRouter } = require('./modules/leave/routes.js');
const { permitRouter } = require('./modules/permit/routes.js');
const { disciplinaryRouter } = require('./modules/disciplinary/routes.js');
const { competenceRouter } = require('./modules/competence/routes.js');
const { statisticsRouter } = require('./modules/statistics/routes.js');
const { dashboardRouter } = require('./modules/dashboard/routes.js');
const { manpowerRouter } = require('./modules/manpower/routes.js');
const { temporaryRouter } = require('./modules/temporary/routes.js');
const { usersRouter } = require('./modules/users/routes.js');
const { pollingRouter } = require('./modules/polling/routes.js');
const { exportRouter } = require('./modules/export/routes.js');

module.exports = { router };
