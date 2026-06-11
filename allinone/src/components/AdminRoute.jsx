import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../utils/roles';
import Spinner from './Spinner';

/**
 * A wrapper component that checks if the user is an Admin.
 * Redirects unauthenticated users to /login and non-admins to Learning.
 */
const AdminRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}>
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login with the current location for redirection after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin(user)) {
    return <Navigate to="/learning/ai-103" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
