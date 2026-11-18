import React from 'react';
import { Link } from 'react-router-dom';
import ToeicCollectionSwitch from './ToeicCollectionSwitch';
import './ToeicHub.css';

// The TOEIC collection hub (volume tabs + one card per test), shared by
// pages/English.jsx (YBM) and pages/Hacker.jsx. Each page keeps its own data
// and passes in the resolved volume and per-test statuses.

const Check = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </svg>
);

function StatusTag({ status }) {
  if (status.kind === 'done') {
    return (
      <span className="as-tag toeic-tag toeic-tag--done">
        <Check />
        Completed
      </span>
    );
  }
  if (status.kind === 'in-progress') {
    return <span className="as-tag toeic-tag">In progress</span>;
  }
  if (status.kind === 'unavailable') {
    return <span className="as-tag toeic-tag toeic-tag--dashed">Not available</span>;
  }
  return <span className="as-tag toeic-tag toeic-tag--outline">Not started</span>;
}

function MissingNote({ readiness }) {
  const missing = [];
  if (!readiness.hasListeningBooklet) missing.push('listening booklet');
  if (!readiness.hasListening) missing.push('listening key');
  if (!readiness.hasReadingBooklet) missing.push('reading booklet');
  if (!readiness.hasReading) missing.push('reading key');

  if (!missing.length) return null;
  return <span className="as-small toeic-card-note">Missing: {missing.join(', ')}</span>;
}

function TestCard({ test, status, href }) {
  const unavailable = status.kind === 'unavailable';
  const total = status.kind === 'done' ? status.score?.totalScaled : null;

  const content = (
    <>
      <span className="toeic-card-title">{test.label}</span>
      <StatusTag status={status} />
      {total ? <span className="as-title toeic-card-score">{`${total} / 990`}</span> : null}
      <span className="as-small toeic-card-meta">
        {status.readiness.hasListening ? 'LC 100' : 'LC —'}
        {' · '}
        {status.readiness.hasReading ? 'RC 100' : 'RC —'}
      </span>
      <MissingNote readiness={status.readiness} />
    </>
  );

  if (unavailable) {
    return <div className="toeic-card is-unavailable">{content}</div>;
  }
  return (
    <Link to={href} className="toeic-card">
      {content}
    </Link>
  );
}

/**
 * @param {string} collection   'ybm' | 'hacker' (which collection tab is active)
 * @param {string} basePath     e.g. '/learning/english/toeic/ybm'
 * @param {string} volumesLabel accessible name for the volume tabs
 * @param {Array}  volumes      every volume of the collection ({ id, label })
 * @param {Object} volume       the selected volume ({ id, title, tests })
 * @param {Array}  tests        [{ test, status }] for the selected volume
 * @param {Set}    disabledVolumeIds volumes that cannot be opened
 */
const ToeicHub = ({ collection, basePath, volumesLabel, volumes, volume, tests, disabledVolumeIds }) => {
  const readyCount = tests.filter(({ status }) => status.kind !== 'unavailable').length;

  return (
    <div className="toeic-hub">
      <ToeicCollectionSwitch active={collection} />

      <nav className="toeic-volumes" aria-label={volumesLabel}>
        {volumes.map((entry) => {
          if (disabledVolumeIds?.has(entry.id)) {
            return (
              <span key={entry.id} className="toeic-volume is-disabled" aria-disabled="true">
                {entry.label}
              </span>
            );
          }
          return (
            <Link
              key={entry.id}
              to={`${basePath}/${entry.id}`}
              className="toeic-volume"
              aria-current={entry.id === volume.id ? 'page' : undefined}
            >
              {entry.label}
            </Link>
          );
        })}
      </nav>

      <header className="toeic-head">
        <div className="toeic-head-copy">
          <h1 className="as-headline">{volume.title}</h1>
          <p>
            10 full tests · 200 questions each · Listening and Reading in one
            120-minute sitting.
          </p>
        </div>
        <div className="toeic-ready">
          <span className="as-score toeic-ready-count">{readyCount}</span>
          <span className="as-small">of {volume.tests.length} ready</span>
        </div>
      </header>

      <ul className="toeic-grid">
        {tests.map(({ test, status }) => (
          <li key={test.id}>
            <TestCard test={test} status={status} href={`${basePath}/${volume.id}/test/${test.number}`} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ToeicHub;
