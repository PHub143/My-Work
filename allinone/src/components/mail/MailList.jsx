import React from 'react';
import { Link } from 'react-router-dom';
import {
  cleanSnippet,
  displaySubject,
  formatListDate,
  participantsLabel,
  senderLabel,
} from '../../utils/mail';
import { AlertIcon, InboxIcon, PaperclipIcon, StarIcon } from './MailIcons';
import './MailList.css';

const Skeleton = () => (
  <ul className="maillist-skeleton" aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => (
      <li key={i} className="maillist-skeleton-row">
        <span />
        <span />
        <span />
      </li>
    ))}
  </ul>
);

const ErrorState = ({ info, onRetry }) => (
  <div className={`maillist-state is-error is-${info.kind}`} role="alert">
    <AlertIcon size={26} />
    <h2>{info.title}</h2>
    {info.kind !== 'not_connected' && info.message && <p>{info.message}</p>}
    {info.kind === 'not_connected' && (
      <p>Add your Google OAuth client, then connect an account to see your mail here.</p>
    )}
    <div className="maillist-state-actions">
      {(info.kind === 'not_connected' || info.kind === 'reauth') && (
        <Link className="maillist-cta" to="/settings" state={{ tab: 'Mail' }}>
          {info.kind === 'reauth' ? 'Reconnect in Settings → Mail' : 'Open Settings → Mail'}
        </Link>
      )}
      {info.retryable && onRetry && (
        <button type="button" className="maillist-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  </div>
);

/**
 * The thread list. Four states: loading (skeleton), error (message + retry /
 * Settings CTA), empty (hint), ready (rows). Rows are a plain `role="list"`
 * with native checkbox + buttons, not a listbox.
 */
const MailList = ({
  status,
  errorInfo,
  onRetry,
  threads,
  selectedIds,
  openId,
  cursorId,
  onToggleSelect,
  onOpen,
  onToggleStar,
  emptyTitle,
  emptyHint,
  isDrafts,
  listRef,
}) => {
  if (status === 'loading') return <Skeleton />;
  if (status === 'error' && errorInfo) return <ErrorState info={errorInfo} onRetry={onRetry} />;

  if (!threads || threads.length === 0) {
    return (
      <div className="maillist-state is-empty">
        <InboxIcon size={30} />
        <h2>{emptyTitle}</h2>
        {emptyHint && <p>{emptyHint}</p>}
      </div>
    );
  }

  const now = new Date();

  return (
    <ul className="maillist" role="list" ref={listRef} aria-label="Conversations">
      {threads.map((thread) => {
        const label = isDrafts
          ? `Draft${thread.participants?.length ? ` to ${participantsLabel(thread)}` : ''}`
          : participantsLabel(thread) || senderLabel(thread.from) || '(unknown sender)';
        const subject = displaySubject(thread.subject);
        const selected = selectedIds.has(thread.id);
        const classes = [
          'maillist-row',
          thread.unread ? 'is-unread' : '',
          selected ? 'is-selected' : '',
          openId === thread.id ? 'is-open' : '',
          cursorId === thread.id ? 'is-cursor' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const when = formatListDate(thread.date, now);

        return (
          <li key={thread.id} className={classes} data-thread-id={thread.id}>
            <input
              type="checkbox"
              className="maillist-check"
              checked={selected}
              onChange={() => onToggleSelect(thread.id)}
              aria-label={`Select conversation: ${subject}`}
            />
            {!isDrafts && (
              <button
                type="button"
                className={`maillist-star${thread.starred ? ' is-on' : ''}`}
                aria-pressed={!!thread.starred}
                aria-label={thread.starred ? `Remove star: ${subject}` : `Star: ${subject}`}
                onClick={() => onToggleStar(thread)}
              >
                <StarIcon filled={!!thread.starred} size={18} />
              </button>
            )}
            <button
              type="button"
              className="maillist-main"
              aria-current={openId === thread.id ? 'true' : undefined}
              onClick={() => onOpen(thread)}
            >
              <span className="maillist-from">
                {thread.unread && <span className="maillist-sr">Unread. </span>}
                <span className="maillist-from-text">{label}</span>
                {thread.messageCount > 1 && (
                  <span className="maillist-count" aria-label={`${thread.messageCount} messages`}>
                    {thread.messageCount}
                  </span>
                )}
              </span>
              <span className="maillist-text">
                <span className="maillist-subject">{subject}</span>
                {thread.snippet ? (
                  <span className="maillist-snippet"> — {cleanSnippet(thread.snippet)}</span>
                ) : null}
              </span>
              <span className="maillist-meta">
                {thread.hasAttachments && (
                  <span className="maillist-clip" role="img" aria-label="Has attachment">
                    <PaperclipIcon size={15} />
                  </span>
                )}
                {when && <time dateTime={thread.date}>{when}</time>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default MailList;
