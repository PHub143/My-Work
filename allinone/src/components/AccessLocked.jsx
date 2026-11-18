import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AccessLocked.css';
import { useAuth } from '../AuthContext';
import { STUDENT_LOGIN_ROUTE } from '../utils/routeAccess';
import { LockIcon } from './DriveIcons';

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
    <div className="access-locked">
      <section className="access-card" aria-labelledby="access-locked-title">
        <div className="access-icon" aria-hidden="true">
          <LockIcon size={28} stroke={1.25} />
        </div>
        <div className="access-copy">
          <span className="as-label access-eyebrow">Admin only</span>
          <h1 id="access-locked-title" className="as-headline">Admin login required</h1>
          <p>Sign in with an admin account to open this page.</p>
        </div>
        <button type="button" className="as-btn as-btn--primary" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </div>
  );
};

export default AccessLocked;
