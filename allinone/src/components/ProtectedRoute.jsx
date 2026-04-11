import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { API_URL } from '../config';
import Spinner from './Spinner';
import { useAuth } from '../AuthContext';

/**
 * A wrapper component that checks if Google Drive is configured.
 * Redirects Admins to /settings if configuration is missing.
 * Shows a message to regular users.
 */
const ProtectedRoute = () => {
  const [isConfigured, setIsConfigured] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const { user, isLoading: isLoadingAuth } = useAuth();
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

  // Removed !isAuthenticated check to make login optional for public pages

  if (!isConfigured) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/settings" state={{ 
        message: 'Google Drive setup is required to access this page.',
        from: location.pathname 
      }} replace />;
    } else {
      return (
        <div className="status-message-container glass" style={{ margin: '2rem', padding: '3rem', textAlign: 'center', borderRadius: '20px' }}>
          <h2>System Unavailable</h2>
          <p style={{ color: 'var(--color-secondary-label)', marginTop: '1rem' }}>
            The Google Drive integration is not yet configured. 
            Please contact the system administrator to complete the setup.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/login" className="text-btn">Admin Login</Link>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
