import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  MAIL_AUTOSAVE_DELAY_MS,
  MAIL_BODY_LIMIT_BYTES,
  bodyUsage,
  describeMailError,
  formatAddressList,
  formatBytes,
  parseAddressList,
  toComposePayload,
  validateCompose,
} from '../../utils/mail';
import { CloseIcon, SendIcon } from './MailIcons';
import './ComposeDialog.css';

const buildPayload = (values, meta) =>
  toComposePayload({
    to: parseAddressList(values.to),
    cc: parseAddressList(values.cc),
    bcc: parseAddressList(values.bcc),
    subject: values.subject,
    bodyText: values.bodyText,
    threadId: meta.threadId,
    replyToMessageId: meta.replyToMessageId,
  });

const isBlank = (payload) =>
  payload.to.length === 0 &&
  !payload.cc &&
  !payload.bcc &&
  !payload.subject.trim() &&
  !payload.bodyText.trim();

/**
 * Compose / reply / forward / edit-draft dialog.
 *
 * Native <dialog>.showModal() gives the focus trap, inert background, Esc and
 * focus restoration. Mount it only while open: `{compose && <ComposeDialog .../>}`.
 *
 * `initial`: { to, cc, bcc (Address[]), subject, bodyText, threadId,
 *              replyToMessageId, draftId, heading }
 * `onClose({ sent?, discarded?, saved? })` is called exactly once on exit.
 */
const ComposeDialog = ({ accountId, api, initial, onClose }) => {
  const dialogRef = useRef(null);
  const toRef = useRef(null);
  const bodyRef = useRef(null);
  const titleId = useId();
  const hintId = useId();
  const counterId = useId();

  const [values, setValues] = useState(() => ({
    to: formatAddressList(initial.to),
    cc: formatAddressList(initial.cc),
    bcc: formatAddressList(initial.bcc),
    subject: initial.subject || '',
    bodyText: initial.bodyText || '',
  }));
  const [showCc, setShowCc] = useState(() => (initial.cc?.length || 0) + (initial.bcc?.length || 0) > 0);
  const [draftId, setDraftId] = useState(initial.draftId || null);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error | invalid
  const [busy, setBusy] = useState(false); // sending / discarding
  const [errors, setErrors] = useState([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const meta = useRef({
    threadId: initial.threadId,
    replyToMessageId: initial.replyToMessageId,
  });
  const valuesRef = useRef(values);
  const draftIdRef = useRef(initial.draftId || null);
  const lastSavedRef = useRef(null);
  const timerRef = useRef(null);
  const inflightRef = useRef(null);
  const closedRef = useRef(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    valuesRef.current = values;
  });

  // Snapshot of the opening state: an untouched reply/forward must not create a draft.
  useEffect(() => {
    lastSavedRef.current = JSON.stringify(buildPayload(valuesRef.current, meta.current));
  }, []);

  /* open as modal + initial focus */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    if (!valuesRef.current.to.trim()) toRef.current?.focus();
    else {
      const body = bodyRef.current;
      if (body) {
        body.focus();
        body.setSelectionRange(0, 0);
      }
    }
    return () => {
      window.clearTimeout(timerRef.current);
      if (dialog?.open) dialog.close();
    };
  }, []);

  const finish = useCallback(
    (result) => {
      if (closedRef.current) return;
      closedRef.current = true;
      window.clearTimeout(timerRef.current);
      onClose(result);
    },
    [onClose],
  );

  /**
   * Persist the current content as a draft (create, then update). Calls are
   * serialised; unchanged content and blank new drafts are skipped.
   * Resolves to the draft id (or null when nothing was saved).
   */
  const persist = useCallback(async () => {
    window.clearTimeout(timerRef.current);
    while (inflightRef.current) {
      try {
        await inflightRef.current;
      } catch {
        /* the failing call already reported itself */
      }
    }
    const payload = buildPayload(valuesRef.current, meta.current);
    const key = JSON.stringify(payload);
    if (key === lastSavedRef.current) return draftIdRef.current;
    if (isBlank(payload) && !draftIdRef.current) return null;
    if (!validateCompose(payload, { forSend: false }).ok) {
      setStatus('invalid');
      return draftIdRef.current;
    }

    setStatus('saving');
    const run = (async () => {
      const result = draftIdRef.current
        ? await api.updateDraft(accountId, draftIdRef.current, payload)
        : await api.createDraft(accountId, payload);
      const id = result?.draft?.draftId || draftIdRef.current;
      draftIdRef.current = id;
      setDraftId(id);
      lastSavedRef.current = key;
      setStatus('saved');
      return id;
    })();
    inflightRef.current = run;
    try {
      return await run;
    } catch (error) {
      setStatus('error');
      throw error;
    } finally {
      inflightRef.current = null;
    }
  }, [accountId, api]);

  /* autosave ~3 s after typing stops */
  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      persist().catch(() => {});
    }, MAIL_AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timerRef.current);
  }, [values, persist]);

  const setField = (name) => (e) => {
    const value = e.target.value;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors([]);
    if (status === 'saved' || status === 'invalid') setStatus('idle');
  };

  const payload = buildPayload(values, meta.current);
  const usage = bodyUsage(payload);

  const handleSend = async () => {
    const check = validateCompose(payload);
    if (!check.ok) {
      setErrors(check.errors);
      if (payload.to.length === 0) toRef.current?.focus();
      return;
    }
    // `busy` is React state and only disables the button after a re-render, so
    // a fast double-click could run sendDraft twice. This ref closes that gap.
    if (sendingRef.current) return;
    sendingRef.current = true;
    setBusy(true);
    setErrors([]);
    try {
      const id = await persist();
      if (id) await api.sendDraft(accountId, id);
      else await api.send(accountId, payload);
      finish({ sent: true });
    } catch (error) {
      setErrors([describeMailError(error).message]);
      setBusy(false);
      sendingRef.current = false;
    }
  };

  const handleDiscard = async () => {
    setBusy(true);
    setErrors([]);
    window.clearTimeout(timerRef.current);
    try {
      while (inflightRef.current) {
        try {
          await inflightRef.current;
        } catch {
          /* ignore */
        }
      }
      if (draftIdRef.current) await api.deleteDraft(accountId, draftIdRef.current);
      finish({ discarded: true });
    } catch (error) {
      setErrors([describeMailError(error).message]);
      setBusy(false);
      setConfirmDiscard(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await persist();
      finish({ saved: !!id });
    } catch (error) {
      setErrors([`Could not save the draft: ${describeMailError(error).message}`]);
      setBusy(false);
    }
  };

  const hasContent = !isBlank(payload) || !!draftId;
  const statusText = {
    idle: '',
    saving: 'Saving draft…',
    saved: 'Draft saved',
    error: 'Could not save draft',
    invalid: 'Fix the highlighted recipients to save',
  }[status];

  return (
    <dialog
      ref={dialogRef}
      className="mailcomp"
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: save what's there and close, never silently lose work.
        e.preventDefault();
        handleSaveAndClose();
      }}
    >
      <form
        className="mailcomp-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <header className="mailcomp-head">
          <h2 id={titleId}>{initial.heading || 'New message'}</h2>
          <button
            type="button"
            className="mailcomp-x"
            aria-label="Save draft and close"
            title="Save draft and close"
            onClick={handleSaveAndClose}
            disabled={busy}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="mailcomp-fields">
          <div className="mailcomp-field">
            <label htmlFor={`${titleId}-to`}>To</label>
            <input
              id={`${titleId}-to`}
              ref={toRef}
              type="text"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              value={values.to}
              onChange={setField('to')}
              aria-describedby={hintId}
              placeholder="name@example.com, another@example.com"
            />
            {!showCc && (
              <button type="button" className="mailcomp-cc-toggle" onClick={() => setShowCc(true)}>
                Cc / Bcc
              </button>
            )}
          </div>
          {showCc && (
            <>
              <div className="mailcomp-field">
                <label htmlFor={`${titleId}-cc`}>Cc</label>
                <input
                  id={`${titleId}-cc`}
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  value={values.cc}
                  onChange={setField('cc')}
                  aria-describedby={hintId}
                />
              </div>
              <div className="mailcomp-field">
                <label htmlFor={`${titleId}-bcc`}>Bcc</label>
                <input
                  id={`${titleId}-bcc`}
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  value={values.bcc}
                  onChange={setField('bcc')}
                  aria-describedby={hintId}
                />
              </div>
            </>
          )}
          <p id={hintId} className="mailcomp-hint">
            Separate addresses with commas.
          </p>
          <div className="mailcomp-field">
            <label htmlFor={`${titleId}-subject`}>Subject</label>
            <input
              id={`${titleId}-subject`}
              type="text"
              autoComplete="off"
              value={values.subject}
              onChange={setField('subject')}
            />
          </div>
        </div>

        <textarea
          ref={bodyRef}
          className="mailcomp-body"
          aria-label="Message body (plain text)"
          aria-describedby={counterId}
          value={values.bodyText}
          onChange={setField('bodyText')}
          spellCheck
        />

        {errors.length > 0 && (
          <ul className="mailcomp-errors" role="alert">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <footer className="mailcomp-foot">
          <button type="submit" className="mailcomp-send" disabled={busy || usage.over}>
            <SendIcon size={16} /> {busy ? 'Working…' : 'Send'}
          </button>

          {confirmDiscard ? (
            <span className="mailcomp-confirm" role="group" aria-label="Confirm discard">
              <span>{draftId ? 'Delete this draft?' : 'Discard this message?'}</span>
              <button type="button" className="mailcomp-discard-yes" onClick={handleDiscard} disabled={busy}>
                Discard
              </button>
              <button type="button" onClick={() => setConfirmDiscard(false)} disabled={busy}>
                Keep editing
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => (hasContent ? setConfirmDiscard(true) : handleDiscard())}
              disabled={busy}
            >
              Discard
            </button>
          )}

          <span className="mailcomp-status" role="status" aria-live="polite">
            {statusText}
          </span>

          <span
            id={counterId}
            className={`mailcomp-counter${usage.over ? ' is-over' : usage.ratio > 0.85 ? ' is-near' : ''}`}
            aria-live={usage.over ? 'assertive' : 'off'}
          >
            {usage.over
              ? `Too large: ${formatBytes(usage.bytes)} of ${formatBytes(MAIL_BODY_LIMIT_BYTES)} max. Shorten the message.`
              : `${formatBytes(usage.bytes)} / ${formatBytes(MAIL_BODY_LIMIT_BYTES)}`}
          </span>
        </footer>
      </form>
    </dialog>
  );
};

export default ComposeDialog;
