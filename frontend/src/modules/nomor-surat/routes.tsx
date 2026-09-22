import { Navigate, Outlet, RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import { Dashboard } from './pages/Dashboard';
import { CreateLetter } from './pages/CreateLetter';
import { LetterDetail } from './pages/LetterDetail';
import { UserManagement } from './pages/UserManagement';
import { Login } from './pages/Login';

function PublicLayout() { return <Layout publicOnly />; }
function ProtectedLayout() { return <AuthGuard><Layout /></AuthGuard>; }

export const nomorSuratRoutes: RouteObject = {
  path: 'nomor-surat',
  children: [
    { path: 'login', element: <Login onLogin={() => location.replace('/nomor-surat/dashboard')} /> },
    { element: <PublicLayout />, children: [{ index: true, element: <Navigate to="letters/new" replace /> }, { path: 'letters/new', element: <CreateLetter /> }] },
    { element: <ProtectedLayout />, children: [{ path: 'dashboard', element: <Dashboard /> }, { path: 'admin/users', element: <UserManagement /> }, { path: 'letters/:id', element: <LetterDetail /> }] },
  ],
};
