import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { isAdmin } from '../utils/roles';
import FeedbackModal from './FeedbackModal';
import './AppNav.css';

/**
 * The app shell navigation, one component with three layouts:
 *  - wide screens: a top bar (wordmark, section links, actions, account badge)
 *  - phones: an app bar on top and a bottom tab bar
 *  - admins inside /learning also get the Home / AI / English tracks as a sub-nav
 * Students see the study tracks as their main links; admins see the admin sections.
 */

const Glyph = ({ children, box = 20 }) => (
  <svg
    className="shell-glyph"
    width="20"
    height="20"
    viewBox={`0 0 ${box} ${box}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={(1.5 * box) / 20}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS = {
  home: <path d="M3.5 9L10 3.5 16.5 9v7.5a1 1 0 0 1-1 1h-3.5v-5h-4v5H4.5a1 1 0 0 1-1-1z" />,
  ai: (
    <>
      <rect x="5" y="5" width="10" height="10" rx="1.5" />
      <path d="M8 2.5V5M12 2.5V5M8 15v2.5M12 15v2.5M2.5 8H5M2.5 12H5M15 8h2.5M15 12h2.5" />
    </>
  ),
  english: (
    <>
      <path d="M4 3.5h8a2 2 0 0 1 2 2v11H6a2 2 0 0 1-2-2z" />
      <path d="M4 14.5a2 2 0 0 1 2-2h8" />
    </>
  ),
  account: (
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 16.5c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" />
    </>
  ),
  documents: (
    <>
      <path d="M5.5 2.5h6l3 3v12h-9z" />
      <path d="M11.5 2.5v3h3" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <circle cx="7.5" cy="7.5" r="1.2" />
      <path d="M17 12.5l-4-4-8 8.5" />
    </>
  ),
  inbox: (
    <>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M3 6l7 5 7-5" />
    </>
  ),
  users: (
    <>
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 16.5c.7-2.7 2.7-4 5.5-4s4.8 1.3 5.5 4" />
      <path d="M13 4.2a3 3 0 0 1 0 5.6M14.5 12.8c1.6.5 2.6 1.8 3 3.7" />
    </>
  ),
  more: (
    <>
      <circle cx="4.5" cy="10" r="1" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="15.5" cy="10" r="1" />
    </>
  ),
  feedback: (
    <path d="M17 13a1.5 1.5 0 0 1-1.5 1.5H6.5L3 18V5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5z" />
  ),
  theme: <path d="M16.5 11.5A6.5 6.5 0 1 1 8.5 3.5a5 5 0 0 0 8 8z" />,
  signOut: <path d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8M13 14l4-4-4-4M17 10H8" />
};

// Settings gear, drawn on a 24px grid.
const GEAR = (
  <>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

// `match` lists path prefixes that mark a link current; without it the path must equal `to`.
const STUDENT_LINKS = [
  { to: '/learning/home', label: 'Home', icon: 'home' },
  { to: '/learning/ai-103', label: 'AI', icon: 'ai', match: ['/learning/ai-103', '/learning/ai-102'] },
  { to: '/learning/english', label: 'English', icon: 'english', match: ['/learning/english'] }
];

const ADMIN_LINKS = [
  { to: '/learning/home', label: 'Study', match: ['/learning'] },
  { to: '/documents', label: 'Documents', match: ['/documents'] },
  { to: '/gallery', label: 'Gallery', match: ['/gallery'] },
  { to: '/inbox', label: 'Inbox', match: ['/inbox'] },
  { to: '/users', label: 'Users', match: ['/users'] },
  { to: '/feedback', label: 'Feedback', match: ['/feedback'] }
];

const STUDENT_TABS = [
  ...STUDENT_LINKS,
  { to: '/account', label: 'Account', icon: 'account', match: ['/account'] }
];

const ADMIN_TABS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/documents', label: 'Documents', icon: 'documents', match: ['/documents'] },
  { to: '/inbox', label: 'Inbox', icon: 'inbox', match: ['/inbox'] },
  { to: '/users', label: 'Users', icon: 'users', match: ['/users'] }
];

// Admin phone tabs hold four sections; the rest open from a "More" sheet.
const MORE_LINKS = [
  { to: '/learning/home', label: 'Study', icon: 'english' },
  { to: '/gallery', label: 'Gallery', icon: 'gallery' },
  { to: '/feedback', label: 'Feedback', icon: 'feedback' },
  { to: '/settings', label: 'Settings', gear: true },
  { to: '/account', label: 'Account', icon: 'account' }
];
const MORE_PREFIXES = ['/learning', '/gallery', '/feedback', '/settings', '/upload', '/account'];

const isCurrent = (entry, pathname) =>
  entry.match ? entry.match.some((prefix) => pathname.startsWith(prefix)) : pathname === entry.to;

const initials = (name) => {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const AppNav = () => {
  const { theme, themes, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const moreRef = useRef(null);

  const variant = !isAuthenticated ? 'guest' : isAdmin(user) ? 'admin' : 'student';
  const links = variant === 'admin' ? ADMIN_LINKS : variant === 'student' ? STUDENT_LINKS : [];
  const tabs = variant === 'admin' ? ADMIN_TABS : variant === 'student' ? STUDENT_TABS : [];
  const homeTarget = variant === 'admin' ? '/' : variant === 'student' ? '/learning/home' : '/login';
  const themeLabel = themes.find((entry) => entry.id === theme)?.label ?? '';
  const showSubnav = variant === 'admin' && pathname.startsWith('/learning');
  const moreCurrent = MORE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const closeMore = () => moreRef.current?.close();

  const actions = (withSettings) => {
    if (variant === 'guest') {
      return (
        <Link to="/login" className="as-btn as-btn--secondary">
          Sign in
        </Link>
      );
    }

    return (
      <>
        {withSettings && variant === 'admin' && (
          <Link
            to="/settings"
            className="shell-icon-btn"
            aria-label="Settings"
            title="Settings"
            aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          >
            <Glyph box={24}>{GEAR}</Glyph>
          </Link>
        )}
        <button
          type="button"
          className="shell-icon-btn"
          aria-label="Send feedback"
          title="Send feedback"
          onClick={() => setFeedbackOpen(true)}
        >
          <Glyph>{ICONS.feedback}</Glyph>
        </button>
        <button
          type="button"
          className="shell-icon-btn"
          aria-label={`Change theme, now ${themeLabel}`}
          title="Change theme"
          onClick={toggleTheme}
        >
          <Glyph>{ICONS.theme}</Glyph>
        </button>
        <button
          type="button"
          className="shell-icon-btn"
          aria-label="Sign out"
          title="Sign out"
          onClick={logout}
        >
          <Glyph>{ICONS.signOut}</Glyph>
        </button>
      </>
    );
  };

  return (
    <>
      <header className="shell-bar">
        <div className="shell-bar-inner">
          <Link to={homeTarget} className="shell-wordmark">Allinone</Link>

          {links.length > 0 && (
            <nav className="shell-nav" aria-label="Main">
              {links.map((entry) => (
                <Link
                  key={entry.to + entry.label}
                  to={entry.to}
                  className="shell-link"
                  aria-current={isCurrent(entry, pathname) ? 'page' : undefined}
                >
                  {entry.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="shell-actions">
            {actions(true)}
            {variant !== 'guest' && (
              <Link
                to="/account"
                className="shell-badge"
                aria-label="Account"
                title={user?.name || 'Account'}
                aria-current={pathname.startsWith('/account') ? 'page' : undefined}
              >
                {initials(user?.name)}
              </Link>
            )}
          </div>
        </div>
      </header>

      <header className="shell-appbar">
        <Link to={homeTarget} className="shell-wordmark">Allinone</Link>
        <div className="shell-actions">{actions(false)}</div>
      </header>

      {showSubnav && (
        <div className="shell-subnav">
          <nav className="shell-subnav-inner" aria-label="Study tracks">
            {STUDENT_LINKS.map((entry) => (
              <Link
                key={entry.to}
                to={entry.to}
                className="shell-link"
                aria-current={isCurrent(entry, pathname) ? 'page' : undefined}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {tabs.length > 0 && (
        <nav className="shell-tabs" aria-label="Main">
          {tabs.map((entry) => (
            <Link
              key={entry.to + entry.label}
              to={entry.to}
              className="shell-tab"
              aria-current={isCurrent(entry, pathname) ? 'page' : undefined}
            >
              <Glyph>{ICONS[entry.icon]}</Glyph>
              {entry.label}
            </Link>
          ))}
          {variant === 'admin' && (
            <button
              type="button"
              className="shell-tab"
              aria-haspopup="dialog"
              aria-current={moreCurrent ? 'page' : undefined}
              onClick={() => moreRef.current?.showModal()}
            >
              <Glyph>{ICONS.more}</Glyph>
              More
            </button>
          )}
        </nav>
      )}

      {variant === 'admin' && (
        <dialog
          ref={moreRef}
          className="shell-sheet"
          aria-label="More"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMore();
          }}
        >
          <div className="shell-sheet-head">
            <strong>More</strong>
            <button type="button" className="shell-sheet-close" onClick={closeMore}>Close</button>
          </div>
          <ul className="shell-sheet-list">
            {MORE_LINKS.map((entry) => (
              <li key={entry.to}>
                <Link
                  to={entry.to}
                  className="shell-sheet-link"
                  aria-current={isCurrent(entry, pathname) ? 'page' : undefined}
                  onClick={closeMore}
                >
                  {entry.gear ? <Glyph box={24}>{GEAR}</Glyph> : <Glyph>{ICONS[entry.icon]}</Glyph>}
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </dialog>
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
};

export default AppNav;
