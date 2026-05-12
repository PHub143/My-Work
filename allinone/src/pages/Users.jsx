import React, { useState, useEffect, useCallback } from 'react';
import './Users.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  
  const { token, user: currentUser } = useAuth();

  const getInitials = (u) => {
    const source = u.name || u.email || '';
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
        setUsers(data.users);
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
      setFormData({ name: user.name || '', email: user.email, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'USER' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
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
    <div className="users-page cosmic-page" style={{ '--page-accent': 'var(--cosmic-cyan)' }}>
      <svg className="cosmic-star" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill="currentColor"/>
      </svg>
      <div className="cosmic-cube" />

      <div className="users-content cosmic-content">
        <div className="users-header">
          <div>
            <div className="users-kicker">
              <span className="users-badge">{users.length} ACCOUNT{users.length === 1 ? '' : 'S'}</span>
              <span className="users-meta">· {users.filter(u => u.role === 'ADMIN').length} admin · {users.filter(u => u.role !== 'ADMIN').length} users</span>
            </div>
            <h1>Your <em>crew.</em></h1>
            <p>Create, edit, and manage system accounts</p>
          </div>
          <button className="add-user-btn" onClick={() => handleOpenModal()}>
            <span>+</span> Invite a friend
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {isLoading ? (
          <div className="loading-state">
            <Spinner />
          </div>
        ) : (
          <div className="users-card-grid">
            {users.map((u, i) => (
              <article key={u.id} className="user-polaroid" style={{ '--user-index': i }}>
                <div className="user-tape" />
                <div className="user-portrait">
                  <span>{getInitials(u)}</span>
                  {u.id === currentUser.id && <strong>YOU</strong>}
                </div>
                <div className="user-polaroid-name">{u.name || 'Unnamed User'}</div>
                <div className="user-polaroid-email">{u.email}</div>
                <div className="user-polaroid-footer">
                  <span className={`role-badge ${u.role === 'ADMIN' ? 'admin' : 'user'}`}>
                    {u.role}
                  </span>
                  <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="user-card-actions">
                  {deletingUserId === u.id ? (
                    <div className="inline-confirm">
                      <button className="confirm-btn delete" onClick={() => handleDelete(u.id)}>Confirm</button>
                      <button className="confirm-btn cancel" onClick={() => setDeletingUserId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="actions-wrapper">
                      <button className="action-icon-btn edit" onClick={() => handleOpenModal(u)} title="Edit">
                        <span>✏️</span>
                      </button>
                      <button
                        className="action-icon-btn delete"
                        onClick={() => {
                          if (u.id === currentUser.id) {
                            alert("You cannot delete your own account.");
                            return;
                          }
                          setDeletingUserId(u.id);
                        }}
                        title="Delete"
                        disabled={u.id === currentUser.id}
                      >
                        <span>🗑️</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="user-modal-overlay" onClick={handleCloseModal}>
          <div className="user-modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button className="close-modal" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-group">
                <label>{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Password'}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
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
