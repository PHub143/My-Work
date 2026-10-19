/**
 * Pure helpers for the Inbox page, kept out of the component so they can be
 * unit-tested without a DOM.
 */

/* Gmail system label ids → role, used only until/unless the folder list says otherwise. */
export const ID_ROLE_FALLBACK = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFT: 'drafts',
  DRAFTS: 'drafts',
  TRASH: 'trash',
  SPAM: 'spam',
  STARRED: 'starred',
};

/** Action that reverses an undoable action. */
export const UNDO_INVERSE = { archive: 'moveToInbox', trash: 'untrash' };

/** Does `action` take a row out of the folder view whose role is `role`? */
export const removesFromView = (action, role) => {
  switch (action) {
    case 'archive':
      return role === 'inbox';
    case 'trash':
    case 'deleteForever':
      return true;
    case 'untrash':
      return role === 'trash';
    case 'moveToInbox':
      return role === 'spam';
    case 'unstar':
      return role === 'starred';
    default:
      return false;
  }
};

/** Shape a `{draftId, message}` API draft like a thread-list row. */
export const draftToRow = (draft) => {
  const message = draft.message || {};
  const id = draft.draftId || draft.id || message.id;
  return {
    id,
    draftId: id,
    isDraft: true,
    subject: message.subject || '',
    snippet: message.snippet || '',
    from: message.from || null,
    participants: Array.isArray(message.to) ? message.to : [],
    date: message.date,
    messageCount: 1,
    unread: false,
    starred: false,
    hasAttachments: Array.isArray(message.attachments) && message.attachments.length > 0,
    labelIds: message.labelIds || [],
    message,
  };
};

/**
 * Entries of a bulk-action result that Gmail rejected.
 * @param {{failed?: unknown}} result
 * @returns {string[]}
 */
export const failedIds = (result) =>
  Array.isArray(result?.failed) ? result.failed.filter((id) => typeof id === 'string') : [];

/** "3 of 5 conversations could not be updated." */
export const partialFailureText = (failedCount, total) =>
  `${failedCount} of ${total} conversation${total === 1 ? '' : 's'} could not be updated.`;

/**
 * Only navigate the browser to Google's own consent screen. The URL comes from
 * our API, but a connect button should never be able to send the admin
 * (who is signed in) to an arbitrary origin.
 */
export const isGoogleAuthUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && url.hostname === 'accounts.google.com' && !url.username && !url.password;
  } catch {
    return false;
  }
};
