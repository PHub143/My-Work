import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LearningHome.css';
import LearningTabs from '../components/LearningTabs';
import { useAuth } from '../AuthContext';
import ai103Content from '../data/ai103Content.json';
import ai102Content from '../data/ai102Content.json';
import { YBM_VOLUMES, TESTS_PER_VOLUME } from '../data/ybm/manifest.js';

const TRACKS = [
  {
    to: '/learning/ai-103',
    title: ai103Content.title,
    subtitle: ai103Content.subtitle,
    detail: `${ai103Content.questionCount} questions`,
  },
  {
    to: '/learning/ai-102',
    title: ai102Content.title,
    subtitle: ai102Content.subtitle,
    detail: `${ai102Content.questionCount} questions`,
  },
  {
    to: '/learning/english',
    title: 'English',
    subtitle: 'TOEIC practice — YBM 실전토익 1000',
    detail: `${YBM_VOLUMES.length * TESTS_PER_VOLUME} full tests`,
  },
];

const LearningHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="learning-home">
      <LearningTabs />
      <div className="learning-home-content">
        <header className="learning-home-header">
          <h1>{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
          <p>Pick up where you left off, or start a new track.</p>
        </header>

        <div className="learning-home-grid">
          {TRACKS.map((track) => (
            <button
              key={track.to}
              type="button"
              className="learning-home-card"
              onClick={() => navigate(track.to)}
            >
              <h2>{track.title}</h2>
              <p>{track.subtitle}</p>
              <span className="learning-home-card-detail">{track.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningHome;
