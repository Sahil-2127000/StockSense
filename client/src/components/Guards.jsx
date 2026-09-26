import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from './Feedback.jsx';

// Pages that need a login; remembers where the user wanted to go
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="full-page"><Loading label="Loading StockSense…" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

// Login / sign-up pages: already signed-in users go to the dashboard
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-page"><Loading /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export function ManagerOnly({ children }) {
  const { isManager } = useAuth();
  if (!isManager) {
    return (
      <div className="view">
        <div className="banner i">
          <div>
            <b>Managers only</b>
            <p>Ask an inventory manager if you need access to this page.</p>
          </div>
        </div>
      </div>
    );
  }
  return children;
}
