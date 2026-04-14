import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './Settings.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { useDrive } from '../DriveContext';

const Settings = () => {
  const location = useLocation();
  const { token } = useAuth();
  const { refreshDrives } = useDrive();
  const [drives, setDrives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingDriveId, setSyncingDriveId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingDrive, setEditingDrive] = useState(null); // null = list view, object = form view
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    setFormData({
      name: '',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      folderId: '',
      isDefault: false
    });
    setMessage({ type: '', text: '' });
  };

  const openEditForm = async (drive) => {
    setIsCreating(false);
    setEditingDrive(drive);
    try {
      const response = await fetch(`${API_URL}/config/drive/${drive.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      if (editingDrive) {
        body.id = editingDrive.id;
      }

      const response = await fetch(`${API_URL}/config/drive`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuth = async (drive) => {
    try {
      const response = await fetch(`${API_URL}/auth/google/url?driveConfigId=${drive.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to get authentication URL.' });
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  const handleSync = async (drive) => {
    setSyncingDriveId(drive.id);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/config/sync/${drive.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      console.error('Error syncing drive:', error);
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setSyncingDriveId(null);
    }
  };

  const handleSetDefault = async (drive) => {
    try {
      const response = await fetch(`${API_URL}/config/drive/${drive.id}/default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      console.error('Error setting default:', error);
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  const handleDelete = async (drive) => {
    try {
      const response = await fetch(`${API_URL}/config/drive/${drive.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      console.error('Error deleting drive:', error);
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    }
  };

  if (isLoading) {
    return <div className="settings-container"><Spinner /></div>;
  }

  // Show form view (create or edit)
  if (isCreating || editingDrive) {
    const isEdit = !!editingDrive;
    return (
      <div className="settings-container">
        <div className="settings-card">
          <div className="settings-form-header">
            <button className="back-button" onClick={closeForm}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <h1>{isEdit ? `Edit ${editingDrive.name}` : 'Add New Drive'}</h1>
          </div>

          {message.text && (
            <div className={`status-message ${message.type}`} role="status">
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-group">
              <label htmlFor="name">Drive Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Work Drive, Personal Photos"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientId">Client ID</label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                placeholder="Enter Google Client ID"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientSecret">Client Secret</label>
              <input
                type="password"
                id="clientSecret"
                name="clientSecret"
                value={formData.clientSecret}
                onChange={handleChange}
                placeholder={isEdit && editingDrive.hasClientSecret ? "•••••••• (Leave blank to keep existing)" : "Enter Google Client Secret"}
              />
            </div>

            <div className="form-group">
              <label htmlFor="redirectUri">Redirect URI</label>
              <input
                type="text"
                id="redirectUri"
                name="redirectUri"
                value={formData.redirectUri}
                onChange={handleChange}
                placeholder="e.g., http://localhost:5173/oauth/callback"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="folderId">Drive Folder ID</label>
              <input
                type="text"
                id="folderId"
                name="folderId"
                value={formData.folderId}
                onChange={handleChange}
                placeholder="Enter Google Drive Folder ID"
                required
              />
            </div>

            <div className="button-group">
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? <><Spinner inline /> Saving...</> : (isEdit ? 'Update Drive' : 'Create Drive')}
              </button>
              <button type="button" className="secondary-button" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Drive list view
  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-list-header">
          <div>
            <h1>Google Drive Settings</h1>
            <p className="settings-subtitle">Manage your connected Google Drive accounts</p>
          </div>
          <button className="primary-button add-drive-btn" onClick={openCreateForm}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Drive
          </button>
        </div>

        {message.text && (
          <div className={`status-message ${message.type}`} role="status">
            {message.text}
          </div>
        )}

        {drives.length === 0 ? (
          <div className="no-drives">
            <div className="no-drives-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12H16L14 15H10L8 12H2" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </div>
            <p>No drives configured yet.</p>
            <button className="primary-button" onClick={openCreateForm}>
              Add Your First Drive
            </button>
          </div>
        ) : (
          <div className="drives-grid">
            {drives.map((drive) => (
              <div key={drive.id} className={`drive-card ${drive.isDefault ? 'is-default' : ''}`}>
                <div className="drive-card-header">
                  <div className="drive-card-title">
                    <svg className="drive-card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12H16L14 15H10L8 12H2" />
                      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                    <span className="drive-card-name">{drive.name}</span>
                    {drive.isDefault && <span className="default-tag">Default</span>}
                  </div>
                  <div className="drive-card-actions-top">
                    <button
                      className="icon-btn"
                      onClick={() => openEditForm(drive)}
                      title="Edit"
                    >
                      <span style={{ fontSize: '15px' }}>✏️</span>
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => setConfirmDelete(drive)}
                      title="Delete"
                    >
                      <span style={{ fontSize: '15px' }}>🗑️</span>
                    </button>
                  </div>
                </div>

                <div className="status-indicators">
                  <div className={`status-badge ${drive.hasClientSecret ? 'active' : 'inactive'}`}>
                    <span className="icon">{drive.hasClientSecret ? '✓' : '✕'}</span>
                    Credentials
                  </div>
                  <div className={`status-badge ${drive.hasRefreshToken ? 'active' : 'inactive'}`}>
                    <span className="icon">{drive.hasRefreshToken ? '✓' : '✕'}</span>
                    Authenticated
                  </div>
                </div>

                <div className="drive-card-stats">
                  <span className="stat">{drive.fileCount} file{drive.fileCount !== 1 ? 's' : ''}</span>
                  <span className="stat-divider">·</span>
                  <span className="stat">Folder: {drive.folderId?.slice(0, 12)}…</span>
                </div>

                <div className="drive-card-actions">
                  {!drive.isDefault && (
                    <button
                      className="action-btn"
                      onClick={() => handleSetDefault(drive)}
                      title="Set as default drive"
                    >
                      Set Default
                    </button>
                  )}
                  <button 
                    className="action-btn"
                    onClick={() => handleAuth(drive)}
                    disabled={!drive.hasClientSecret}
                    title={!drive.hasClientSecret ? "Save credentials first" : "Authenticate with Google"}
                  >
                    Authenticate
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleSync(drive)}
                    disabled={syncingDriveId === drive.id || !drive.hasRefreshToken}
                    title={!drive.hasRefreshToken ? "Authenticate first" : "Sync Drive"}
                  >
                    {syncingDriveId === drive.id ? <><Spinner inline /> Syncing…</> : 'Sync'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete "{confirmDelete.name}"?</h3>
            <p>This action cannot be undone. All associated configuration will be permanently removed.</p>
            {confirmDelete.fileCount > 0 && (
              <p className="warning-text">
                ⚠️ This drive has {confirmDelete.fileCount} file{confirmDelete.fileCount !== 1 ? 's' : ''} associated. 
                You must sync and remove them first.
              </p>
            )}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="danger-button"
                onClick={() => handleDelete(confirmDelete)}
              >
                Delete Drive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
