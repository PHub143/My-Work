import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import Logo from './Logo';
import { useTheme } from '../ThemeContext';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

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
          <li className="nav-item">
            <Link to="/settings" className="nav-links">
              ⚙️ Settings
            </Link>
          </li>
          <li className="nav-item">
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
