import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { API_URL } from '../config';
import Spinner from './Spinner';

/**
 * A wrapper component that checks if Google Drive is configured.
 * Redirects to /settings if configuration is missing.
 */
const ProtectedRoute = () => {
  const [isConfigured, setIsConfigured] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/config/drive`);
        if (response.ok) {
          const data = await response.json();
          // We consider it configured if we have both client credentials and a refresh token
          const configured = data.config && data.config.hasClientSecret && data.config.hasRefreshToken;
          setIsConfigured(configured);
        } else {
          setIsConfigured(false);
        }
      } catch (error) {
        console.error('Error checking Drive configuration:', error);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

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

  if (!isConfigured) {
    // Redirect to settings with a message
    return <Navigate to="/settings" state={{ 
      message: 'Google Drive setup is required to access this page.',
      from: location.pathname 
    }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
