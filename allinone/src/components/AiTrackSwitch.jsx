import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AiTrackSwitch.css';

// Segmented switch between the AI certification tracks, shown at the top of
// pages/AI103.jsx and pages/AI102.jsx. These two share a single "AI" tab in
// LearningTabs, so this is where you move between them — mirrors
// components/ToeicCollectionSwitch.jsx for the English side.
const TRACKS = [
  { id: 'ai-103', label: 'AI-103', path: '/learning/ai-103' },
  { id: 'ai-102', label: 'AI-102', path: '/learning/ai-102' },
];

const AiTrackSwitch = ({ active }) => {
  const navigate = useNavigate();

  return (
    <nav className="ai-track-switch" aria-label="AI certification tracks">
      <div className="ai-track-switch-pills" role="tablist">
        {TRACKS.map((track) => {
          const isActive = track.id === active;
          return (
            <button
              key={track.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ai-track-pill${isActive ? ' is-active' : ''}`}
              disabled={isActive}
              onClick={() => navigate(track.path)}
            >
              {track.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AiTrackSwitch;
