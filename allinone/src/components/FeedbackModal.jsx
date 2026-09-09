import React, { useCallback, useEffect, useRef, useState } from 'react';
import './FeedbackModal.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import {
  FEEDBACK_CATEGORIES,
  MAX_FEEDBACK_ATTACHMENTS,
  MAX_FEEDBACK_MESSAGE_LENGTH,
  MAX_FEEDBACK_ATTACHMENT_BYTES,
} from '../utils/feedback';

const TITLE_ID = 'feedback-modal-title';

const createInitialState = () => ({
  category: null,
  message: '',
  attachments: [], // { file, previewUrl }
  phase: 'form', // form | submitting | done
  error: null,
});

const FeedbackModal = ({ open, onClose }) => {
  const { token } = useAuth();
  const [state, setState] = useState(createInitialState);
  const fileInputRef = useRef(null);
  const attachmentsRef = useRef(state.attachments);

  attachmentsRef.current = state.attachments;

  const resetAndClose = useCallback(() => {
    attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setState(createInitialState());
    onClose();
  }, [onClose]);

  // Close on Escape unless a submission is in flight.
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && state.phase !== 'submitting') {
        resetAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, state.phase, resetAndClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => () => {
    attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  if (!open) return null;

  const { category, message, attachments, phase, error } = state;
  const remaining = MAX_FEEDBACK_MESSAGE_LENGTH - message.length;
  const canSubmit =
    phase === 'form' && category !== null && message.trim().length > 0 && remaining >= 0;

  const handleFilesSelected = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (picked.length === 0) return;

    setState((current) => {
      const slotsLeft = MAX_FEEDBACK_ATTACHMENTS - current.attachments.length;
      if (slotsLeft <= 0) {
        return { ...current, error: `You can attach up to ${MAX_FEEDBACK_ATTACHMENTS} images.` };
      }

      const accepted = [];
      let rejection = null;

      for (const file of picked.slice(0, slotsLeft)) {
        if (!file.type.startsWith('image/')) {
          rejection = 'Only image files can be attached.';
          continue;
        }
        if (file.size > MAX_FEEDBACK_ATTACHMENT_BYTES) {
          rejection = 'Each image must be 5 MB or smaller.';
          continue;
        }
        accepted.push({ file, previewUrl: URL.createObjectURL(file) });
      }

      return {
        ...current,
        error: rejection,
        attachments: [...current.attachments, ...accepted],
      };
    });
  };

  const removeAttachment = (index) => {
    setState((current) => {
      const next = [...current.attachments];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return { ...current, attachments: next };
    });
  };

  const uploadAttachment = async (file) => {
    const body = new FormData();
    body.append('file', file, file.name);

    const response = await fetch(`${API_URL}/feedback/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Could not upload an image.');
    }
    return data.attachment;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setState((current) => ({ ...current, phase: 'submitting', error: null }));

    try {
      const uploaded = [];
      for (const item of attachmentsRef.current) {
        // Sequential: attachments are small and this keeps error handling simple.
        uploaded.push(await uploadAttachment(item.file));
      }

      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          category,
          pageUrl: window.location.hash || window.location.pathname,
          attachments: uploaded,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Could not send your feedback.');
      }

      setState((current) => ({ ...current, phase: 'done' }));
      window.setTimeout(resetAndClose, 1800);
    } catch (submitError) {
      setState((current) => ({ ...current, phase: 'form', error: submitError.message }));
    }
  };

  return (
    <div
      className="fb-overlay"
      onClick={() => phase !== 'submitting' && resetAndClose()}
    >
      <div
        className="fb-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'done' ? (
          <div className="fb-done">
            <div className="fb-done-mark" aria-hidden="true">✓</div>
            <h2 id={TITLE_ID}>Thanks for the feedback</h2>
            <p>We read every note and use it to improve the app.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="fb-header">
              <h2 id={TITLE_ID}>Send feedback</h2>
              <button
                type="button"
                className="fb-close"
                onClick={resetAndClose}
                aria-label="Close feedback dialog"
                disabled={phase === 'submitting'}
              >
                &times;
              </button>
            </div>

            <div className="fb-body">
              <div className="fb-field">
                <span className="fb-label">What kind of feedback?</span>
                <div className="fb-pills" role="group" aria-label="Feedback category">
                  {FEEDBACK_CATEGORIES.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`fb-pill${category === option.id ? ' is-selected' : ''}`}
                      aria-pressed={category === option.id}
                      title={option.hint}
                      onClick={() =>
                        setState((current) => ({ ...current, category: option.id }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fb-field">
                <label className="fb-label" htmlFor="feedback-message">
                  Your message
                </label>
                <textarea
                  id="feedback-message"
                  className="fb-textarea"
                  rows={5}
                  maxLength={MAX_FEEDBACK_MESSAGE_LENGTH}
                  placeholder="Tell us what happened, what you expected, or what could be better…"
                  value={message}
                  onChange={(e) =>
                    setState((current) => ({ ...current, message: e.target.value }))
                  }
                />
                <span className={`fb-counter${remaining < 0 ? ' is-over' : ''}`}>
                  {remaining.toLocaleString()} characters left
                </span>
              </div>

              <div className="fb-field">
                <span className="fb-label">
                  Screenshots <span className="fb-optional">(optional, up to {MAX_FEEDBACK_ATTACHMENTS})</span>
                </span>
                {attachments.length > 0 && (
                  <div className="fb-thumbs">
                    {attachments.map((item, index) => (
                      <div className="fb-thumb" key={item.previewUrl}>
                        <img src={item.previewUrl} alt={`Attachment ${index + 1}`} />
                        <button
                          type="button"
                          className="fb-thumb-remove"
                          onClick={() => removeAttachment(index)}
                          aria-label={`Remove attachment ${index + 1}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {attachments.length < MAX_FEEDBACK_ATTACHMENTS && (
                  <>
                    <button
                      type="button"
                      className="fb-attach-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      + Add image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handleFilesSelected}
                    />
                  </>
                )}
              </div>

              {error && <p className="fb-error">{error}</p>}
            </div>

            <div className="fb-footer">
              <button
                type="button"
                className="fb-btn fb-btn-ghost"
                onClick={resetAndClose}
                disabled={phase === 'submitting'}
              >
                Cancel
              </button>
              <button type="submit" className="fb-btn fb-btn-primary" disabled={!canSubmit}>
                {phase === 'submitting' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
