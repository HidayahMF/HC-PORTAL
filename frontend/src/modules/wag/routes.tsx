import { Navigate, Outlet, RouteObject } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './layouts/AppShell';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MonitoringSimPage from './pages/MonitoringSimPage';
import BroadcastPage from './pages/BroadcastPage';
import ScheduledMessagesPage from './pages/ScheduledMessagesPage';
import SimcPage from './pages/SimcPage';
import HolidaysPage from './pages/HolidaysPage';
import ProfilePage from './pages/ProfilePage';

function WAGProvider() { return <ErrorBoundary><AuthProvider><OutletRoutes /></AuthProvider></ErrorBoundary>; }
function OutletRoutes() { return <Outlet />; }
function ProtectedLayout() { return <ProtectedRoute><AppShell /></ProtectedRoute>; }

export const wagRoutes: RouteObject = {
  path: 'wag',
  element: <WAGProvider />,
  children: [
    { path: 'login', element: <LoginPage /> },
    { element: <ProtectedLayout />, children: [{ index: true, element: <Dashboard /> }, { path: 'monitoring', element: <MonitoringSimPage /> }, { path: 'broadcast', element: <BroadcastPage /> }, { path: 'scheduled', element: <ScheduledMessagesPage /> }, { path: 'simc', element: <SimcPage type="simc" /> }, { path: 'sima', element: <SimcPage type="sima" /> }, { path: 'holidays', element: <HolidaysPage /> }, { path: 'profile', element: <ProfilePage /> }, { path: '*', element: <Navigate to="/wag" replace /> }] },
  ],
};
