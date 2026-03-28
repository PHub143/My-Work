import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import Logo from './Logo';

const Navbar = ({ toggleTheme, currentTheme }) => {
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
            <Link to="/about" className="nav-links">
              About
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
            <button onClick={toggleTheme} className="theme-toggle">
              {currentTheme === 'light' ? '🌙' : '☀️'}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
