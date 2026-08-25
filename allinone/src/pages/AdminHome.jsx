import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminHome.css';
import { useAuth } from '../AuthContext';

const FEATURES = [
  {
    to: '/documents',
    title: 'Documents',
    subtitle: 'Browse, search, and manage the files stored in Drive.',
  },
  {
    to: '/gallery',
    title: 'Gallery',
    subtitle: 'Preview image and media files at a glance.',
  },
  {
    to: '/upload',
    title: 'Upload',
    subtitle: 'Add new files to Drive.',
  },
  {
    to: '/users',
    title: 'Users',
    subtitle: 'Manage student and admin accounts.',
  },
  {
    to: '/settings',
    title: 'Settings',
    subtitle: 'Configure the Google Drive connection.',
  },
  {
    to: '/learning/home',
    title: 'Study',
    subtitle: 'Preview the learning tracks students see — AI-103, AI-102, TOEIC.',
  },
];

const AdminHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="admin-home">
      <header className="admin-home-header">
        <h1>{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
        <p>Everything you can manage, in one place.</p>
      </header>

      <div className="admin-home-grid">
        {FEATURES.map((feature) => (
          <button
            key={feature.to}
            type="button"
            className="admin-home-card"
            onClick={() => navigate(feature.to)}
          >
            <h2>{feature.title}</h2>
            <p>{feature.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminHome;
