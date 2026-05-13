import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
import Logo from './Logo';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import DriveSwitcher from './DriveSwitcher';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Logo />
          <DriveSwitcher />
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <NavLink to="/" end className="nav-links">
              Documents
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/gallery" className="nav-links">
              Gallery
            </NavLink>
          </li>
          {user?.role === 'ADMIN' && (
            <>
              <li className="nav-item">
                <NavLink to="/users" className="nav-links">
                  Users
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/upload" className="nav-links">
                  Upload
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/settings" className="nav-links">
                  Settings
                </NavLink>
              </li>
            </>
          )}
        </ul>

        <div className="navbar-right">
          <button type="button" className="pro-pill" aria-label="Pro plan">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l2.46 5.27L20 10.25l-5.54 2.48L12 18l-2.46-5.27L4 10.25l5.54-2.48L12 2.5z" />
            </svg>
            Pro
          </button>
          {isAuthenticated ? (
            <div className="auth-section" ref={profileRef}>
              <button
                type="button"
                className="user-avatar user-avatar-button"
                title={user?.name || 'User'}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((open) => !open)}
              >
                {(() => {
                  const name = user?.name || '';
                  const parts = name.trim().split(/\s+/);
                  const first = parts[0]?.charAt(0) || '';
                  const second = parts[1]?.charAt(0) || '';
                  return (first + second).toUpperCase() || '?';
                })()}
              </button>
              {isProfileOpen && (
                <div className="profile-menu" role="menu">
                  <button
                    type="button"
                    className="profile-menu-item"
                    onClick={() => {
                      toggleTheme();
                      setIsProfileOpen(false);
                    }}
                  >
                    {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
                  </button>
                  <button
                    type="button"
                    className="profile-menu-item danger"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-btn" title="Login">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
