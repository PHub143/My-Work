import React from 'react';
import './Navbar.css';
import Logo from './Logo';

const Navbar = ({ toggleTheme, currentTheme }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Logo />
        <ul className="nav-menu">
          <li className="nav-item">
            <a href="/" className="nav-links">
              Documents
            </a>
          </li>
          <li className="nav-item">
            <a href="/about" className="nav-links">
              About
            </a>
          </li>
          <li className="nav-item">
            <a href="/services" className="nav-links">
              Services
            </a>
          </li>
          <li className="nav-item">
            <a href="/upload" className="nav-links">
              Upload
            </a>
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
