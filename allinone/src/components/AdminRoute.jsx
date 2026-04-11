import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Spinner from './Spinner';

/**
 * A wrapper component that checks if the user is an Admin.
 * Redirects to /login if not authenticated or not an Admin.
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

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    // Redirect to login with the current location for redirection after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
