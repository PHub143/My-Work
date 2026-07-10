import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import Logo from './Logo';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { isAdmin, isStudent } from '../utils/roles';
import DriveSwitcher from './DriveSwitcher';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const learningRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLearningOpen, setIsLearningOpen] = useState(false);
  const isLearningActive = location.pathname.startsWith('/learning');
  const canAdmin = isAdmin(user);
  const canLearn = !isAuthenticated || isStudent(user);
  const showContentTabs = !isAuthenticated || canAdmin;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (learningRef.current && !learningRef.current.contains(event.target)) {
        setIsLearningOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsLearningOpen(false);
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
          {showContentTabs && (
            <>
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
            </>
          )}
          {canLearn && (
            <li className="nav-item nav-dropdown" ref={learningRef}>
              {!isAuthenticated ? (
                <NavLink to="/learning/ai-103" className="nav-links">
                  Learning
                </NavLink>
              ) : (
                <>
                  <button
                    type="button"
                    className={`nav-links nav-dropdown-trigger ${isLearningActive ? 'active' : ''}`}
                    aria-haspopup="menu"
                    aria-expanded={isLearningOpen}
                    onClick={() => setIsLearningOpen((open) => !open)}
                  >
                    Learning
                  </button>
                  {isLearningOpen && (
                    <div className="nav-dropdown-menu" role="menu">
                      <NavLink
                        to="/learning/ai-103"
                        className="nav-dropdown-item"
                        role="menuitem"
                        onClick={() => setIsLearningOpen(false)}
                      >
                        <span>AI</span>
                        <small>AI-103</small>
                      </NavLink>
                      <NavLink
                        to="/learning/english"
                        className="nav-dropdown-item"
                        role="menuitem"
                        onClick={() => setIsLearningOpen(false)}
                      >
                        <span>English</span>
                        <small>TOEIC practice</small>
                      </NavLink>
                    </div>
                  )}
                </>
              )}
            </li>
          )}
          {canAdmin && (
            <>
              <li className="nav-item">
                <NavLink to="/users" className="nav-links">
                  Users
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/content" className="nav-links">
                  Content
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
          <button
            type="button"
            className="theme-toggle-btn"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={toggleTheme}
          >
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
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
