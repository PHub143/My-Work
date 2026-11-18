import React from 'react';
import { Link } from 'react-router-dom';
import './AdminHome.css';
import { useAuth } from '../AuthContext';

// `icon` is the stroke path for each card's 20px icon tile.
const FEATURES = [
  {
    to: '/documents',
    title: 'Documents',
    subtitle: 'Browse, search, and manage the files stored in Drive.',
    icon: 'M5.5 2.5h6l3 3v12h-9zM11.5 2.5v3h3',
  },
  {
    to: '/gallery',
    title: 'Gallery',
    subtitle: 'Preview image and media files at a glance.',
    icon: 'M3.5 4.5h13v11h-13zM3.5 13.5l4-4 3 3 2-2 3.5 3.5M12 7.5h.01',
  },
  {
    to: '/upload',
    title: 'Upload',
    subtitle: 'Add new files to Drive.',
    icon: 'M10 13V3.5M6.5 7L10 3.5 13.5 7M3.5 13.5v3h13v-3',
  },
  {
    to: '/users',
    title: 'Users',
    subtitle: 'Manage student and admin accounts.',
    icon: 'M13 17v-1.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V17M8 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17 17v-1.5a3 3 0 0 0-2-2.8M13 4.7a2.5 2.5 0 0 1 0 4.6',
  },
  {
    to: '/feedback',
    title: 'Feedback',
    subtitle: 'Review what users submitted and triage it.',
    icon: 'M17 13a1.5 1.5 0 0 1-1.5 1.5H6.5L3 18V5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5z',
  },
  {
    to: '/settings',
    title: 'Settings',
    subtitle: 'Configure the Google Drive connection.',
    icon: 'M3 6h9M15 6h2M3 14h2M8 14h9M12 6a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M5 14a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  },
  {
    to: '/learning/home',
    title: 'Study',
    subtitle: 'Preview the learning tracks students see — AI-103, AI-102, TOEIC.',
    icon: 'M4 3.5h8a2 2 0 0 1 2 2v11H6a2 2 0 0 1-2-2zM4 14.5a2 2 0 0 1 2-2h8',
  },
];

const Glyph = ({ d }) => (
  <svg
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
    <path d={d} />
  </svg>
);

const AdminHome = () => {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="admin-home">
      <header className="admin-home-header">
        <span className="as-label admin-home-eyebrow">Admin</span>
        <h1 className="as-display">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
        <p className="admin-home-lead">Everything you can manage, in one place.</p>
      </header>

      <div className="admin-home-grid">
        {FEATURES.map((feature) => (
          <Link key={feature.to} to={feature.to} className="admin-home-card">
            <span className="admin-home-card-icon">
              <Glyph d={feature.icon} />
            </span>
            <div className="admin-home-card-copy">
              <h2 className="as-title">{feature.title}</h2>
              <p>{feature.subtitle}</p>
            </div>
            <span className="admin-home-card-cta">
              Open
              <svg
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
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminHome;
