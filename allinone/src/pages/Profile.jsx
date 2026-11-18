import React, { useState, useEffect, useCallback } from 'react';
import './Profile.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { Check, Cross } from '../components/ExamIcons.jsx';

// What each theme is for, shown under its name in the Appearance card.
const THEME_NOTES = {
  light: 'Light, cool grey. The default.',
  sepia: 'Warm paper, for very long reading sessions.',
  dark: 'Dark, for night study.',
};

const Profile = () => {
  const { token, logout } = useAuth();
  const { theme, setTheme, themes } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({ userId: '', name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile({
          userId: data.user.userId || '',
          name: data.user.name || '',
          email: data.user.email || ''
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to load your profile.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: profile.name, email: profile.email })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated.' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          password: passwordForm.password
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password updated.' });
        setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection to server failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-content"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-hero">
          <span className="as-tag profile-userid-badge">{profile.userId}</span>
          <h1 className="as-display profile-hero-title">Your profile.</h1>
          <p className="profile-hero-lead">Add your name and email, or reset your password.</p>
        </div>

        {message.text && (
          <div className={`profile-message profile-message--${message.type}`} role="status">
            {message.type === 'success' ? <Check /> : <Cross />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="profile-grid">
          <form onSubmit={handleSaveProfile} className="profile-form-card">
            <h2 className="as-title profile-card-title">Account info</h2>
            <div className="profile-form-fields">
              <div className="as-field">
                <label className="as-field__label" htmlFor="profile-name">Full name</label>
                <input
                  id="profile-name"
                  className="as-field__input"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleProfileChange}
                  placeholder="Your name"
                />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="profile-email">Email address</label>
                <input
                  id="profile-email"
                  className="as-field__input"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="profile-form-btn-row">
              <button type="submit" className="as-btn as-btn--primary profile-btn" disabled={isSaving}>
                {isSaving ? <><Spinner inline /> Saving…</> : 'Save changes'}
              </button>
            </div>
          </form>

          <form onSubmit={handleSavePassword} className="profile-form-card">
            <h2 className="as-title profile-card-title">Change password</h2>
            <div className="profile-form-fields">
              <div className="as-field">
                <label className="as-field__label" htmlFor="profile-current-password">Current password</label>
                <input
                  id="profile-current-password"
                  className="as-field__input"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="profile-new-password">New password</label>
                <input
                  id="profile-new-password"
                  className="as-field__input"
                  name="password"
                  type="password"
                  value={passwordForm.password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor="profile-confirm-password">Confirm new password</label>
                <input
                  id="profile-confirm-password"
                  className="as-field__input"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <div className="profile-form-btn-row">
              <button type="submit" className="as-btn as-btn--primary profile-btn" disabled={isSaving}>
                {isSaving ? <><Spinner inline /> Saving…</> : 'Update password'}
              </button>
            </div>
          </form>

          <section className="profile-form-card" aria-labelledby="profile-appearance-title">
            <h2 className="as-title profile-card-title" id="profile-appearance-title">Appearance</h2>
            <div className="profile-themes" role="radiogroup" aria-labelledby="profile-appearance-title">
              {themes.map((entry) => {
                const selected = entry.id === theme;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`profile-theme${selected ? ' is-selected' : ''}`}
                    onClick={() => setTheme(entry.id)}
                  >
                    <span className="profile-theme-copy">
                      <span className="profile-theme-name">{entry.label}</span>
                      <span className="profile-theme-note">{THEME_NOTES[entry.id]}</span>
                    </span>
                    {selected && (
                      <span className="profile-theme-check">
                        <Check />
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="profile-form-card" aria-labelledby="profile-session-title">
            <h2 className="as-title profile-card-title" id="profile-session-title">Session</h2>
            <p className="profile-session-note">Sign out of Allinone on this device.</p>
            <div className="profile-form-btn-row">
              <button type="button" className="as-btn as-btn--secondary profile-btn" onClick={logout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
