import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import './AppRail.css';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { isAdmin, isStudent } from '../utils/roles';

const Icon = ({ d, children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || <path d={d} />}
  </svg>
);

const initials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const AppRail = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  const canAdmin = isAdmin(user);
  const canLearn = !isAuthenticated || isStudent(user);
  const showContent = !isAuthenticated || canAdmin;

  const items = [
    canLearn && {
      to: '/learning/ai-103',
      label: 'Study',
      match: '/learning',
      icon: (
        <Icon>
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
          <path d="M22 10v6" />
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        </Icon>
      )
    },
    showContent && {
      to: '/',
      label: 'Documents',
      exact: true,
      icon: (
        <Icon>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </Icon>
      )
    },
    showContent && {
      to: '/gallery',
      label: 'Gallery',
      icon: (
        <Icon>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </Icon>
      )
    },
    canAdmin && {
      to: '/users',
      label: 'Users',
      icon: (
        <Icon>
          <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        </Icon>
      )
    },
    canAdmin && {
      to: '/content',
      label: 'Content',
      icon: (
        <Icon>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Icon>
      )
    }
  ].filter(Boolean);

  return (
    <nav className="rail" aria-label="Main">
      <Link to="/" className="rail-mark" aria-label="Allinone home">A</Link>

      <div className="rail-items">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={() => {
              const active = item.match ? pathname.startsWith(item.match) : undefined;
              return `rail-btn${active ? ' active' : ''}`;
            }}
            title={item.label}
          >
            {item.icon}
            <span className="rail-tip">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="rail-foot">
        {canAdmin && (
          <NavLink to="/settings" className="rail-btn" title="Settings">
            <Icon>
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </Icon>
            <span className="rail-tip">Settings</span>
          </NavLink>
        )}

        <button
          type="button"
          className="rail-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? (
            <Icon d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          ) : (
            <Icon>
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
            </Icon>
          )}
          <span className="rail-tip">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            className="rail-avatar"
            onClick={logout}
            title={`${user?.name || 'Account'} · sign out`}
          >
            {initials(user?.name)}
            <span className="rail-tip">Sign out</span>
          </button>
        ) : (
          <Link to="/login" className="rail-btn" title="Sign in">
            <Icon>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </Icon>
            <span className="rail-tip">Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default AppRail;
