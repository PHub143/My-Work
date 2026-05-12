import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './Settings.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { useDrive } from '../DriveContext';

const TABS = ['Drives', 'Account', 'Appearance', 'Tags', 'Notifications'];

const MailIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
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
  const [activeTab, setActiveTab] = useState('Drives');

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
      setMessage({ type: 'success', text: location.state.message });
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  if (isLoading) {
    return <div className="settings-page"><Spinner /></div>;
  }

  // Form view (create or edit)
  if (isCreating || editingDrive) {
    const isEdit = !!editingDrive;
    return (
      <div className="settings-page">
        <div className="settings-form-card">
          <button className="settings-back-btn" onClick={closeForm}>
            <BackIcon /> Back
          </button>
          <h2 className="settings-form-title">
            {isEdit ? `Edit ${editingDrive.name}` : 'Add New Drive'}
          </h2>

          {message.text && (
            <div className={`settings-message settings-message--${message.type}`} role="status">
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-group">
              <label htmlFor="name">Drive Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                placeholder="e.g., Work Drive, Personal Photos" required />
            </div>
            <div className="form-group">
              <label htmlFor="clientId">Client ID</label>
              <input type="text" id="clientId" name="clientId" value={formData.clientId} onChange={handleChange}
                placeholder="Enter Google Client ID" required />
            </div>
            <div className="form-group">
              <label htmlFor="clientSecret">Client Secret</label>
              <input type="password" id="clientSecret" name="clientSecret" value={formData.clientSecret} onChange={handleChange}
                placeholder={isEdit && editingDrive.hasClientSecret ? '•••••••• (Leave blank to keep existing)' : 'Enter Google Client Secret'} />
            </div>
            <div className="form-group">
              <label htmlFor="redirectUri">Redirect URI</label>
              <input type="text" id="redirectUri" name="redirectUri" value={formData.redirectUri} onChange={handleChange}
                placeholder="e.g., http://localhost:5173/oauth/callback" required />
            </div>
            <div className="form-group">
              <label htmlFor="folderId">Drive Folder ID</label>
              <input type="text" id="folderId" name="folderId" value={formData.folderId} onChange={handleChange}
                placeholder="Enter Google Drive Folder ID" required />
            </div>
            <div className="form-btn-row">
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? <><Spinner inline /> Saving…</> : (isEdit ? 'Update Drive' : 'Create Drive')}
              </button>
              <button type="button" className="btn-outline" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List view
  const connectedCount = drives.filter(d => d.hasRefreshToken).length;
  const totalFiles = drives.reduce((sum, d) => sum + (d.fileCount || 0), 0);

  return (
    <div className="settings-page">
      {/* Hero */}
      <div className="settings-hero">
        <div>
          <div className="settings-drive-status">
            <span className="settings-drives-badge">
              {drives.length} DRIVE{drives.length !== 1 ? 'S' : ''}
            </span>
            <span className="settings-connected-label">
              · {connectedCount > 0 ? 'CONNECTED & SYNCED' : 'NOT CONNECTED'}
            </span>
          </div>
          <h1 className="settings-hero-title">
            Make it <em>yours.</em>
          </h1>
        </div>
        <button className="settings-add-btn" onClick={openCreateForm}>
          <PlusIcon /> Add drive
        </button>
      </div>

      {/* Tab strip */}
      <div className="settings-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`settings-tab ${activeTab === tab ? 'settings-tab--active' : ''}`}
            style={activeTab === tab ? { '--tab-color': ['var(--cosmic-pink)', 'var(--cosmic-cyan)', 'var(--cosmic-yellow)', 'var(--cosmic-orange)', 'var(--cosmic-purple)'][i] } : {}}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {message.text && (
        <div className={`settings-message settings-message--${message.type}`} role="status">
          {message.text}
        </div>
      )}

      {/* Drives tab content */}
      {activeTab === 'Drives' && (
        <>
          {drives.length === 0 ? (
            <div className="settings-empty">
              <div className="settings-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12H16L14 15H10L8 12H2"/>
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                </svg>
              </div>
              <p>No drives configured yet.</p>
              <button className="btn-primary" onClick={openCreateForm}>Add Your First Drive</button>
            </div>
          ) : (
            drives.map((drive) => (
              <div key={drive.id} className="drive-card-new">
                <div className="drive-card-top">
                  <div className="drive-card-icon-wrap">
                    <MailIcon />
                  </div>
                  <div className="drive-card-identity">
                    <div className="drive-card-name-row">
                      <span className="drive-card-name">{drive.name}</span>
                      {drive.isDefault && <span className="drive-default-badge">DEFAULT</span>}
                    </div>
                    <div className="drive-card-meta">
                      {drive.fileCount} file{drive.fileCount !== 1 ? 's' : ''} · folder {drive.folderId?.slice(0, 12)}…
                    </div>
                  </div>
                  <div className="drive-card-edit-actions">
                    <button className="drive-edit-btn" onClick={() => openEditForm(drive)} title="Edit">
                      <EditIcon />
                    </button>
                    <button className="drive-delete-btn" onClick={() => setConfirmDelete(drive)} title="Delete">
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <div className="drive-status-grid">
                  <div className="drive-status-chip drive-status-chip--cyan">
                    <span className="drive-status-label">STATUS</span>
                    <span className="drive-status-value">
                      {drive.hasRefreshToken ? '✓ Live' : '✕ Offline'}
                    </span>
                  </div>
                  <div className="drive-status-chip drive-status-chip--cyan">
                    <span className="drive-status-label">AUTH</span>
                    <span className="drive-status-value">
                      {drive.hasClientSecret ? '✓ Verified' : '✕ Missing'}
                    </span>
                  </div>
                  <div className="drive-status-chip drive-status-chip--pink">
                    <span className="drive-status-label">FILES</span>
                    <span className="drive-status-value">{drive.fileCount}</span>
                  </div>
                  <div className="drive-status-chip drive-status-chip--purple">
                    <span className="drive-status-label">LAST SYNC</span>
                    <span className="drive-status-value">
                      {drive.lastSync ? new Date(drive.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="drive-action-row">
                  <button className="drive-reauth-btn" onClick={() => handleAuth(drive)}
                    disabled={!drive.hasClientSecret}>
                    Re-authenticate
                  </button>
                  <button className="drive-sync-btn" onClick={() => handleSync(drive)}
                    disabled={syncingDriveId === drive.id || !drive.hasRefreshToken}>
                    {syncingDriveId === drive.id ? <><Spinner inline /> Syncing…</> : 'Sync now ↻'}
                  </button>
                  {!drive.isDefault && (
                    <button className="drive-default-btn" onClick={() => handleSetDefault(drive)}>
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Storage section */}
          {drives.length > 0 && (
            <div className="storage-section">
              <div className="storage-label">STORAGE · {totalFiles} FILES ACROSS {drives.length} DRIVE{drives.length !== 1 ? 'S' : ''}</div>
              <div className="storage-bar">
                {drives.map((drive, i) => {
                  const pct = totalFiles > 0 ? Math.round((drive.fileCount / totalFiles) * 100) : Math.floor(100 / drives.length);
                  const colors = ['var(--cosmic-pink)', 'var(--cosmic-cyan)', 'var(--cosmic-yellow)', 'var(--cosmic-orange)', 'var(--cosmic-purple)'];
                  return (
                    <div key={drive.id} className="storage-bar-seg" style={{ width: `${pct}%`, background: colors[i % colors.length] }}>
                      {drive.name}
                    </div>
                  );
                })}
                {drives.length > 0 && (
                  <div className="storage-bar-free">Connected</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Other tabs placeholder */}
      {activeTab !== 'Drives' && (
        <div className="settings-placeholder">
          <p>{activeTab} settings coming soon.</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete "{confirmDelete.name}"?</h3>
            <p>This action cannot be undone. All associated configuration will be permanently removed.</p>
            {confirmDelete.fileCount > 0 && (
              <p className="modal-warning">
                ⚠️ This drive has {confirmDelete.fileCount} file{confirmDelete.fileCount !== 1 ? 's' : ''} associated. You must sync and remove them first.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)}>Delete Drive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
