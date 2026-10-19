import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Inbox.css';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';
import MailSidebar from '../components/mail/MailSidebar';
import MailToolbar from '../components/mail/MailToolbar';
import MailList from '../components/mail/MailList';
import MailReader from '../components/mail/MailReader';
import ComposeDialog from '../components/mail/ComposeDialog';
import ConfirmDialog from '../components/mail/ConfirmDialog';
import { AlertIcon, CloseIcon, MailIcon } from '../components/mail/MailIcons';
import { createMailApi, isAbortError } from '../utils/mailApi';
import {
  MAIL_PAGE_SIZE,
  actionsForRole,
  buildReplyDraft,
  describeMailError,
  findFolder,
  findFolderByRole,
  folderRole,
  pagerLabel,
  patchInboxParams,
  readInboxParams,
  shouldIgnoreShortcut,
} from '../utils/mail';
import {
  ID_ROLE_FALLBACK,
  UNDO_INVERSE,
  draftToRow,
  failedIds,
  partialFailureText,
  removesFromView,
} from '../utils/mailInbox';

const TOAST_MS = 10000;
const FOLDER_REFRESH_DELAY_MS = 800;
const EMPTY_SET = new Set();

const SetupCard = ({ kind, error, onRetry, accountName }) => {
  const info =
    kind === 'error'
      ? describeMailError(error)
      : kind === 'reauth'
        ? describeMailError({ code: 'MAIL_REAUTH_REQUIRED' })
        : describeMailError({ code: 'MAIL_NOT_CONNECTED' });
  const heading =
    kind === 'none'
      ? 'No Gmail account yet'
      : kind === 'not_connected'
        ? `${accountName || 'Your account'} is not connected`
        : info.title;
  return (
    <div className="inbox-setup" role={kind === 'error' ? 'alert' : undefined}>
      <div className="inbox-setup-card">
        {kind === 'error' || kind === 'reauth' ? <AlertIcon size={30} /> : <MailIcon size={30} />}
        <h1>{heading}</h1>
        {kind === 'error' ? (
          <p>{info.message}</p>
        ) : kind === 'reauth' ? (
          <p>
            Google rejected the saved credentials. This happens about every 7 days while your
            OAuth app is in Testing mode. Reconnect to continue.
          </p>
        ) : (
          <p>
            Connect a Gmail account in Settings → Mail. It is configured separately from
            Google Drive.
          </p>
        )}
        <div className="inbox-setup-actions">
          {kind !== 'error' && (
            <Link className="inbox-cta" to="/settings" state={{ tab: 'Mail' }}>
              {kind === 'reauth' ? 'Reconnect in Settings → Mail' : 'Open Settings → Mail'}
            </Link>
          )}
          {kind === 'error' && info.retryable && (
            <button type="button" className="inbox-cta" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Inbox = () => {
  const { token } = useAuth();
  const api = useMemo(() => createMailApi(token), [token]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { account: accountParam, folder: folderParam, q, thread: threadId } = readInboxParams(searchParams);

  /* ── accounts ── */
  const [accountsState, setAccountsState] = useState({ status: 'loading', items: [], error: null });
  const [accountsReload, setAccountsReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await api.listAccounts({ signal: controller.signal });
        setAccountsState({ status: 'ready', items: data.accounts || [], error: null });
      } catch (error) {
        if (isAbortError(error)) return;
        setAccountsState({ status: 'error', items: [], error });
      }
    };
    load();
    return () => controller.abort();
  }, [api, accountsReload]);

  const account = (() => {
    const items = accountsState.items;
    return (
      items.find((a) => a.id === accountParam) ||
      items.find((a) => a.isDefault && a.isConnected) ||
      items.find((a) => a.isConnected) ||
      items.find((a) => a.isDefault) ||
      items[0] ||
      null
    );
  })();
  const accountId = account?.id || '';
  const accountIssue = !account
    ? 'none'
    : account.status === 'reauth_required'
      ? 'reauth'
      : !account.isConnected
        ? 'not_connected'
        : null;
  const accountUsable = !!account && !accountIssue;
  const canDeleteForever = !!account?.capabilities?.permanentDelete;
  const switchable = accountsState.items.filter((a) => a.isConnected || a.status === 'reauth_required');

  /* ── folders ── */
  const [foldersState, setFoldersState] = useState({ accountId: '', status: 'loading', items: [] });
  const [foldersReload, setFoldersReload] = useState(0);

  useEffect(() => {
    if (!accountId || !accountUsable) return undefined;
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await api.listFolders(accountId, { signal: controller.signal });
        setFoldersState({ accountId, status: 'ready', items: data.folders || [] });
      } catch (error) {
        if (isAbortError(error)) return;
        setFoldersState((s) => ({
          accountId,
          status: 'error',
          items: s.accountId === accountId ? s.items : [],
        }));
      }
    };
    load();
    return () => controller.abort();
  }, [api, accountId, accountUsable, foldersReload]);

  const foldersForAccount = foldersState.accountId === accountId;
  const folders = foldersForAccount ? foldersState.items : [];
  const foldersSettled = foldersForAccount && foldersState.status !== 'loading';
  // Counts come from ~35 Gmail calls, so a burst of actions (archive, archive,
  // star...) is coalesced into a single refresh shortly after the last one.
  const foldersTimerRef = useRef(null);
  const refreshFolders = () => {
    window.clearTimeout(foldersTimerRef.current);
    foldersTimerRef.current = window.setTimeout(() => setFoldersReload((n) => n + 1), FOLDER_REFRESH_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(foldersTimerRef.current), []);

  const defaultFolderId = findFolderByRole(folders, 'inbox')?.id || 'INBOX';
  const folderId = folderParam || (foldersSettled ? defaultFolderId : '');
  const currentFolder = findFolder(folders, folderId);
  const role = folderRole(currentFolder) || ID_ROLE_FALLBACK[folderId] || '';
  const isDrafts = role === 'drafts';
  const actions = actionsForRole(role);

  /* ── thread list + paging ── */
  const [listState, setListState] = useState({
    key: '',
    status: 'loading',
    threads: [],
    next: '',
    error: null,
    refreshing: false,
  });
  const [listReload, setListReload] = useState(0);
  const listKey = accountUsable && folderId ? `${accountId}|${folderId}|${q}` : '';

  const [pageState, setPageState] = useState({ key: '', tokens: [''], index: 0 });
  if (pageState.key !== listKey) setPageState({ key: listKey, tokens: [''], index: 0 });
  const page = pageState.key === listKey ? pageState : { key: listKey, tokens: [''], index: 0 };
  const pageToken = page.tokens[page.index] || '';
  const viewKey = `${listKey}|${pageToken}`;

  useEffect(() => {
    if (!listKey) return undefined;
    const controller = new AbortController();
    const load = async () => {
      setListState((s) =>
        s.key === viewKey && s.status === 'ready'
          ? { ...s, refreshing: true }
          : { key: viewKey, status: 'loading', threads: [], next: '', error: null, refreshing: false },
      );
      try {
        let threads;
        let next = '';
        if (isDrafts) {
          const data = await api.listDrafts(
            accountId,
            { pageToken, pageSize: MAIL_PAGE_SIZE },
            { signal: controller.signal },
          );
          // `q` is applied by Gmail (full search syntax); filtering again here would drop valid hits.
          threads = (data.drafts || []).map(draftToRow);
          next = data.nextPageToken || '';
        } else {
          const data = await api.listThreads(
            accountId,
            { folder: folderId, q, pageToken, pageSize: MAIL_PAGE_SIZE },
            { signal: controller.signal },
          );
          threads = data.threads || [];
          next = data.nextPageToken || '';
        }
        setListState({ key: viewKey, status: 'ready', threads, next, error: null, refreshing: false });
      } catch (error) {
        if (isAbortError(error)) return;
        setListState({ key: viewKey, status: 'error', threads: [], next: '', error, refreshing: false });
      }
    };
    load();
    return () => controller.abort();
  }, [api, accountId, folderId, q, listKey, viewKey, pageToken, isDrafts, listReload]);

  const list =
    listKey && listState.key === viewKey
      ? listState
      : { status: 'loading', threads: [], next: '', error: null, refreshing: false };
  const threads = list.threads;

  const listRef = useRef(null);
  const listStateRef = useRef(listState);
  useEffect(() => {
    listStateRef.current = listState;
  });

  /* ── selection + keyboard cursor ── */
  const [selection, setSelection] = useState({ key: '', ids: EMPTY_SET });
  const selectedIds = selection.key === viewKey ? selection.ids : EMPTY_SET;
  const selectedThreads = threads.filter((t) => selectedIds.has(t.id));
  const [cursorId, setCursorId] = useState('');

  const toggleSelect = (id) => {
    setSelection((s) => {
      const base = s.key === viewKey ? new Set(s.ids) : new Set();
      if (base.has(id)) base.delete(id);
      else base.add(id);
      return { key: viewKey, ids: base };
    });
  };

  const toggleAll = () => {
    const all = selectedThreads.length === threads.length && threads.length > 0;
    setSelection({ key: viewKey, ids: all ? EMPTY_SET : new Set(threads.map((t) => t.id)) });
  };

  /* ── open thread / reader ── */
  const [readerState, setReaderState] = useState({ key: '', status: 'idle', thread: null, error: null });
  const [readerReload, setReaderReload] = useState(0);
  const readerKey = accountUsable && threadId ? `${accountId}|${threadId}` : '';

  useEffect(() => {
    if (!readerKey) return undefined;
    const controller = new AbortController();
    const load = async () => {
      setReaderState((s) =>
        s.key === readerKey && s.status === 'ready'
          ? s
          : { key: readerKey, status: 'loading', thread: null, error: null },
      );
      try {
        const data = await api.getThread(accountId, threadId, { signal: controller.signal });
        setReaderState({ key: readerKey, status: 'ready', thread: data.thread || null, error: null });
      } catch (error) {
        if (isAbortError(error)) return;
        setReaderState({ key: readerKey, status: 'error', thread: null, error });
      }
    };
    load();
    return () => controller.abort();
  }, [api, accountId, threadId, readerKey, readerReload]);

  const reader = !readerKey
    ? { status: 'idle', thread: null, error: null }
    : readerState.key === readerKey
      ? readerState
      : { status: 'loading', thread: null, error: null };
  const readerInfo = reader.error ? describeMailError(reader.error) : null;

  const headingRef = useRef(null);
  const focusReaderRef = useRef(false);
  const lastOpenedRef = useRef('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (reader.status === 'ready' && focusReaderRef.current) {
      focusReaderRef.current = false;
      headingRef.current?.focus();
    }
  }, [reader.status, readerKey]);

  const updateParams = (patch) => setSearchParams((current) => patchInboxParams(current, patch));

  /* ── toast / live region ── */
  const [toast, setToast] = useState(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (text, extra = {}) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, text, ...extra });
  };

  const showError = (error, fallback) => {
    const info = describeMailError(error);
    const needsSettings = info.kind === 'reauth' || info.kind === 'not_connected';
    showToast(
      needsSettings ? `${info.title}.` : `${fallback ? `${fallback} ` : ''}${info.message}`,
      { kind: 'error', settingsLink: needsSettings },
    );
  };

  /* ── optimistic actions ── */
  const patchThreads = (ids, patch) => {
    const set = new Set(ids);
    setListState((s) => ({
      ...s,
      threads: s.threads.map((t) => (set.has(t.id) ? { ...t, ...patch } : t)),
    }));
  };

  const closeReader = (focusId) => {
    updateParams({ thread: '' });
    const id = focusId || lastOpenedRef.current;
    if (id) {
      window.setTimeout(() => {
        const row = listRef.current?.querySelector(`[data-thread-id="${window.CSS?.escape ? window.CSS.escape(id) : id}"] .maillist-main`);
        row?.focus();
      }, 0);
    }
  };

  const performAction = async (action, ids, { undo = true } = {}) => {
    if (!ids.length || !accountId) return;
    const previous = listStateRef.current.threads;
    const idSet = new Set(ids);
    const remove = removesFromView(action, role);

    // optimistic
    if (remove) {
      setListState((s) => ({ ...s, threads: s.threads.filter((t) => !idSet.has(t.id)) }));
      setSelection((s) => ({ ...s, ids: EMPTY_SET }));
      if (threadId && idSet.has(threadId)) closeReader('');
    } else if (action === 'markRead') patchThreads(ids, { unread: false });
    else if (action === 'markUnread') patchThreads(ids, { unread: true });
    else if (action === 'star') patchThreads(ids, { starred: true });
    else if (action === 'unstar') patchThreads(ids, { starred: false });

    try {
      const result = await api.threadAction(accountId, { ids, action });
      const failed = failedIds(result);
      if (failed.length) {
        // Gmail rejected some ids (e.g. already deleted): the optimistic change
        // is wrong for those rows, so resync from the server instead of guessing.
        setListReload((n) => n + 1);
        refreshFolders();
        showToast(partialFailureText(failed.length, ids.length), { kind: 'error' });
        return;
      }
      refreshFolders();
      if (threadId && idSet.has(threadId) && !remove) setReaderReload((n) => n + 1);
      const inverse = UNDO_INVERSE[action];
      if (undo && inverse) {
        showToast(
          `${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} ${
            action === 'archive' ? 'archived' : 'moved to Trash'
          }.`,
          { undo: { action: inverse, ids } },
        );
      } else if (action === 'deleteForever') {
        showToast('Deleted forever.');
      } else if (action === 'markUnread' && threadId && idSet.has(threadId)) {
        closeReader('');
      }
    } catch (error) {
      setListState((s) => ({ ...s, threads: previous })); // rollback
      showError(error, 'Could not update.');
    }
  };

  const handleUndo = async () => {
    if (!toast?.undo) return;
    const { action, ids } = toast.undo;
    setToast(null);
    try {
      const result = await api.threadAction(accountId, { ids, action });
      const failed = failedIds(result);
      setListReload((n) => n + 1);
      refreshFolders();
      if (failed.length) showToast(partialFailureText(failed.length, ids.length), { kind: 'error' });
      else showToast('Undone.');
    } catch (error) {
      showError(error, 'Could not undo.');
    }
  };

  /* confirm for delete forever */
  const [pendingDelete, setPendingDelete] = useState(null); // { ids }
  const requestAction = (action, ids) => {
    if (action === 'deleteForever') {
      if (!canDeleteForever || !actions.deleteForever) return;
      setPendingDelete({ ids });
      return;
    }
    performAction(action, ids);
  };

  /* ── open / back ── */
  const openDraftRef = useRef(() => {});
  const openThread = (thread) => {
    setCursorId('');
    lastOpenedRef.current = thread.id;
    if (thread.isDraft) {
      openDraftRef.current(thread);
      return;
    }
    focusReaderRef.current = true;
    updateParams({ thread: thread.id });
    if (thread.unread) {
      patchThreads([thread.id], { unread: false });
      api
        .threadAction(accountId, { ids: [thread.id], action: 'markRead' })
        .then(refreshFolders)
        .catch(() => patchThreads([thread.id], { unread: true }));
    }
  };

  /* ── compose ── */
  const [compose, setCompose] = useState(null); // { key, initial }
  const composeRef = useRef(null);
  useEffect(() => {
    composeRef.current = compose;
  });
  const composeSeq = useRef(0);

  const openCompose = (initial) => {
    composeSeq.current += 1;
    setCompose({ key: composeSeq.current, initial });
  };

  const startNew = () =>
      openCompose({
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        bodyText: '',
        heading: 'New message',
      });

  const startReply = (message, mode) => {
    const draft = buildReplyDraft(message, mode, { selfEmail: account?.emailAddress || '' });
    openCompose({
      ...draft,
      heading: mode === 'forward' ? 'Forward' : mode === 'replyAll' ? 'Reply all' : 'Reply',
    });
  };

  const openDraft = async (row) => {
    let message = row.message || {};
    const needsBody = typeof message.bodyText !== 'string';
    if (needsBody) {
      try {
        const data = await api.getDraft(accountId, row.draftId);
        message = data.draft?.message || message;
      } catch (error) {
        showError(error, 'Could not open the draft.');
        return;
      }
    }
    openCompose({
      to: message.to || [],
      cc: message.cc || [],
      bcc: message.bcc || [],
      subject: message.subject || '',
      bodyText: message.bodyText || '',
      threadId: message.threadId || undefined,
      draftId: row.draftId,
      heading: 'Draft',
    });
  };
  useEffect(() => {
    openDraftRef.current = openDraft;
  });

  const handleComposeClose = (result) => {
    setCompose(null);
    if (result?.sent) showToast('Message sent.');
    else if (result?.discarded) showToast('Draft discarded.');
    else if (result?.saved) showToast('Draft saved.');
    if (result?.sent || result?.discarded || result?.saved) {
      refreshFolders();
      if (isDrafts || role === 'sent') setListReload((n) => n + 1);
      if (result.sent && threadId) setReaderReload((n) => n + 1);
    }
  };

  /* ── attachments ── */
  const downloadAttachment = async (message, attachment) => {
    const attachmentId = attachment.id || attachment.attachmentId;
    const blob = await api.fetchAttachment(accountId, message.id, attachmentId, {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename || 'attachment';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  /* ── toolbar handlers ── */
  const handleBulkAction = (action) => {
    const ids = selectedThreads.map((t) => t.id);
    requestAction(action, ids);
  };

  const allStarred = selectedThreads.length > 0 && selectedThreads.every((t) => t.starred);

  const handleRefresh = () => {
    setListReload((n) => n + 1);
    refreshFolders();
  };

  const goNewer = () =>
    setPageState({ key: listKey, tokens: page.tokens, index: Math.max(0, page.index - 1) });
  const goOlder = () => {
    if (!list.next) return;
    setPageState({
      key: listKey,
      tokens: [...page.tokens.slice(0, page.index + 1), list.next],
      index: page.index + 1,
    });
  };

  const toggleStarRow = (thread) =>
    performAction(thread.starred ? 'unstar' : 'star', [thread.id], { undo: false });

  /* ── keyboard shortcuts (A7) ── */
  const shortcutRef = useRef(null);
  useEffect(() => {
    shortcutRef.current = (event) => {
      if (shouldIgnoreShortcut(event) || composeRef.current || pendingDelete) return;
      const key = event.key;
      const ids = threads.map((t) => t.id);
      const openThreadObj = threads.find((t) => t.id === threadId);
      const targetIds = () => {
        if (selectedThreads.length > 0) return selectedThreads.map((t) => t.id);
        if (threadId) return [threadId];
        if (cursorId) return [cursorId];
        return [];
      };
      const latestMessage = () => {
        const messages = reader.thread?.messages;
        return reader.status === 'ready' && messages?.length ? messages[messages.length - 1] : null;
      };
      const move = (delta) => {
        if (!ids.length) return;
        const current = ids.indexOf(cursorId || threadId);
        const next =
          current === -1 ? (delta > 0 ? 0 : ids.length - 1) : Math.min(ids.length - 1, Math.max(0, current + delta));
        setCursorId(ids[next]);
        const esc = window.CSS?.escape ? window.CSS.escape(ids[next]) : ids[next];
        const el = listRef.current?.querySelector(`[data-thread-id="${esc}"] .maillist-main`);
        el?.focus();
      };

      switch (key) {
        case 'j':
          event.preventDefault();
          move(1);
          break;
        case 'k':
          event.preventDefault();
          move(-1);
          break;
        case 'o':
        case 'Enter': {
          if (key === 'Enter' && document.activeElement && document.activeElement !== document.body) return;
          const target = threads.find((t) => t.id === cursorId);
          if (target) {
            event.preventDefault();
            openThread(target);
          }
          break;
        }
        case 'u':
          if (threadId) {
            event.preventDefault();
            closeReader(threadId);
          }
          break;
        case 'e':
          if (actions.archive && targetIds().length) {
            event.preventDefault();
            requestAction('archive', targetIds());
          }
          break;
        case '#':
          if (actions.trash && targetIds().length) {
            event.preventDefault();
            requestAction('trash', targetIds());
          }
          break;
        case 'r':
        case 'a':
        case 'f': {
          const message = latestMessage();
          if (message) {
            event.preventDefault();
            startReply(message, key === 'r' ? 'reply' : key === 'a' ? 'replyAll' : 'forward');
          }
          break;
        }
        case 'c':
          event.preventDefault();
          startNew();
          break;
        case '/':
          event.preventDefault();
          searchRef.current?.focus();
          break;
        case 'x': {
          const id = cursorId || threadId;
          if (id) {
            event.preventDefault();
            toggleSelect(id);
          }
          break;
        }
        case 's': {
          const targets = targetIds();
          if (targets.length) {
            event.preventDefault();
            const rows = threads.filter((t) => targets.includes(t.id));
            const starred = rows.length > 0 ? rows.every((t) => t.starred) : openThreadObj?.starred;
            performAction(starred ? 'unstar' : 'star', targets, { undo: false });
          }
          break;
        }
        case 'z':
          if (toast?.undo) {
            event.preventDefault();
            handleUndo();
          }
          break;
        case 'I':
          if (targetIds().length) {
            event.preventDefault();
            performAction('markRead', targetIds(), { undo: false });
          }
          break;
        case 'U':
          if (targetIds().length) {
            event.preventDefault();
            performAction('markUnread', targetIds(), { undo: false });
          }
          break;
        default:
          break;
      }
    };
  });

  useEffect(() => {
    const handler = (event) => shortcutRef.current?.(event);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── render ── */

  if (accountsState.status === 'loading') {
    return (
      <div className="inbox-page is-centered">
        <Spinner />
      </div>
    );
  }

  if (accountsState.status === 'error') {
    return (
      <div className="inbox-page is-centered">
        <SetupCard
          kind="error"
          error={accountsState.error}
          onRetry={() => {
            setAccountsState({ status: 'loading', items: [], error: null });
            setAccountsReload((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (accountIssue) {
    return (
      <div className="inbox-page is-centered">
        <SetupCard kind={accountIssue} accountName={account?.name} />
      </div>
    );
  }

  const listInfo = list.error ? describeMailError(list.error) : null;
  const folderName = currentFolder?.name || (role ? role[0].toUpperCase() + role.slice(1) : 'Mail');
  const emptyTitle = q
    ? `No results for “${q}”`
    : isDrafts
      ? 'No drafts'
      : role === 'inbox'
        ? 'Your inbox is empty'
        : role === 'trash'
          ? 'Trash is empty'
          : `Nothing in ${folderName}`;
  const emptyHint = q ? 'Try different search terms or Gmail operators such as from:, to:, is:unread.' : '';

  const liveText =
    list.status === 'loading'
      ? 'Loading mail…'
      : list.status === 'ready'
        ? `${threads.length} conversation${threads.length === 1 ? '' : 's'} in ${folderName}`
        : '';

  return (
    <div className="inbox-page" data-pane={threadId ? 'reader' : 'list'}>
      <h1 className="inbox-sr">Inbox</h1>
      <div className="inbox-sr" role="status" aria-live="polite">
        {liveText}
      </div>

      <MailSidebar
        accounts={switchable}
        accountId={accountId}
        onAccountChange={(id) => updateParams({ account: id, folder: '', q: '', thread: '' })}
        folders={folders}
        folderId={folderId}
        onSelectFolder={(id) => updateParams({ folder: id, q: '', thread: '' })}
        onCompose={startNew}
        loading={!foldersSettled}
      />

      <section className="inbox-listpane" aria-label={`${folderName} conversations`}>
        <MailToolbar
          q={q}
          onSearch={(value) => updateParams({ q: value, thread: '' })}
          searchRef={searchRef}
          selectionCount={selectedThreads.length}
          total={threads.length}
          onToggleAll={toggleAll}
          actions={actions}
          canDeleteForever={canDeleteForever}
          allStarred={allStarred}
          onAction={handleBulkAction}
          onRefresh={handleRefresh}
          refreshing={list.refreshing || list.status === 'loading'}
          range={pagerLabel({ pageIndex: page.index, pageSize: MAIL_PAGE_SIZE, count: threads.length })}
          canNewer={page.index > 0}
          canOlder={!!list.next}
          onNewer={goNewer}
          onOlder={goOlder}
          disabled={false}
        />

        <div className="inbox-scroll">
          <MailList
            status={list.status}
            errorInfo={listInfo}
            onRetry={handleRefresh}
            threads={threads}
            selectedIds={selectedIds}
            openId={threadId}
            cursorId={cursorId}
            onToggleSelect={toggleSelect}
            onOpen={openThread}
            onToggleStar={toggleStarRow}
            emptyTitle={emptyTitle}
            emptyHint={emptyHint}
            isDrafts={isDrafts}
            listRef={listRef}
          />
        </div>
      </section>

      <section className="inbox-readerpane" aria-label="Conversation">
        <MailReader
          key={readerKey || 'idle'}
          status={reader.status}
          thread={reader.thread}
          errorInfo={readerInfo}
          onRetry={() => setReaderReload((n) => n + 1)}
          onBack={() => closeReader(threadId)}
          headingRef={headingRef}
          actions={actions}
          canDeleteForever={canDeleteForever}
          onAction={(action) => requestAction(action, [threadId])}
          onReply={startReply}
          onDownloadAttachment={downloadAttachment}
        />
      </section>

      {compose && (
        <ComposeDialog
          key={compose.key}
          accountId={accountId}
          api={api}
          initial={compose.initial}
          onClose={handleComposeClose}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete forever?"
          danger
          confirmLabel="Delete forever"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const { ids } = pendingDelete;
            setPendingDelete(null);
            performAction('deleteForever', ids, { undo: false });
          }}
        >
          <p>
            {pendingDelete.ids.length === 1
              ? 'This conversation will be permanently deleted from Gmail.'
              : `${pendingDelete.ids.length} conversations will be permanently deleted from Gmail.`}
          </p>
          <p>This cannot be undone.</p>
        </ConfirmDialog>
      )}

      {toast && (
        <div className={`inbox-toast${toast.kind === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" className="inbox-toast-btn" onClick={handleUndo}>
              Undo
            </button>
          )}
          {toast.settingsLink && (
            <Link className="inbox-toast-btn" to="/settings" state={{ tab: 'Mail' }}>
              Settings → Mail
            </Link>
          )}
          <button type="button" className="inbox-toast-x" aria-label="Dismiss" onClick={() => setToast(null)}>
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Inbox;
