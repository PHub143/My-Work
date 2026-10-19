import React, { useEffect, useId, useRef } from 'react';
import './ConfirmDialog.css';

/**
 * Small modal confirm built on native <dialog>.showModal() (focus trap, Esc,
 * inert background, focus restored to the opener on close). Mount it only while
 * it is needed: `{pending && <ConfirmDialog ... />}`.
 */
const ConfirmDialog = ({
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="mailconfirm"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel?.();
      }}
    >
      <h2 id={titleId} className="mailconfirm-title">
        {title}
      </h2>
      <div className="mailconfirm-body">{children}</div>
      <div className="mailconfirm-actions">
        <button type="button" className="mailconfirm-cancel" onClick={onCancel} disabled={busy} autoFocus>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`mailconfirm-ok${danger ? ' is-danger' : ''}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
