import React from 'react';
import { useNavigate } from 'react-router-dom';

// Segmented-pill switcher between the TOEIC book collections (YBM, Hacker,
// and any future ones). Shared by pages/English.jsx and pages/Hacker.jsx,
// which both import pages/English.css for the `ybm-crumb*` classnames this
// renders into — the styling is generic "TOEIC test" chrome, not YBM-specific.
const COLLECTIONS = [
  { id: 'ybm', label: 'YBM', path: '/learning/english/toeic/ybm/vol-2' },
  { id: 'hacker', label: 'Hacker', path: '/learning/english/toeic/hacker/vol-2' },
];

const ToeicCollectionSwitch = ({ active }) => {
  const navigate = useNavigate();

  return (
    <nav className="ybm-crumbs" aria-label="English study path">
      <span className="ybm-crumb-kicker">
        <span className="ybm-crumb-mark" aria-hidden="true">T</span>
        TOEIC
      </span>
      <div className="ybm-crumb-pills" role="tablist">
        {COLLECTIONS.map((collection) => {
          const isActive = collection.id === active;
          return (
            <button
              key={collection.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ybm-crumb-pill${isActive ? ' is-active' : ''}`}
              disabled={isActive}
              onClick={() => navigate(collection.path)}
            >
              {collection.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ToeicCollectionSwitch;
