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
              <button onClick={handleLogout} className="nav-links logout-btn">
                Logout ({user.name || 'Admin'})
              </button>
            ) : (
              <Link to="/login" className="nav-links login-btn">
                Login
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
