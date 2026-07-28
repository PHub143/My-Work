import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../utils/roles';
import { STUDENT_LOGIN_ROUTE } from '../utils/routeAccess';
import Spinner from './Spinner';
import AccessLocked from './AccessLocked';

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
    // Always the student portal — the admin sign-in route is never surfaced
    // by a redirect, only reachable by navigating to it directly.
    return <Navigate to={STUDENT_LOGIN_ROUTE} state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin(user)) {
    return <AccessLocked />;
  }

  return <Outlet />;
};

export default AdminRoute;
