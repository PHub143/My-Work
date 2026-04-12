import React, { useState, useEffect } from 'react';
import './FileModal.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';

const FileModal = ({ file, onClose, onUpdateSuccess, onDeleteSuccess, isImage = false }) => {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTags, setEditingTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [showInfo, setShowInfo] = useState(true);
  const { token, user } = useAuth();
  
  const isVideo = file?.mimeType?.startsWith('video/');
  const isDoc = file?.mimeType?.includes('pdf') || 
                file?.mimeType?.includes('document') || 
                file?.mimeType?.includes('text/plain');

  const hasPreview = isImage || isVideo || isDoc;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditingTags) {
          setIsEditingTags(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingTags]);

  useEffect(() => {
    if (file) {
      setEditingTags(file.tags?.map(t => t.name) || []);
      setIsEditingTags(false);
      setError(null);
    }
  }, [file]);

  const handleUpdateTags = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/files/${file.driveFileId}/tags`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tags: editingTags }),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdateSuccess(data.file);
        setIsEditingTags(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update tags');
      }
    } catch (err) {
      console.error('Error updating tags:', err);
      setError('An error occurred while updating tags');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFile = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/files/${file.driveFileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onDeleteSuccess(file.driveFileId);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete file');
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('An error occurred while deleting the file');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !editingTags.includes(trimmed)) {
      setEditingTags([...editingTags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setEditingTags(editingTags.filter(t => t !== tagToRemove));
  };

  const getHighResThumbnail = (url, size = 's0') => {
    if (!url) return null;
    return url.replace(/=s\d+.*$/, `=${size}`);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('text/plain')) return '📄';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('image/')) return '🖼️';
    return '📁';
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getPreviewUrl = (url) => {
    if (!url) return null;
    // Google Drive /view links can be converted to /preview for a cleaner iframe view
    return url.replace(/\/view\?usp=drivesdk$/, '/preview');
  };

  if (!file) return null;

  const toggleInfo = () => setShowInfo(!showInfo);

  return (
    <div className={`modal-overlay ${isImage ? 'image-overlay' : ''}`} onClick={onClose}>
        <div 
          className={`modal-content ${hasPreview ? 'preview-mode' : 'info-only'}`} 
          onClick={(e) => e.stopPropagation()}
        >
          
          {hasPreview && (
            <div className="modal-preview-container" onClick={onClose}>
              {isImage ? (
                file.thumbnailLink ? (
                  <img 
                    src={getHighResThumbnail(file.thumbnailLink, 's0')} 
                    alt={file.name} 
                    className="modal-full-image" 
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="modal-icon-placeholder" onClick={(e) => e.stopPropagation()}>🖼️</div>
                )
              ) : (
                <div className="modal-document-viewer" onClick={(e) => e.stopPropagation()}>
                  <iframe 
                    src={getPreviewUrl(file.webViewLink)} 
                    title={file.name}
                    className="viewer-iframe"
                    frameBorder="0"
                    allow="autoplay"
                  />
                </div>
              )}
            </div>
          )}

        <div className="modal-controls">
          {hasPreview && (
            <button className={`control-btn toggle-info-btn ${showInfo ? 'active' : ''}`} onClick={toggleInfo} aria-label="Toggle info panel" title="Info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
          )}
          {user?.role === 'ADMIN' && (
            <button 
              className={`control-btn delete-btn ${isDeleting ? 'loading' : ''} ${showDeleteConfirm ? 'active' : ''}`} 
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} 
              disabled={isDeleting}
              aria-label="Delete file" 
              title="Delete File"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          )}
          <button className="control-btn close-btn" onClick={onClose} aria-label="Close modal" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className={`modal-info-panel ${hasPreview ? 'floating-panel' : ''} ${!showInfo && hasPreview ? 'hidden-panel' : ''}`}>
          {!hasPreview && (
            <div className="modal-icon-header">
              <span className="large-icon" role="img" aria-label="file icon">{getFileIcon(file.mimeType)}</span>
            </div>
          )}
          
          <div className="modal-header-section">
            <h3>{file.name}</h3>
            {showDeleteConfirm && (
              <div className="delete-confirm-overlay">
                <p>Delete this file permanently?</p>
                <div className="confirm-actions">
                  <button className="confirm-btn delete" onClick={handleDeleteFile} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button className="confirm-btn cancel" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <p className="modal-meta">
              {formatBytes(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="modal-tags-section">
            <div className="modal-tags-header">
              <h4>Tags</h4>
              {user?.role === 'ADMIN' && (
                !isEditingTags ? (
                  <button className="text-action-btn" onClick={() => setIsEditingTags(true)}>Edit</button>
                ) : (
                  <div className="edit-actions">
                    <button 
                      className="text-action-btn save" 
                      onClick={handleUpdateTags}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="text-action-btn" onClick={() => setIsEditingTags(false)} disabled={isSaving}>Cancel</button>
                  </div>
                )
              )}
            </div>

            {error && <p className="modal-error">{error}</p>}

            {isEditingTags ? (
              <div className="modal-tag-editor">
                <div className="active-tags">
                  {editingTags.map(tag => (
                    <span key={tag} className="edit-tag-pill">
                      {tag}
                      <button 
                        aria-label={`Remove tag ${tag}`} 
                        onClick={() => removeTag(tag)}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="tag-input-group">
                  <input 
                    type="text" 
                    placeholder="Add tag..." 
                    value={tagInput}
                    aria-label="New tag name"
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                  />
                  <button onClick={() => addTag(tagInput)}>Add</button>
                </div>
              </div>
            ) : (
              <div className="modal-tags-display">
                {file.tags?.length > 0 ? (
                  file.tags.map(tag => (
                    <span key={tag.id} className="modal-tag-pill">{tag.name}</span>
                  ))
                ) : (
                  <p className="no-tags-label">No tags</p>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer-actions">
            <a 
              href={file.webViewLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="primary-action-btn"
            >
              Open in Drive
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FileModal;
