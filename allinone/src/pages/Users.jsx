import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
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
  };

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
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1>User Management</h1>
          <p>Create, edit, and manage system accounts</p>
        </div>
        <button className="add-user-btn" onClick={() => handleOpenModal()}>
          <span>+</span> Add User
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="loading-state">
          <Spinner />
        </div>
      ) : (
        <div className="users-table-container glass">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th className="actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-name-cell">
                      <div className="avatar-small">
                        {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                      </div>
                      {u.name || <span className="unnamed">Unnamed User</span>}
                      {u.id === currentUser.id && <span className="self-tag">(You)</span>}
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role === 'ADMIN' ? 'admin' : 'user'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    {deletingUserId === u.id ? (
                      <div className="inline-confirm">
                        <button className="confirm-btn delete" onClick={() => handleDelete(u.id)}>Confirm</button>
                        <button className="confirm-btn cancel" onClick={() => setDeletingUserId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="actions-wrapper">
                        <button className="action-icon-btn edit" onClick={() => handleOpenModal(u)} title="Edit">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
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
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
