import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Feedback.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  categoryLabel,
  filterFeedback,
  countByStatus,
} from '../utils/feedback';

const formatWhen = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Renders a feedback attachment by fetching it through the admin-only proxy
 * with the bearer token, then handing an object URL to <img>. A plain
 * `<img src>` can't carry the Authorization header the proxy requires.
 */
const AuthedImage = ({ feedbackId, attachment, token }) => {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    fetch(`${API_URL}/feedback/${feedbackId}/attachments/${attachment.driveFileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('load failed');
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [feedbackId, attachment.driveFileId, token]);

  if (failed) return <div className="fbadmin-thumb is-missing">Image unavailable</div>;
  if (!src) return <div className="fbadmin-thumb is-loading" />;

  return (
    <a className="fbadmin-thumb" href={src} target="_blank" rel="noreferrer">
      <img src={src} alt={attachment.name || 'Attachment'} />
    </a>
  );
};

const Feedback = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const noteTimers = useRef({});

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load feedback.');
      const data = await response.json();
      setItems(Array.isArray(data.feedback) ? data.feedback : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    const timers = noteTimers.current;
    return () => Object.values(timers).forEach((t) => window.clearTimeout(t));
  }, []);

  const patchFeedback = useCallback(
    async (id, body) => {
      setSavingId(id);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/feedback/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Update failed.');
        setItems((current) => current.map((item) => (item.id === id ? data.feedback : item)));
      } catch (err) {
        setError(err.message);
      } finally {
        setSavingId(null);
      }
    },
    [token],
  );

  const handleStatusChange = (id, status) => patchFeedback(id, { status });

  const handleNoteChange = (id, adminNote) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, adminNote } : item)),
    );
    window.clearTimeout(noteTimers.current[id]);
    noteTimers.current[id] = window.setTimeout(() => {
      patchFeedback(id, { adminNote: adminNote.trim() ? adminNote : null });
    }, 700);
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Delete failed.');
      setItems((current) => current.filter((item) => item.id !== id));
      setDeletingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const counts = useMemo(() => countByStatus(items), [items]);
  const visible = useMemo(
    () => filterFeedback(items, { status: statusFilter, category: categoryFilter }),
    [items, statusFilter, categoryFilter],
  );

  return (
    <div className="fbadmin-page">
      <div className="fbadmin-content">
        <header className="fbadmin-header">
          <div className="fbadmin-kicker">
            <span className="fbadmin-badge">
              {counts.total} SUBMISSION{counts.total === 1 ? '' : 'S'}
            </span>
            <span className="fbadmin-meta">
              · {counts.new} new · {counts.in_progress} in progress · {counts.resolved} resolved
            </span>
          </div>
          <h1>What users are <em>telling us.</em></h1>
          <p>Review incoming feedback, triage it, and keep notes on what you did.</p>
        </header>

        <div className="fbadmin-filters">
          <div className="fbadmin-filter-group" role="group" aria-label="Filter by status">
            <button
              type="button"
              className={`fbadmin-chip${statusFilter === '' ? ' is-active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              All statuses
            </button>
            {FEEDBACK_STATUSES.map((status) => (
              <button
                type="button"
                key={status.id}
                className={`fbadmin-chip${statusFilter === status.id ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(status.id)}
              >
                {status.label}
                <span className="fbadmin-chip-count">{counts[status.id]}</span>
              </button>
            ))}
          </div>
          <div className="fbadmin-filter-group" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`fbadmin-chip${categoryFilter === '' ? ' is-active' : ''}`}
              onClick={() => setCategoryFilter('')}
            >
              All types
            </button>
            {FEEDBACK_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`fbadmin-chip${categoryFilter === category.id ? ' is-active' : ''}`}
                onClick={() => setCategoryFilter(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="fbadmin-error">{error}</div>}

        {isLoading ? (
          <div className="fbadmin-loading">
            <Spinner />
          </div>
        ) : visible.length === 0 ? (
          <div className="fbadmin-empty">
            <p>{items.length === 0 ? 'No feedback yet.' : 'Nothing matches these filters.'}</p>
          </div>
        ) : (
          <ul className="fbadmin-list">
            {visible.map((item) => (
              <li key={item.id} className="fbadmin-card">
                <div className="fbadmin-card-top">
                  <span className={`fbadmin-cat fbadmin-cat-${item.category}`}>
                    {categoryLabel(item.category)}
                  </span>
                  <select
                    className="fbadmin-status-select"
                    value={item.status}
                    disabled={savingId === item.id}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    aria-label="Feedback status"
                  >
                    {FEEDBACK_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="fbadmin-message">{item.message}</p>

                {item.attachments.length > 0 && (
                  <div className="fbadmin-thumbs">
                    {item.attachments.map((attachment) => (
                      <AuthedImage
                        key={attachment.driveFileId}
                        feedbackId={item.id}
                        attachment={attachment}
                        token={token}
                      />
                    ))}
                  </div>
                )}

                <label className="fbadmin-note">
                  <span>Internal note</span>
                  <textarea
                    rows={2}
                    placeholder="What did you do with this? (only admins see this)"
                    value={item.adminNote || ''}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                  />
                </label>

                <div className="fbadmin-card-foot">
                  <div className="fbadmin-submitter">
                    <strong>{item.author?.name || item.author?.email || 'Unknown user'}</strong>
                    {item.author?.email && item.author?.name && (
                      <span> · {item.author.email}</span>
                    )}
                    <span> · {formatWhen(item.createdAt)}</span>
                    {item.pageUrl && <span className="fbadmin-page">on {item.pageUrl}</span>}
                  </div>
                  {deletingId === item.id ? (
                    <div className="fbadmin-confirm">
                      <button type="button" className="fbadmin-confirm-yes" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                      <button type="button" className="fbadmin-confirm-no" onClick={() => setDeletingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="fbadmin-delete"
                      onClick={() => setDeletingId(item.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Feedback;
