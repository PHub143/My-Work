import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

// Breadcrumb-row switcher between the two TOEIC book collections (YBM,
// Hacker). Shared by pages/English.jsx and pages/Hacker.jsx, which both
// import pages/English.css for the `ybm-crumb*` classnames this renders
// into — the crumb styling is generic "TOEIC test" chrome, not YBM-specific.
const COLLECTIONS = [
  { id: 'ybm', label: 'YBM', path: '/learning/english/toeic/ybm/vol-2' },
  { id: 'hacker', label: 'Hacker', path: '/learning/english/toeic/hacker/vol-2' },
];

const ToeicCollectionSwitch = ({ active }) => {
  const navigate = useNavigate();

  return (
    <nav className="ybm-crumbs" aria-label="English study path">
      <span className="ybm-crumb is-active">TOEIC</span>
      {COLLECTIONS.map((collection) => (
        <Fragment key={collection.id}>
          <span className="ybm-crumb-sep" aria-hidden="true">/</span>
          <button
            type="button"
            className={`ybm-crumb ybm-crumb-link${collection.id === active ? ' is-active' : ''}`}
            aria-current={collection.id === active ? 'page' : undefined}
            disabled={collection.id === active}
            onClick={() => navigate(collection.path)}
          >
            {collection.label}
          </button>
        </Fragment>
      ))}
    </nav>
  );
};

export default ToeicCollectionSwitch;
