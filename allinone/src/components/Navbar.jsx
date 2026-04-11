import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import Logo from './Logo';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Logo />
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-links">
              Documents
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/gallery" className="nav-links">
              Gallery
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/services" className="nav-links">
              Services
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/upload" className="nav-links">
              Upload
            </Link>
          </li>
          {user?.role === 'ADMIN' && (
            <li className="nav-item">
              <Link to="/settings" className="nav-links">
                ⚙️ Settings
              </Link>
            </li>
          )}
          <li className="nav-item">
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </li>
          <li className="nav-item">
            {isAuthenticated ? (
              <div className="auth-section">
                <div className="user-avatar" title={user?.name || 'User'}>
                  {(() => {
                    const name = user?.name || '';
                    const parts = name.trim().split(/\s+/);
                    const first = parts[0]?.charAt(0) || '';
                    const second = parts[1]?.charAt(0) || '';
                    return (first + second).toUpperCase() || '?';
                  })()}
                </div>
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link to="/login" className="login-btn" title="Login">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
