import React from 'react';
import DriveSwitcher from './DriveSwitcher';
import { SearchIcon } from './DriveIcons';
import './TopBar.css';

/**
 * The toolbar above every Drive page: one search field, the drive
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
        <SearchIcon />
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
        />
        <kbd aria-hidden="true">⌘K</kbd>
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
