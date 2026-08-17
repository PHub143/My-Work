import React from 'react';
import { NavLink } from 'react-router-dom';
import './LearningTabs.css';

/**
 * Track switcher for the learning area. Sits directly under the top of the
 * page, above the hub content:
 *
 *   <LearningTabs />
 */
const TRACKS = [
  { to: '/learning/home', label: 'Home', end: true },
  { to: '/learning/ai-103', label: 'AI-103' },
  { to: '/learning/ai-102', label: 'AI-102' },
  { to: '/learning/english', label: 'English' }
];

const LearningTabs = ({ children }) => (
  <div className="learn-tabs">
    <nav className="learn-tabs-list" aria-label="Study tracks">
      {TRACKS.map((track) => (
        <NavLink key={track.to} to={track.to} end={track.end} className="learn-tab">
          {track.label}
        </NavLink>
      ))}
    </nav>
    {children && <div className="learn-tabs-right">{children}</div>}
  </div>
);

export default LearningTabs;
