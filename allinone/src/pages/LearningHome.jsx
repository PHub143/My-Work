import React from 'react';
import { Link } from 'react-router-dom';
import './LearningHome.css';
import { useAuth } from '../AuthContext';
import { AI_103_TRACK, AI_102_TRACK } from '../data/learningTracks.js';
import { YBM_VOLUMES, TESTS_PER_VOLUME } from '../data/ybm/manifest.js';

const TRACKS = [
  {
    to: '/learning/ai-103',
    title: AI_103_TRACK.title,
    subtitle: AI_103_TRACK.subtitle,
    detail: `${AI_103_TRACK.questionCount} questions`,
  },
  {
    to: '/learning/ai-102',
    title: AI_102_TRACK.title,
    subtitle: AI_102_TRACK.subtitle,
    detail: `${AI_102_TRACK.questionCount} questions`,
  },
  {
    to: '/learning/english',
    title: 'English',
    subtitle: 'TOEIC practice — YBM 실전토익 1000',
    detail: `${YBM_VOLUMES.length * TESTS_PER_VOLUME} full tests`,
  },
];

const ArrowRight = () => (
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
);

const LearningHome = () => {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="learning-home">
      <div className="learning-home-content">
        <header className="learning-home-header">
          <span className="as-label learning-home-eyebrow">Study</span>
          <h1 className="as-display">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
          <p className="learning-home-lead">Pick up where you left off, or start a new track.</p>
        </header>

        <div className="learning-home-grid">
          {TRACKS.map((track) => (
            <Link key={track.to} to={track.to} className="learning-home-card">
              <span className="as-tag learning-home-card-tag">{track.detail}</span>
              <div className="learning-home-card-copy">
                <h2 className="as-headline">{track.title}</h2>
                <p>{track.subtitle}</p>
              </div>
              <span className="learning-home-card-cta">
                <span className="learning-home-card-cta-text">Open track</span>
                <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningHome;
