import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="center">Memuat…</div>;
  if (!user) return <Navigate to="/hris/login" state={{ from: location }} replace />;
  return children;
}
