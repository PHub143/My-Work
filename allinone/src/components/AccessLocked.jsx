import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { STUDENT_LOGIN_ROUTE } from '../utils/routeAccess';
import '../pages/Login.css';

const AccessLocked = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    // Always the student portal — the admin sign-in route is never surfaced
    // by a redirect, only reachable by navigating to it directly.
    navigate(STUDENT_LOGIN_ROUTE, { replace: true, state: { from: location.pathname } });
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <h2>Admin login required</h2>
        <button type="button" className="login-submit-btn primary-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default AccessLocked;
