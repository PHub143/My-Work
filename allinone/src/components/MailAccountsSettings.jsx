import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MailAccountsSettings.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import Spinner from './Spinner';
import ConfirmDialog from './mail/ConfirmDialog';
import { createMailApi } from '../utils/mailApi';
import { isGoogleAuthUrl } from '../utils/mailInbox';

const STATUS_LABEL = {
  connected: 'Connected',
  reauth_required: 'Needs reconnect',
  disconnected: 'Not connected',
};

const statusOf = (account) => {
  if (account.status === 'reauth_required') return 'reauth_required';
  if (account.isConnected || account.status === 'connected') return 'connected';
  return 'disconnected';
};

const fallbackRedirect = () => {
  const base = import.meta.env?.BASE_URL || '/';
  return `${window.location.origin}${base}`;
};

const EMPTY_FORM = {
  provider: '',
  name: '',
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  allowPermanentDelete: false,
};

/**
 * Settings → Mail tab. Manages Gmail accounts (separate from Drive configs).
 * The OAuth callback lands on /oauth/callback, which routes state.kind==='mail'
 * to POST /mail/oauth/callback and returns here with a success message.
 */
const MailAccountsSettings = () => {
  const { token } = useAuth();
  const api = useMemo(() => createMailApi(token), [token]);

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState(null); // account | 'new' | null
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [defaultRedirect, setDefaultRedirect] = useState(fallbackRedirect);
  const [providers, setProviders] = useState([]);
  const formHeadingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listAccounts();
      setAccounts(data.accounts || []);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Failed to load mail accounts.');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  /* Providers come from the API so a new backend provider shows up here
     without a frontend change; Gmail is the fallback if the call fails. */
  useEffect(() => {
    let cancelled = false;
    api
      .listProviders()
      .then((data) => {
        if (!cancelled) setProviders(Array.isArray(data.providers) ? data.providers : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  /* Drive stores the redirect URI the user registered in Google Cloud; reuse
     the default Drive's value so both clients use the same landing page. */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`${API_URL}/config/drives`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const configs = Array.isArray(data.configs) ? data.configs : [];
        const source = configs.find((c) => c.isDefault && c.redirectUri) || configs.find((c) => c.redirectUri);
        if (!cancelled && source?.redirectUri) setDefaultRedirect(source.redirectUri);
      } catch {
        /* keep the computed fallback */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (editing) formHeadingRef.current?.focus();
  }, [editing]);

  const flash = (type, text) => setMessage({ type, text });

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, redirectUri: defaultRedirect });
    setEditing('new');
    setMessage({ type: '', text: '' });
  };

  const openEdit = (account) => {
    setForm({
      name: account.name || '',
      clientId: account.clientId || '',
      clientSecret: '',
      redirectUri: account.redirectUri || defaultRedirect,
      allowPermanentDelete: !!account.allowPermanentDelete,
    });
    setEditing(account);
    setMessage({ type: '', text: '' });
  };

  const closeForm = () => {
    setEditing(null);
    setMessage({ type: '', text: '' });
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((current) => ({ ...current, [e.target.name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const body = {
        name: form.name.trim(),
        clientId: form.clientId.trim(),
        redirectUri: form.redirectUri.trim(),
        allowPermanentDelete: form.allowPermanentDelete,
      };
      // Blank secret on edit = keep the stored (encrypted) one.
      if (form.clientSecret) body.clientSecret = form.clientSecret;

      const isEdit = editing && editing !== 'new';
      const data = isEdit
        ? await api.updateAccount(editing.id, body)
        : await api.createAccount({ ...body, provider: form.provider || providers[0]?.id || 'gmail' });

      const scopeChanged = isEdit && !!editing.allowPermanentDelete !== form.allowPermanentDelete;
      flash(
        'success',
        scopeChanged || !isEdit
          ? `${data.account?.name || body.name} saved. Click Connect to authorize with Google.`
          : `${data.account?.name || body.name} saved.`,
      );
      setEditing(null);
      await load();
    } catch (error) {
      flash('error', error.message || 'Failed to save the account.');
    } finally {
      setIsSaving(false);
    }
  };

  const run = async (account, fn, successText) => {
    setBusyId(account.id);
    setMessage({ type: '', text: '' });
    try {
      await fn();
      if (successText) flash('success', successText);
      await load();
    } catch (error) {
      flash('error', error.message || 'Request failed.');
    } finally {
      setBusyId('');
    }
  };

  const handleConnect = async (account) => {
    setBusyId(account.id);
    setMessage({ type: '', text: '' });
    try {
      const data = await api.getOAuthUrl(account.id);
      if (isGoogleAuthUrl(data.url)) {
        window.location.href = data.url;
        return;
      }
      flash('error', 'The server did not return a valid Google authorization URL.');
    } catch (error) {
      flash('error', error.message || 'Failed to get the authorization URL.');
    }
    setBusyId('');
  };

  const handleDelete = async (account) => {
    setConfirmDelete(null);
    await run(account, () => api.deleteAccount(account.id), `"${account.name}" has been deleted.`);
  };

  if (isLoading) {
    return (
      <div className="mailacct-loading">
        <Spinner />
      </div>
    );
  }

  /* ── add / edit form ── */
  if (editing) {
    const isEdit = editing !== 'new';
    return (
      <div className="mailacct-form-card">
        <button type="button" className="mailacct-back" onClick={closeForm}>
          ← Back
        </button>
        <h2 className="mailacct-form-title" tabIndex={-1} ref={formHeadingRef}>
          {isEdit ? `Edit ${editing.name}` : 'Add Gmail account'}
        </h2>

        {message.text && (
          <div className={`settings-message settings-message--${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <HelpText redirectUri={form.redirectUri} />

        <form onSubmit={handleSave} className="mailacct-form">
          {editing === 'new' && providers.length > 1 && (
            <div className="mailacct-field">
              <label htmlFor="mail-provider">Provider</label>
              <select
                id="mail-provider"
                name="provider"
                value={form.provider || providers[0].id}
                onChange={handleChange}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mailacct-field">
            <label htmlFor="mail-name">Account name</label>
            <input
              id="mail-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Personal Gmail"
              required
            />
          </div>
          <div className="mailacct-field">
            <label htmlFor="mail-clientId">Client ID</label>
            <input
              id="mail-clientId"
              name="clientId"
              type="text"
              value={form.clientId}
              onChange={handleChange}
              placeholder="xxxx.apps.googleusercontent.com"
              autoComplete="off"
              required
            />
          </div>
          <div className="mailacct-field">
            <label htmlFor="mail-clientSecret">Client secret</label>
            <input
              id="mail-clientSecret"
              name="clientSecret"
              type="password"
              value={form.clientSecret}
              onChange={handleChange}
              placeholder={
                isEdit && editing.hasClientSecret
                  ? '•••••••• (leave blank to keep the stored secret)'
                  : 'Enter the Google client secret'
              }
              autoComplete="new-password"
              required={!isEdit || !editing.hasClientSecret}
            />
          </div>
          <div className="mailacct-field">
            <label htmlFor="mail-redirectUri">Redirect URI</label>
            <input
              id="mail-redirectUri"
              name="redirectUri"
              type="text"
              value={form.redirectUri}
              onChange={handleChange}
              required
              aria-describedby="mail-redirect-hint"
            />
            <p id="mail-redirect-hint" className="mailacct-hint">
              Prefilled with the redirect your Drive uses. It must be listed under “Authorized
              redirect URIs” of this OAuth client in Google Cloud.
            </p>
          </div>

          <div className="mailacct-check">
            <input
              id="mail-allowPermanentDelete"
              name="allowPermanentDelete"
              type="checkbox"
              checked={form.allowPermanentDelete}
              onChange={handleChange}
              aria-describedby="mail-delete-hint"
            />
            <label htmlFor="mail-allowPermanentDelete">Allow permanent delete</label>
            <p id="mail-delete-hint" className="mailacct-hint">
              Off by default: “delete” moves mail to Trash, which you can undo. Turning this on
              adds the broader <code>https://mail.google.com/</code> Google scope so “Delete
              forever” works in Trash and Spam. You must <strong>reconnect</strong> the account
              after changing it.
            </p>
          </div>

          <div className="mailacct-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? <><Spinner inline /> Saving…</> : isEdit ? 'Update account' : 'Create account'}
            </button>
            <button type="button" className="btn-outline" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── list ── */
  return (
    <div className="mailacct">
      <div className="mailacct-head">
        <p className="mailacct-intro">
          Gmail accounts for the admin Inbox. These credentials are separate from your Google
          Drive configuration.
        </p>
        <button type="button" className="settings-add-btn mailacct-add" onClick={openCreate}>
          + Add Gmail account
        </button>
      </div>

      {message.text && (
        <div className={`settings-message settings-message--${message.type}`} role="status">
          {message.text}
        </div>
      )}
      {loadError && (
        <div className="settings-message settings-message--error" role="alert">
          {loadError}{' '}
          <button type="button" className="mailacct-link" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {accounts.length === 0 && !loadError ? (
        <div className="settings-empty">
          <p>No Gmail accounts configured yet.</p>
          <button type="button" className="btn-primary" onClick={openCreate}>
            Add your first account
          </button>
        </div>
      ) : (
        <ul className="mailacct-list">
          {accounts.map((account) => {
            const state = statusOf(account);
            const busy = busyId === account.id;
            return (
              <li key={account.id} className="mailacct-card">
                <div className="mailacct-card-top">
                  <div className="mailacct-identity">
                    <div className="mailacct-name-row">
                      <span className="mailacct-name">{account.name}</span>
                      {account.isDefault && <span className="mailacct-default">Default</span>}
                      <span className={`mailacct-status is-${state}`}>{STATUS_LABEL[state]}</span>
                    </div>
                    <div className="mailacct-email">
                      {account.emailAddress || 'No mailbox connected yet'}
                    </div>
                  </div>
                </div>

                {state === 'reauth_required' && (
                  <p className="mailacct-warning" role="note">
                    Google rejected the saved authorization (refresh tokens expire after 7 days
                    while the OAuth app is in Testing mode). Reconnect to resume.
                  </p>
                )}

                <div className="mailacct-row-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleConnect(account)}
                    disabled={busy || !account.hasClientSecret}
                    title={account.hasClientSecret ? undefined : 'Add a client secret first (Edit)'}
                  >
                    {state === 'disconnected' ? 'Connect' : 'Reconnect'}
                  </button>
                  {state !== 'disconnected' && (
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={busy}
                      onClick={() =>
                        run(account, () => api.disconnectAccount(account.id), `"${account.name}" disconnected.`)
                      }
                    >
                      Disconnect
                    </button>
                  )}
                  {!account.isDefault && (
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={busy}
                      onClick={() =>
                        run(
                          account,
                          () => api.setDefaultAccount(account.id),
                          `"${account.name}" is now the default mail account.`,
                        )
                      }
                    >
                      Set default
                    </button>
                  )}
                  <button type="button" className="btn-outline" disabled={busy} onClick={() => openEdit(account)}>
                    Edit
                  </button>
                  <button type="button" className="btn-danger" disabled={busy} onClick={() => setConfirmDelete(account)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <HelpText redirectUri={defaultRedirect} />

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${confirmDelete.name}”?`}
          danger
          confirmLabel="Delete account"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        >
          <p>
            This removes the stored credentials and tokens for this account from the app. Your
            mail in Gmail is not touched. To revoke access completely, remove the app at
            myaccount.google.com/permissions.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
};

const HelpText = ({ redirectUri }) => (
  <details className="mailacct-help">
    <summary>Google Cloud setup checklist</summary>
    <ol>
      <li>
        In Google Cloud Console, create (or reuse) a project and <strong>enable the Gmail API</strong>.
      </li>
      <li>
        Create an OAuth client (type “Web application”) and add this{' '}
        <strong>Authorized redirect URI</strong>: <code>{redirectUri || fallbackRedirect()}</code>
      </li>
      <li>
        On the OAuth consent screen, add the <code>gmail.modify</code> scope and add yourself as a{' '}
        <strong>test user</strong>.
      </li>
      <li>
        While the app is in <strong>Testing</strong> mode Google expires refresh tokens every{' '}
        <strong>7 days</strong>; you will see “Needs reconnect” and can reconnect with one click.
      </li>
    </ol>
  </details>
);

export default MailAccountsSettings;
