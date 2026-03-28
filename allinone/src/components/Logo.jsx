import React from 'react';
import { Link } from 'react-router-dom';
import './Logo.css';

const Logo = () => {
  return (
    <div className="logo-container">
      <Link to="/" className="logo">
        <span>A</span>
        <span>I</span>
        <span>O</span>
      </Link>
    </div>
  );
};

export default Logo;
