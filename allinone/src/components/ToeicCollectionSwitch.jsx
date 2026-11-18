import React from 'react';
import { useNavigate } from 'react-router-dom';

// Switcher between the TOEIC book collections (YBM, Hacker, and any future
// ones). Rendered by components/ToeicHub.jsx, which owns the `toeic-*`
// classnames this uses (components/ToeicHub.css).
const COLLECTIONS = [
  { id: 'ybm', label: 'YBM', path: '/learning/english/toeic/ybm/vol-2' },
  { id: 'hacker', label: 'Hacker', path: '/learning/english/toeic/hacker/vol-2' },
];

const ToeicCollectionSwitch = ({ active }) => {
  const navigate = useNavigate();

  return (
    <nav className="toeic-switchbar" aria-label="English study path">
      <span className="as-label toeic-eyebrow">TOEIC practice</span>
      <div className="toeic-switch" role="tablist">
        {COLLECTIONS.map((collection) => {
          const isActive = collection.id === active;
          return (
            <button
              key={collection.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className="toeic-switch-tab"
              // The collection paths open that collection's default volume, so the
              // active tab must not navigate or it would reset the chosen volume.
              onClick={() => {
                if (!isActive) navigate(collection.path);
              }}
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
