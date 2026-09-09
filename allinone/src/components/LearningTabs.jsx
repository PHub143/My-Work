import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './LearningTabs.css';

/**
 * Track switcher for the learning area. Sits directly under the top of the
 * page, above the hub content:
 *
 *   <LearningTabs />
 *
 * AI-103 and AI-102 share one "AI" tab; the AI-103/AI-102 sub-switch lives
 * on those pages (components/AiTrackSwitch.jsx), the same way English hosts
 * the YBM/Hacker collection switch.
 */
const TRACKS = [
  { to: '/learning/home', label: 'Home', end: true },
  { to: '/learning/ai-103', label: 'AI', match: ['/learning/ai-103', '/learning/ai-102'] },
  { to: '/learning/english', label: 'English' }
];

const LearningTabs = ({ children }) => {
  const { pathname } = useLocation();

  return (
    <div className="learn-tabs">
      <nav className="learn-tabs-list" aria-label="Study tracks">
        {TRACKS.map((track) => {
          const forcedActive = track.match?.some((prefix) => pathname.startsWith(prefix));
          return (
            <NavLink
              key={track.to}
              to={track.to}
              end={track.end}
              className={({ isActive }) => `learn-tab${isActive || forcedActive ? ' active' : ''}`}
            >
              {track.label}
            </NavLink>
          );
        })}
      </nav>
      {children && <div className="learn-tabs-right">{children}</div>}
    </div>
  );
};

export default LearningTabs;
