import React from 'react';
import './TopBar.css';
import DriveSwitcher from './DriveSwitcher';

/**
 * The 56px bar above every signed-in page: one search field, the drive
 * switcher, and at most one primary action.
 *
 *   <TopBar value={q} onChange={setQ} placeholder="Search file names…"
 *           action={{ label: 'Upload', to: '/upload' }} />
 */
const TopBar = ({
  value = '',
  onChange,
  placeholder = 'Search…',
  showDrive = true,
  action = null,
  children
}) => (
  <div className="topbar">
    {onChange && (
      <label className="topbar-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.2" y2="16.2" />
        </svg>
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
        />
        <kbd>⌘K</kbd>
      </label>
    )}

    <div className="topbar-right">
      {children}
      {showDrive && <DriveSwitcher />}
      {action &&
        (action.to ? (
          <a className="topbar-action" href={`#${action.to}`}>{action.label}</a>
        ) : (
          <button type="button" className="topbar-action" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  </div>
);

export default TopBar;
