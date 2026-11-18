import React from 'react';
import './SettingsNotice.css';

// Status notice for the Settings page and its Mail tab. A result is never colour
// alone: every type carries an icon and a lead word.
const LEAD = {
  success: 'Done.',
  error: 'Error.',
  setup: 'Setup needed.',
};

const NoticeIcon = ({ type }) => (
  <svg
    className="settings-notice__icon"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {type === 'success' && <path d="M4.5 10.5l3.5 3.5 7.5-8" />}
    {type === 'error' && (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
      </>
    )}
    {type === 'setup' && (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 9v4.5M10 6.5v.01" />
      </>
    )}
  </svg>
);

const SettingsNotice = ({ type, children }) => {
  if (!type || !LEAD[type]) return null;
  return (
    <div className={`settings-notice settings-notice--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <NoticeIcon type={type} />
      <span>
        <b>{LEAD[type]}</b> {children}
      </span>
    </div>
  );
};

export default SettingsNotice;
