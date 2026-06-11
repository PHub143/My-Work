import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { API_URL } from '../config';
import Spinner from './Spinner';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../utils/roles';
import AccessLocked from './AccessLocked';

/**
 * A wrapper component that checks if Google Drive is configured.
 * Redirects Admins to /settings if configuration is missing.
 * Redirects regular users to Learning.
 */
const ProtectedRoute = () => {
  const [isConfigured, setIsConfigured] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/config/drive`);
        if (response.ok) {
          const data = await response.json();
          const configured = data.config && data.config.hasClientSecret && data.config.hasRefreshToken;
          setIsConfigured(configured);
        } else {
          setIsConfigured(false);
        }
      } catch (error) {
        console.error('Error checking Drive configuration:', error);
        setIsConfigured(false);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    checkConfig();
  }, []);

  if (isLoadingConfig || isLoadingAuth) {
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

  const canAdmin = isAdmin(user);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!canAdmin) {
    return <AccessLocked />;
  }

  if (!isConfigured) {
    return <Navigate to="/settings" state={{
      message: 'Google Drive setup is required to access this page.',
      from: location.pathname
    }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
