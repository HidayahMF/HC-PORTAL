import { Navigate, RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ContractForm } from './pages/ContractForm';
import { ContractDetail } from './pages/ContractDetail';
import { UserManagement } from './pages/UserManagement';

function ProtectedLayout() { return <AuthGuard><Layout /></AuthGuard>; }

export const kontrakRoutes: RouteObject = {
  path: 'kontrak',
  children: [
    { path: 'login', element: <Login /> },
    { element: <ProtectedLayout />, children: [{ index: true, element: <Navigate to="dashboard" replace /> }, { path: 'dashboard', element: <Dashboard /> }, { path: 'contracts/new', element: <ContractForm /> }, { path: 'contracts/:id', element: <ContractDetail /> }, { path: 'contracts/:id/edit', element: <ContractForm /> }, { path: 'admin/users', element: <AuthGuard requiredRole="ADMIN"><UserManagement /></AuthGuard> }] },
  ],
};
