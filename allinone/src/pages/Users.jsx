import React, { useState, useEffect, useCallback } from 'react';
import './Users.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';
import { Cross, Plus } from '../components/ExamIcons.jsx';
import { ROLES, normalizeRoles, primaryRole } from '../utils/roles';

const createDefaultFormData = () => ({ name: '', email: '', password: '', roles: [ROLES.STUDENT] });

const roleLabels = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.STUDENT]: 'Student'
};

const modalTitleId = 'user-modal-title';
const nameInputId = 'user-name';
const emailInputId = 'user-email';
const passwordInputId = 'user-password';

// Stroke icons on the 20px grid (the shared exam icons cover plus and close).
const Pencil = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.5 4.5l3 3L7 16H4v-3z" />
  </svg>
);

const Trash = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 6h11M8 6V4h4v2M6 6l.6 9.5h6.8L14 6M8.5 9v4M11.5 9v4" />
  </svg>
);

const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const { token, user: currentUser } = useAuth();

  const formatLastActive = (u) => {
    if (!u.lastLoginAt) return 'Never logged in';
    return `Active ${new Date(u.lastLoginAt).toLocaleString()}`;
  };

  const getInitials = (u) => {
    const source = u.name || u.email || u.userId || '';
    const parts = source.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) || '';
    const second = parts[1]?.charAt(0) || '';
    return (first + second).toUpperCase() || '?';
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.map((u) => {
          const roles = normalizeRoles(u.roles || u.role);
          return { ...u, roles, role: primaryRole(roles) };
        }));
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        roles: normalizeRoles(user.roles || user.role)
      });
    } else {
      setEditingUser(null);
      setFormData(createDefaultFormData());
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const toggleRole = (role) => {
    setFormData((current) => {
      const currentRoles = normalizeRoles(current.roles);
      if (currentRoles.length === 1 && currentRoles.includes(role)) {
        return { ...current, roles: currentRoles };
      }

      const nextRoles = currentRoles.includes(role)
        ? currentRoles.filter((currentRole) => currentRole !== role)
        : [...currentRoles, role];

      return {
        ...current,
        roles: normalizeRoles(nextRoles)
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const method = editingUser ? 'PATCH' : 'POST';
    const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchUsers();
        handleCloseModal();
      } else {
        const data = await response.json();
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchUsers();
        setDeletingUserId(null);
      } else {
        const data = await response.json();
        alert(data.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="users-page">
      <div className="users-content">
        <div className="users-header">
          <div className="users-header-copy">
            <span className="as-label users-eyebrow">
              {users.length} account{users.length === 1 ? '' : 's'} · {users.filter(u => u.roles.includes(ROLES.ADMIN)).length} admin · {users.filter(u => u.roles.includes(ROLES.STUDENT)).length} students
            </span>
            <h1 className="as-display">Your crew.</h1>
            <p className="users-lead">Create, edit, and manage system accounts</p>
          </div>
          <button type="button" className="as-btn as-btn--primary add-user-btn" onClick={() => handleOpenModal()}>
            <Plus />
            Invite a friend
          </button>
        </div>

        {error && (
          <div className="as-alert as-alert--error" role="alert">
            <svg className="as-alert__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
            </svg>
            <span>
              <span className="as-visually-hidden">Error: </span>
              {error}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <Spinner />
          </div>
        ) : (
          <div className="users-card-grid">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              const displayName = u.name || 'Unnamed User';
              return (
                <article key={u.id} className="user-card">
                  <div className="user-card-head">
                    <span className="user-avatar" aria-hidden="true">{getInitials(u)}</span>
                    <div className="user-card-id">
                      <div className="user-card-name-row">
                        <h2 className="user-card-name">{displayName}</h2>
                        {isSelf && <span className="user-you-tag">You</span>}
                      </div>
                      <span className="user-card-email">{u.email || u.userId}</span>
                    </div>
                  </div>
                  <div className="user-card-roles" role="group" aria-label="User roles">
                    {u.roles.map((role) => (
                      <span key={role} className={`user-role ${role === ROLES.ADMIN ? 'user-role--admin' : 'user-role--student'}`}>
                        {roleLabels[role] || role}
                      </span>
                    ))}
                  </div>
                  <span className="user-card-active" title={`Joined ${new Date(u.createdAt).toLocaleDateString()}`}>
                    {formatLastActive(u)}
                  </span>
                  <div className="user-card-actions">
                    {deletingUserId === u.id ? (
                      <>
                        <button
                          type="button"
                          className="user-action user-action--danger"
                          aria-label={`Confirm deleting ${displayName}`}
                          onClick={() => handleDelete(u.id)}
                        >
                          Confirm
                        </button>
                        <button type="button" className="user-action" onClick={() => setDeletingUserId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="user-action"
                          aria-label={`Edit ${displayName}`}
                          onClick={() => handleOpenModal(u)}
                        >
                          <Pencil />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="user-action user-action--danger-outline"
                          aria-label={`Delete ${displayName}`}
                          onClick={() => {
                            if (isSelf) {
                              alert("You cannot delete your own account.");
                              return;
                            }
                            setDeletingUserId(u.id);
                          }}
                          disabled={isSelf}
                        >
                          <Trash />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="user-modal-overlay" onClick={handleCloseModal}>
          <div
            className="user-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="as-title" id={modalTitleId}>{editingUser ? 'Edit user' : 'Create new user'}</h2>
              <button type="button" className="close-modal" onClick={handleCloseModal} aria-label="Close user dialog">
                <Cross />
              </button>
            </div>

            <form className="user-modal-form" onSubmit={handleSubmit}>
              <div className="as-field">
                <label className="as-field__label" htmlFor={nameInputId}>Full name</label>
                <input
                  id={nameInputId}
                  className="as-field__input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor={emailInputId}>Email address{editingUser ? ' (optional)' : ''}</label>
                <input
                  id={emailInputId}
                  className="as-field__input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required={!editingUser}
                  placeholder="john@example.com"
                />
              </div>
              <div className="as-field">
                <label className="as-field__label" htmlFor={passwordInputId}>{editingUser ? 'New password (leave blank to keep current)' : 'Password'}</label>
                <input
                  id={passwordInputId}
                  className="as-field__input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Password'}
                />
              </div>
              <fieldset className="role-checklist">
                <legend>Roles</legend>
                {[ROLES.ADMIN, ROLES.STUDENT].map((role) => {
                  const selectedRoles = normalizeRoles(formData.roles);
                  const isChecked = selectedRoles.includes(role);
                  const isOnlySelectedRole = selectedRoles.length === 1 && isChecked;

                  return (
                    <label key={role} className="role-check">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isOnlySelectedRole}
                        onChange={() => toggleRole(role)}
                      />
                      <span>{roleLabels[role]}</span>
                    </label>
                  );
                })}
                <span className="role-hint">An account always keeps at least one role.</span>
              </fieldset>

              <div className="modal-actions">
                <button type="button" className="as-btn as-btn--secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="as-btn as-btn--primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editingUser ? 'Update user' : 'Create user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
