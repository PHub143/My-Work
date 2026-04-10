import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Settings.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Settings = () => {
  const location = useLocation();
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    folderId: ''
  });
  const [status, setStatus] = useState({ hasClientSecret: false, hasRefreshToken: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (location.state?.message) {
      setMessage({ type: 'success', text: location.state.message });
      // Clear state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
    fetchConfig();
  }, [location]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/config/drive`);
      if (response.ok) {
        const data = await response.json();
        const driveConfig = data.config;
        if (driveConfig) {
          setConfig({
            clientId: driveConfig.clientId || '',
            clientSecret: '', // Don't populate secret on client side
            redirectUri: driveConfig.redirectUri || '',
            folderId: driveConfig.folderId || ''
          });
          setStatus({
            hasClientSecret: driveConfig.hasClientSecret || false,
            hasRefreshToken: driveConfig.hasRefreshToken || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/config/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully.' });
        fetchConfig(); // Refresh to update status flags (e.g., hasClientSecret)
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/google/url`);
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

  if (isLoading) {
    return <div className="settings-container"><Spinner /></div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h1>Google Drive Settings</h1>
        
        <div className="status-indicators">
          <div className={`status-badge ${status.hasClientSecret ? 'active' : 'inactive'}`}>
            <span className="icon">{status.hasClientSecret ? '✓' : '✕'}</span>
            Client Credentials
          </div>
          <div className={`status-badge ${status.hasRefreshToken ? 'active' : 'inactive'}`}>
            <span className="icon">{status.hasRefreshToken ? '✓' : '✕'}</span>
            Drive Authenticated
          </div>
        </div>

        {message.text && (
          <div className={`status-message ${message.type}`} role="status">
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label htmlFor="clientId">Client ID</label>
            <input
              type="text"
              id="clientId"
              name="clientId"
              value={config.clientId}
              onChange={handleChange}
              placeholder="Enter Google Client ID"
            />
          </div>

          <div className="form-group">
            <label htmlFor="clientSecret">Client Secret</label>
            <input
              type="password"
              id="clientSecret"
              name="clientSecret"
              value={config.clientSecret}
              onChange={handleChange}
              placeholder={status.hasClientSecret ? "•••••••• (Leave blank to keep existing)" : "Enter Google Client Secret"}
            />
          </div>

          <div className="form-group">
            <label htmlFor="redirectUri">Redirect URI</label>
            <input
              type="text"
              id="redirectUri"
              name="redirectUri"
              value={config.redirectUri}
              onChange={handleChange}
              placeholder="e.g., http://localhost:5173/oauth/callback"
            />
          </div>

          <div className="form-group">
            <label htmlFor="folderId">Drive Folder ID</label>
            <input
              type="text"
              id="folderId"
              name="folderId"
              value={config.folderId}
              onChange={handleChange}
              placeholder="Enter Google Drive Folder ID"
            />
          </div>

          <div className="button-group">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? <><Spinner inline /> Saving...</> : 'Save Settings'}
            </button>
            
            <button 
              type="button" 
              className="secondary-button" 
              onClick={handleAuth}
              disabled={!status.hasClientSecret}
              title={!status.hasClientSecret ? "Save Client ID and Secret first" : "Authenticate with Google"}
            >
              Authenticate with Google Drive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
