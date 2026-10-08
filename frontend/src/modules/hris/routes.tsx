import type { RouteObject } from 'react-router-dom';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import './landing/landing.css';
import { AuthProvider } from './auth/AuthContext.jsx';
import HrisApp from './App.jsx';

function HrisRoot() {
  return (
    <AuthProvider>
      <HrisApp />
    </AuthProvider>
  );
}

export const hrisRoutes: RouteObject = { path: 'hris/*', element: <HrisRoot /> };
