import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './Settings.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { useDrive } from '../DriveContext';
import MailAccountsSettings from '../components/MailAccountsSettings';
import SettingsNotice from '../components/SettingsNotice';
import ConfirmDialog from '../components/mail/ConfirmDialog';
import { ArrowLeft, Check, Cross, Plus, Retake } from '../components/ExamIcons.jsx';

const TABS = ['Drives', 'Mail', 'Account', 'Appearance', 'Tags', 'Notifications'];

const Glyph = ({ children, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const TrayIcon = ({ size }) => (
  <Glyph size={size}>
    <path d="M2.5 11.5h4l1 2h5l1-2h4M4.2 4.7L2.5 11.5V15a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 17.5 15v-3.5l-1.7-6.8A1.5 1.5 0 0 0 14.4 3.5H5.6a1.5 1.5 0 0 0-1.4 1.2z" />
  </Glyph>
);

const EditIcon = () => (
  <Glyph>
    <path d="M12.5 4.5l3 3L7 16H4v-3z" />
  </Glyph>
);

const TrashIcon = () => (
  <Glyph>
    <path d="M4.5 6h11M8 6V4h4v2M6 6l.6 9.5h6.8L14 6M8.5 9v4M11.5 9v4" />
  </Glyph>
);

const WarningIcon = () => (
  <Glyph>
    <path d="M10 3.5l7 12.5H3z" />
    <path d="M10 8.5v3.25M10 14h.01" />
  </Glyph>
);

const Settings = () => {
  const location = useLocation();
  const { token } = useAuth();
  const { refreshDrives } = useDrive();
  const [drives, setDrives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingDriveId, setSyncingDriveId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingDrive, setEditingDrive] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState(() =>
    TABS.includes(location.state?.tab) ? location.state.tab : 'Drives'
  );

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    folderId: '',
    isDefault: false
  });

  const fetchDrives = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/config/drives`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDrives(data.configs || []);
      }
    } catch (error) {
      console.error('Error fetching drives:', error);
      setMessage({ type: 'error', text: 'Failed to load drive configurations.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (location.state?.message) {
      // A route guard sent the admin here (e.g. Drive is not configured yet).
      setMessage({ type: 'setup', text: location.state.message });
      window.history.replaceState({}, document.title);
    }
    fetchDrives();
  }, [location, fetchDrives]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const openCreateForm = () => {
    setIsCreating(true);
    setEditingDrive(null);
    setFormData({ name: '', clientId: '', clientSecret: '', redirectUri: '', folderId: '', isDefault: false });
    setMessage({ type: '', text: '' });
  };

  const openEditForm = async (drive) => {
    setIsCreating(false);
    setEditingDrive(drive);
    try {
      const response = await fetch(`${API_URL}/config/drive/${drive.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const config = data.config;
        setFormData({
          name: config.name || '',
          clientId: config.clientId || '',
          clientSecret: '',
          redirectUri: config.redirectUri || '',
          folderId: config.folderId || '',
          isDefault: config.isDefault || false
        });
      }
    } catch (error) {
      console.error('Error fetching drive config:', error);
    }
    setMessage({ type: '', text: '' });
  };

  const closeForm = () => {
    setEditingDrive(null);
    setIsCreating(false);
    setMessage({ type: '', text: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const body = { ...formData };
      if (editingDrive) body.id = editingDrive.id;
      const response = await fetch(`${API_URL}/config/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message || 'Settings saved successfully.' });
        fetchDrives();
        refreshDrives();
        closeForm();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuth = async (drive) => {
    try {
      const response = await fetch(`${API_URL}/auth/google/url?driveConfigId=${drive.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: 'Failed to get authentication URL.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  const handleSync = async (drive) => {
    setSyncingDriveId(drive.id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/config/sync/${drive.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `Sync of "${drive.name}" successful! ${data.syncedCount ?? 0} files synced, ${data.deletedCount ?? 0} orphaned records removed.`
        });
        fetchDrives();
        refreshDrives();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || data.message || 'Failed to sync drive.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setSyncingDriveId(null);
    }
  };

  const handleSetDefault = async (drive) => {
    try {
      const response = await fetch(`${API_URL}/config/drive/${drive.id}/default`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `"${drive.name}" is now the default drive.` });
        fetchDrives();
        refreshDrives();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to set default drive.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  const handleDelete = async (drive) => {
    try {
      const response = await fetch(`${API_URL}/config/drive/${drive.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `"${drive.name}" has been deleted.` });
        setConfirmDelete(null);
        fetchDrives();
        refreshDrives();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to delete drive.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="settings-content"><Spinner /></div>
      </div>
    );
  }

  // Form view (create or edit)
  if (isCreating || editingDrive) {
    const isEdit = !!editingDrive;
    return (
      <div className="settings-page">
        <div className="settings-content">
          <div className="settings-form-card">
            <button type="button" className="settings-back-btn" onClick={closeForm}>
              <ArrowLeft /> Back
            </button>
            <h2 className="settings-form-title">
              {isEdit ? `Edit ${editingDrive.name}` : 'Add new drive'}
            </h2>

            {message.text && <SettingsNotice type={message.type}>{message.text}</SettingsNotice>}

            <form onSubmit={handleSave} className="settings-form">
              <div className="as-field">
                <label className="as-field__label" htmlFor="name">Drive name</label>
                <input className="as-field__input" type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                  placeholder="e.g., Work Drive, Personal Photos" required />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="clientId">Client ID</label>
                <input className="as-field__input" type="text" id="clientId" name="clientId" value={formData.clientId} onChange={handleChange}
                  placeholder="Enter Google Client ID" required />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="clientSecret">Client secret</label>
                <input className="as-field__input" type="password" id="clientSecret" name="clientSecret" value={formData.clientSecret} onChange={handleChange}
                  placeholder={isEdit && editingDrive.hasClientSecret ? '•••••••• (Leave blank to keep existing)' : 'Enter Google Client Secret'} />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="redirectUri">Redirect URI</label>
                <input className="as-field__input" type="text" id="redirectUri" name="redirectUri" value={formData.redirectUri} onChange={handleChange}
                  placeholder="e.g., http://localhost:5173/oauth/callback" required />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="folderId">Drive folder ID</label>
                <input className="as-field__input" type="text" id="folderId" name="folderId" value={formData.folderId} onChange={handleChange}
                  placeholder="Enter Google Drive Folder ID" required />
              </div>
              <div className="settings-form-actions">
                <button type="submit" className="as-btn as-btn--primary" disabled={isSaving}>
                  {isSaving ? <><Spinner inline /> Saving…</> : (isEdit ? 'Update drive' : 'Create drive')}
                </button>
                <button type="button" className="as-btn as-btn--secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // List view
  const connectedCount = drives.filter(d => d.hasRefreshToken).length;
  const totalFiles = drives.reduce((sum, d) => sum + (d.fileCount || 0), 0);
  const driveWord = (count) => `drive${count !== 1 ? 's' : ''}`;

  return (
    <div className="settings-page">
      <div className="settings-content">
        {/* Hero */}
        <div className="settings-hero">
          <div className="settings-hero-copy">
            <span className="as-label settings-eyebrow">
              {drives.length} {driveWord(drives.length)} · {connectedCount > 0 ? 'Connected and synced' : 'Not connected'}
            </span>
            <h1 className="as-display">Make it yours.</h1>
          </div>
          {activeTab !== 'Mail' && (
            <button type="button" className="as-btn as-btn--primary settings-add-btn" onClick={openCreateForm}>
              <Plus /> Add drive
            </button>
          )}
        </div>

        {/* Tab strip */}
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className="settings-tab"
              onClick={() => {
                setActiveTab(tab);
                // A drive notice belongs to the Drives tab; don't carry it onto another tab.
                setMessage({ type: '', text: '' });
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {message.text && <SettingsNotice type={message.type}>{message.text}</SettingsNotice>}

        {/* Drives tab content */}
        {activeTab === 'Drives' && (
          <>
            {drives.length === 0 ? (
              <div className="settings-empty">
                <span className="settings-empty-icon"><TrayIcon size={48} /></span>
                <p>No drives configured yet.</p>
                <button type="button" className="as-btn as-btn--primary" onClick={openCreateForm}>Add your first drive</button>
              </div>
            ) : (
              <div className="settings-drive-grid">
                {drives.map((drive) => (
                  <article key={drive.id} className="drive-card-new">
                    <div className="drive-card-top">
                      <span className="drive-card-icon-wrap" aria-hidden="true">
                        <TrayIcon size={24} />
                      </span>
                      <div className="drive-card-identity">
                        <div className="drive-card-name-row">
                          <h2 className="drive-card-name">{drive.name}</h2>
                          {drive.isDefault && <span className="drive-default-badge">Default</span>}
                        </div>
                        <div className="drive-card-meta">
                          {drive.fileCount} file{drive.fileCount !== 1 ? 's' : ''} · folder {drive.folderId?.slice(0, 12)}…
                        </div>
                      </div>
                      <div className="drive-card-edit-actions">
                        <button type="button" className="drive-icon-btn" onClick={() => openEditForm(drive)}
                          aria-label={`Edit ${drive.name}`} title="Edit">
                          <EditIcon />
                        </button>
                        <button type="button" className="drive-icon-btn drive-icon-btn--danger" onClick={() => setConfirmDelete(drive)}
                          aria-label={`Delete ${drive.name}`} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="drive-status-grid">
                      <div className="drive-status-chip">
                        <span className="drive-status-label">Status</span>
                        <span className={`drive-status-value ${drive.hasRefreshToken ? 'is-ok' : 'is-bad'}`}>
                          {drive.hasRefreshToken ? <><Check size={16} /> Live</> : <><Cross size={16} /> Offline</>}
                        </span>
                      </div>
                      <div className="drive-status-chip">
                        <span className="drive-status-label">Auth</span>
                        <span className={`drive-status-value ${drive.hasClientSecret ? 'is-ok' : 'is-bad'}`}>
                          {drive.hasClientSecret ? <><Check size={16} /> Verified</> : <><Cross size={16} /> Missing</>}
                        </span>
                      </div>
                      <div className="drive-status-chip">
                        <span className="drive-status-label">Files</span>
                        <span className="drive-status-value">{drive.fileCount}</span>
                      </div>
                      <div className="drive-status-chip">
                        <span className="drive-status-label">Last sync</span>
                        <span className="drive-status-value">
                          {drive.lastSync ? new Date(drive.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </span>
                      </div>
                    </div>

                    <div className="drive-action-row">
                      <button type="button" className="as-btn as-btn--secondary" onClick={() => handleAuth(drive)}
                        disabled={!drive.hasClientSecret}>
                        Re-authenticate
                      </button>
                      <button type="button" className="as-btn as-btn--primary" onClick={() => handleSync(drive)}
                        disabled={syncingDriveId === drive.id || !drive.hasRefreshToken}>
                        {syncingDriveId === drive.id ? <><Spinner inline /> Syncing…</> : <>Sync now <Retake /></>}
                      </button>
                      {!drive.isDefault && (
                        <button type="button" className="as-btn as-btn--secondary drive-default-btn" onClick={() => handleSetDefault(drive)}>
                          Set default
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Storage section */}
            {drives.length > 0 && (
              <section className="storage-section" aria-label="Storage">
                <span className="as-label storage-label">
                  Storage · {totalFiles} files across {drives.length} {driveWord(drives.length)}
                </span>
                <div className="storage-bar">
                  {drives.map((drive, index) => {
                    const pct = totalFiles > 0 ? Math.round((drive.fileCount / totalFiles) * 100) : Math.floor(100 / drives.length);
                    return (
                      <div key={drive.id} className={`storage-bar-seg storage-bar-seg--${index % 3}`} style={{ width: `${pct}%` }}>
                        <span className="storage-bar-seg-text">
                          {drive.name} · {drive.fileCount} file{drive.fileCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <ul className="storage-legend">
                  {drives.map((drive, index) => (
                    <li key={drive.id}>
                      <span className={`storage-swatch storage-bar-seg--${index % 3}`} aria-hidden="true" />
                      {drive.name} · {drive.fileCount} file{drive.fileCount !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Mail tab: Gmail accounts for the admin Inbox (separate from Drive) */}
        {activeTab === 'Mail' && <MailAccountsSettings />}

        {/* Other tabs placeholder */}
        {activeTab !== 'Drives' && activeTab !== 'Mail' && (
          <div className="settings-placeholder">
            <p>{activeTab} settings coming soon.</p>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <ConfirmDialog
            title={`Delete “${confirmDelete.name}”?`}
            danger
            confirmLabel="Delete drive"
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => handleDelete(confirmDelete)}
          >
            <p>This action cannot be undone. All associated configuration will be permanently removed.</p>
            {confirmDelete.fileCount > 0 && (
              <p className="settings-warning">
                <WarningIcon />
                <span>
                  This drive has {confirmDelete.fileCount} file{confirmDelete.fileCount !== 1 ? 's' : ''} associated. You must sync and remove them first.
                </span>
              </p>
            )}
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
};

export default Settings;
