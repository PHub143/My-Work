import React, { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import './English.css';
import LearningTabs from '../components/LearningTabs';
import { useAuth } from '../AuthContext';
import { YBM_VOLUMES, getVolume } from '../data/ybm/manifest.js';
import { getTestReadiness, loadAttempt } from '../utils/ybm.js';

const DEFAULT_VOLUME = 'vol-2';
const DISABLED_VOLUME_IDS = new Set(['vol-1']);

function getTestStatus(userId, test) {
  const readiness = getTestReadiness(test);
  if (!readiness.isPlayable) {
    return { kind: 'unavailable', readiness };
  }

  const attempt = loadAttempt(userId, test.id);
  if (attempt?.submittedAt) {
    return { kind: 'done', readiness, score: attempt.score || null };
  }
  if (attempt) {
    return { kind: 'in-progress', readiness };
  }
  return { kind: 'new', readiness };
}

function StatusBadge({ status }) {
  if (status.kind === 'done') {
    const total = status.score?.totalScaled;
    return <span className="ybm-badge ybm-badge--done">{total ? `${total} / 990` : 'Completed'}</span>;
  }
  if (status.kind === 'in-progress') {
    return <span className="ybm-badge ybm-badge--active">In progress</span>;
  }
  if (status.kind === 'unavailable') {
    return <span className="ybm-badge ybm-badge--muted">Not available</span>;
  }
  return <span className="ybm-badge">Not started</span>;
}

function MissingNote({ readiness }) {
  const missing = [];
  if (!readiness.hasListeningBooklet) missing.push('listening booklet');
  if (!readiness.hasListening) missing.push('listening key');
  if (!readiness.hasReadingBooklet) missing.push('reading booklet');
  if (!readiness.hasReading) missing.push('reading key');

  if (!missing.length) return null;
  return <p className="ybm-card-note">Missing: {missing.join(', ')}</p>;
}

const English = () => {
  const navigate = useNavigate();
  const { volumeId } = useParams();
  const { user } = useAuth();

  const volume = getVolume(volumeId);
  const tests = useMemo(
    () => (volume ? volume.tests.map((test) => ({ test, status: getTestStatus(user?.id, test) })) : []),
    [user?.id, volume],
  );

  if (!volumeId) {
    return <Navigate to={`/learning/english/toeic/ybm/${DEFAULT_VOLUME}`} replace />;
  }
  if (!volume || DISABLED_VOLUME_IDS.has(volume.id)) {
    return <Navigate to={`/learning/english/toeic/ybm/${DEFAULT_VOLUME}`} replace />;
  }

  const readyCount = tests.filter(({ status }) => status.kind !== 'unavailable').length;

  return (
    <div className="ybm-page">
      <LearningTabs />

      <nav className="ybm-crumbs" aria-label="English study path">
        <span className="ybm-crumb is-active">TOEIC</span>
        <span className="ybm-crumb-sep" aria-hidden="true">/</span>
        <span className="ybm-crumb is-active">YBM</span>
      </nav>

      <nav className="ybm-volumes" aria-label="YBM volumes">
        {YBM_VOLUMES.map((entry) => {
          const isDisabled = DISABLED_VOLUME_IDS.has(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              className={`ybm-volume-tab${entry.id === volume.id ? ' is-active' : ''}${isDisabled ? ' is-disabled' : ''}`}
              aria-current={entry.id === volume.id ? 'page' : undefined}
              disabled={isDisabled}
              onClick={() => navigate(`/learning/english/toeic/ybm/${entry.id}`)}
            >
              {entry.label}
            </button>
          );
        })}
      </nav>

      <header className="ybm-header">
        <div>
          <h1>{volume.title}</h1>
          <p>
            10 full tests · 200 questions each · Listening and Reading in one
            120-minute sitting.
          </p>
        </div>
        <div className="ybm-header-stat">
          <strong>{readyCount}</strong>
          <span>of {volume.tests.length} ready</span>
        </div>
      </header>

      <ul className="ybm-test-grid">
        {tests.map(({ test, status }) => {
          const disabled = status.kind === 'unavailable';

          return (
            <li key={test.id}>
              <button
                type="button"
                className={`ybm-test-card${disabled ? ' is-disabled' : ''}`}
                disabled={disabled}
                onClick={() => navigate(
                  `/learning/english/toeic/ybm/${volume.id}/test/${test.number}`,
                )}
              >
                <span className="ybm-card-top">
                  <strong>{test.label}</strong>
                  <StatusBadge status={status} />
                </span>
                <span className="ybm-card-meta">
                  {status.readiness.hasListening ? 'LC 100' : 'LC —'}
                  {' · '}
                  {status.readiness.hasReading ? 'RC 100' : 'RC —'}
                </span>
                <MissingNote readiness={status.readiness} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default English;
