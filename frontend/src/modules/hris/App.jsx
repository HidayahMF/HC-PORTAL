import { Outlet, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AppLayout from './layout/AppLayout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pkb from './pages/Pkb.jsx';
import LandingPage from './landing/LandingPage.jsx';

import EmployeeProfile from './pages/employees/EmployeeProfile.jsx';
import EmployeeForm from './pages/employees/EmployeeForm.jsx';

import DepartmentList from './pages/departments/DepartmentList.jsx';
import DivisionList from './pages/divisions/DivisionList.jsx';
import JobLevelList from './pages/joblevels/JobLevelList.jsx';
import JobtitleList from './pages/jobtitles/JobtitleList.jsx';
import Hierarchy from './pages/organization/Hierarchy.jsx';

import TrainingSummary from './pages/training/TrainingSummary.jsx';
import TrainingParticipants from './pages/training/TrainingParticipants.jsx';

import AttendanceLog from './pages/attendance/AttendanceLog.jsx';
import TimeAttendance from './pages/attendance/TimeAttendance.jsx';
import EtcomLog from './pages/attendance/EtcomLog.jsx';

import LeaveLog from './pages/leave/LeaveLog.jsx';
import MassLeave from './pages/leave/MassLeave.jsx';
import SuddenLeave from './pages/leave/SuddenLeave.jsx';
import LeaveDay from './pages/leave/LeaveDay.jsx';
import Permit from './pages/permit/Permit.jsx';
import SpecialLeave from './pages/permit/SpecialLeave.jsx';
import ShareSkk from './pages/skk/ShareSkk.jsx';
import ReportSkkPeriod from './pages/skk/ReportSkkPeriod.jsx';

import DisciplinaryList from './pages/disciplinary/DisciplinaryList.jsx';

import EmployeeCompetence from './pages/competence/EmployeeCompetence.jsx';
import Pride from './pages/competence/Pride.jsx';

import Education from './pages/statistics/Education.jsx';
import Age from './pages/statistics/Age.jsx';
import EmployeeList from './pages/statistics/EmployeeList.jsx';
import Retired from './pages/statistics/Retired.jsx';
import LevelTwo from './pages/statistics/LevelTwo.jsx';

import ManResource from './pages/manpower/ManResource.jsx';
import StrategicPlanning from './pages/manpower/StrategicPlanning.jsx';

import TemporaryList from './pages/temporary/TemporaryList.jsx';
import UserPr from './pages/users/UserPr.jsx';
import UserEp from './pages/users/UserEp.jsx';
import PolingReport from './pages/polling/PolingReport.jsx';
import EmployeeTable from './pages/export/EmployeeTable.jsx';

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pkb" element={<Pkb />} />

        <Route path="employees" element={<EmployeeProfile />} />
        <Route path="employees/new" element={<EmployeeForm mode="insert" />} />
        <Route path="employees/:nip" element={<EmployeeProfile />} />
        <Route path="employees/:nip/edit" element={<EmployeeForm mode="update" />} />

        <Route path="divisions" element={<DivisionList />} />
        <Route path="departments" element={<DepartmentList />} />
        <Route path="joblevels" element={<JobLevelList />} />
        <Route path="jobtitles" element={<JobtitleList />} />
        <Route path="organization/:nip" element={<Hierarchy />} />

        <Route path="training" element={<TrainingSummary />} />
        <Route path="training/participants" element={<TrainingParticipants />} />

        <Route path="attendance/logs" element={<AttendanceLog />} />
        <Route path="attendance/timeatt" element={<TimeAttendance />} />
        <Route path="attendance/etcom" element={<EtcomLog />} />

        <Route path="leave/log" element={<LeaveLog />} />
        <Route path="leave/massal" element={<MassLeave />} />
        <Route path="leave/sudden" element={<SuddenLeave />} />
        <Route path="leave/day" element={<LeaveDay />} />
        <Route path="permit" element={<Permit />} />
        <Route path="special-leave" element={<SpecialLeave />} />
        <Route path="skk/share" element={<ShareSkk />} />
        <Route path="skk/report" element={<ReportSkkPeriod />} />

        <Route path="disciplinary" element={<DisciplinaryList />} />

        <Route path="competence/employee" element={<EmployeeCompetence />} />
        <Route path="competence/pride" element={<Pride />} />

        <Route path="statistics/education" element={<Education />} />
        <Route path="statistics/age" element={<Age />} />
        <Route path="statistics/employees" element={<EmployeeList />} />
        <Route path="statistics/retired" element={<Retired />} />
        <Route path="statistics/level-two" element={<LevelTwo />} />

        <Route path="manpower/resource" element={<ManResource />} />
        <Route path="manpower/strategic" element={<StrategicPlanning />} />

        <Route path="temporary" element={<TemporaryList />} />
        <Route path="users/pr" element={<UserPr />} />
        <Route path="users/ep" element={<UserEp />} />
        <Route path="polling" element={<PolingReport />} />
        <Route path="export/employees" element={<EmployeeTable />} />
      </Route>
    </Routes>
  );
}
