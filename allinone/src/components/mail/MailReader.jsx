import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  displaySubject,
  formatAddress,
  formatAddressList,
  formatBytes,
  formatFullDate,
  cleanSnippet,
  plainBodyOf,
  senderLabel,
} from '../../utils/mail';
import MailBody from './MailBody';
import {
  AlertIcon,
  ArchiveIcon,
  ChevronLeftIcon,
  CloseIcon,
  DownloadIcon,
  ForwardIcon,
  InboxIcon,
  MailIcon,
  PaperclipIcon,
  ReplyAllIcon,
  ReplyIcon,
  RestoreIcon,
  StarIcon,
  TrashIcon,
} from './MailIcons';
import './MailReader.css';

const Attachment = ({ attachment, onDownload }) => {
  const [state, setState] = useState('idle'); // idle | loading | error
  const run = async () => {
    setState('loading');
    try {
      await onDownload(attachment);
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return (
    <button
      type="button"
      className={`mailread-attachment${state === 'error' ? ' is-error' : ''}`}
      onClick={run}
      disabled={state === 'loading'}
    >
      {state === 'error' ? <AlertIcon size={16} /> : <PaperclipIcon size={16} />}
      <span className="mailread-attachment-name">{attachment.filename || 'attachment'}</span>
      {attachment.size ? <span className="mailread-attachment-size">{formatBytes(attachment.size)}</span> : null}
      <span className="mailread-attachment-state">
        {state === 'loading' ? 'Downloading…' : state === 'error' ? 'Failed. Retry' : <DownloadIcon size={15} />}
        {state === 'idle' && <span className="mailread-sr">Download</span>}
      </span>
    </button>
  );
};

const MessageCard = ({
  message,
  expanded,
  onToggle,
  onReply,
  onDownload,
  canReply,
}) => {
  const fromLabel = senderLabel(message.from) || '(unknown sender)';
  const attachments = (message.attachments || []).filter((a) => !a.inline);
  const bodyId = `msg-body-${message.id}`;

  return (
    <article className={`mailread-msg${expanded ? ' is-open' : ''}${message.unread ? ' is-unread' : ''}`}>
      <h3 className="mailread-msg-head">
        <button
          type="button"
          className="mailread-msg-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <span className="mailread-msg-from">
            {message.unread && <span className="mailread-sr">Unread. </span>}
            {fromLabel}
          </span>
          {!expanded && (
            <span className="mailread-msg-snippet">
              {cleanSnippet(message.snippet || plainBodyOf(message), 120)}
            </span>
          )}
          <time className="mailread-msg-date" dateTime={message.date}>
            {formatFullDate(message.date)}
          </time>
        </button>
      </h3>

      {expanded && (
        <div id={bodyId} className="mailread-msg-body">
          <dl className="mailread-addr">
            <div>
              <dt>From</dt>
              <dd>{formatAddress(message.from)}</dd>
            </div>
            {message.to?.length > 0 && (
              <div>
                <dt>To</dt>
                <dd>{formatAddressList(message.to)}</dd>
              </div>
            )}
            {message.cc?.length > 0 && (
              <div>
                <dt>Cc</dt>
                <dd>{formatAddressList(message.cc)}</dd>
              </div>
            )}
          </dl>

          <MailBody message={message} />

          {attachments.length > 0 && (
            <ul className="mailread-attachments" aria-label="Attachments">
              {attachments.map((attachment) => (
                <li key={attachment.id || attachment.attachmentId || attachment.filename}>
                  <Attachment
                    attachment={attachment}
                    onDownload={(a) => onDownload(message, a)}
                  />
                </li>
              ))}
            </ul>
          )}

          {canReply && (
            <div className="mailread-msg-actions">
              <button type="button" onClick={() => onReply(message, 'reply')}>
                <ReplyIcon size={16} /> Reply
              </button>
              <button type="button" onClick={() => onReply(message, 'replyAll')}>
                <ReplyAllIcon size={16} /> Reply all
              </button>
              <button type="button" onClick={() => onReply(message, 'forward')}>
                <ForwardIcon size={16} /> Forward
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

const ReaderError = ({ info, onRetry }) => (
  <div className="mailread-state is-error" role="alert">
    <AlertIcon size={26} />
    <h2>{info.title}</h2>
    {info.kind !== 'not_connected' && info.message && <p>{info.message}</p>}
    <div className="mailread-state-actions">
      {(info.kind === 'not_connected' || info.kind === 'reauth') && (
        <Link className="mailread-cta" to="/settings" state={{ tab: 'Mail' }}>
          Open Settings → Mail
        </Link>
      )}
      {info.retryable && onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  </div>
);

/**
 * Reading pane. Shows a thread as an accordion (latest message + any unread
 * expanded). Mount with key={thread id} so expansion state resets per thread.
 */
const MailReader = ({
  status, // idle | loading | error | ready
  thread,
  errorInfo,
  onRetry,
  onBack,
  headingRef,
  actions, // from actionsForRole()
  canDeleteForever,
  onAction, // (action) => void   — applies to the open thread
  onReply, // (message, mode)
  onDownloadAttachment, // (message, attachment) => Promise
}) => {
  const [toggled, setToggled] = useState({}); // messageId -> boolean override

  if (status === 'idle') {
    return (
      <div className="mailread-state is-idle">
        <MailIcon size={34} />
        <h2>Select a conversation</h2>
        <p>Pick a message from the list to read it here.</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="mailread-state" role="status" aria-live="polite">
        <div className="mailread-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="mailread-sr">Loading conversation…</span>
      </div>
    );
  }

  if (status === 'error' && errorInfo) {
    return (
      <>
        <div className="mailread-bar">
          <button type="button" className="mailread-back" onClick={onBack}>
            <ChevronLeftIcon /> Back
          </button>
        </div>
        <ReaderError info={errorInfo} onRetry={onRetry} />
      </>
    );
  }

  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  const latest = messages[messages.length - 1];
  const starred = messages.some((m) => m.starred) || thread?.starred;
  const subject = displaySubject(thread?.subject || messages[0]?.subject);

  const isExpanded = (message, index) => {
    if (message.id in toggled) return toggled[message.id];
    return index === messages.length - 1 || !!message.unread;
  };

  return (
    <>
      <div className="mailread-bar">
        <button type="button" className="mailread-back" onClick={onBack}>
          <ChevronLeftIcon /> <span>Back</span>
        </button>

        <div className="mailread-tools" role="group" aria-label="Conversation actions">
          {actions.archive && (
            <button type="button" className="mailread-icon" aria-label="Archive (e)" title="Archive (e)" onClick={() => onAction('archive')}>
              <ArchiveIcon />
            </button>
          )}
          {actions.notSpam && (
            <button type="button" className="mailread-icon" aria-label="Not spam: move to Inbox" title="Not spam: move to Inbox" onClick={() => onAction('moveToInbox')}>
              <InboxIcon />
            </button>
          )}
          {actions.restore && (
            <button type="button" className="mailread-icon" aria-label="Restore from Trash" title="Restore from Trash" onClick={() => onAction('untrash')}>
              <RestoreIcon />
            </button>
          )}
          {actions.trash && (
            <button type="button" className="mailread-icon" aria-label="Move to Trash (#)" title="Move to Trash (#)" onClick={() => onAction('trash')}>
              <TrashIcon />
            </button>
          )}
          {actions.deleteForever && canDeleteForever && (
            <button type="button" className="mailread-icon" aria-label="Delete forever" title="Delete forever" onClick={() => onAction('deleteForever')}>
              <CloseIcon />
            </button>
          )}
          <button type="button" className="mailread-icon" aria-label="Mark as unread (Shift+U)" title="Mark as unread (Shift+U)" onClick={() => onAction('markUnread')}>
            <MailIcon />
          </button>
          <button
            type="button"
            className={`mailread-icon${starred ? ' is-on' : ''}`}
            aria-label={starred ? 'Remove star (s)' : 'Star (s)'}
            aria-pressed={!!starred}
            title={starred ? 'Remove star (s)' : 'Star (s)'}
            onClick={() => onAction(starred ? 'unstar' : 'star')}
          >
            <StarIcon filled={!!starred} />
          </button>
        </div>
      </div>

      <div className="mailread-scroll">
        <h2 className="mailread-subject" tabIndex={-1} ref={headingRef}>
          {subject}
        </h2>

        <div className="mailread-quick">
          <button type="button" disabled={!latest} onClick={() => latest && onReply(latest, 'reply')}>
            <ReplyIcon size={16} /> Reply (r)
          </button>
          <button type="button" disabled={!latest} onClick={() => latest && onReply(latest, 'replyAll')}>
            <ReplyAllIcon size={16} /> Reply all (a)
          </button>
          <button type="button" disabled={!latest} onClick={() => latest && onReply(latest, 'forward')}>
            <ForwardIcon size={16} /> Forward (f)
          </button>
        </div>

        {messages.length === 0 ? (
          <p className="mailread-empty">This conversation has no messages.</p>
        ) : (
          <div className="mailread-thread">
            {messages.map((message, index) => (
              <MessageCard
                key={message.id}
                message={message}
                expanded={isExpanded(message, index)}
                canReply
                onToggle={() =>
                  setToggled((current) => ({
                    ...current,
                    [message.id]: !isExpanded(message, index),
                  }))
                }
                onReply={onReply}
                onDownload={onDownloadAttachment}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MailReader;
