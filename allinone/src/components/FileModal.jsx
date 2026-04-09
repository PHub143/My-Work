import React, { useState, useEffect } from 'react';
import './FileModal.css';
import { API_URL } from '../config';

const FileModal = ({ file, onClose, onUpdateSuccess, isImage = false }) => {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTags, setEditingTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

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

  const getHighResThumbnail = (url, size = 's1080') => {
    if (!url) return null;
    return url.replace(/=s\d+.*$/, `=${size}`);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('text/plain')) return '📄';
    return '📁';
  };

  if (!file) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${!isImage ? 'info-only' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          &times;
        </button>
        
        <div className={isImage ? "modal-layout" : "modal-details-container"}>
          {isImage && (
            <div className="modal-visual">
              {file.thumbnailLink ? (
                <img 
                  src={getHighResThumbnail(file.thumbnailLink, 's0')} 
                  alt={file.name} 
                  className="modal-image" 
                />
              ) : (
                <div className="modal-icon-placeholder">🖼️</div>
              )}
            </div>
          )}

          <div className={isImage ? "modal-info-panel" : "modal-details-content"}>
            {!isImage && (
              <div className="modal-icon-header">
                <span className="large-icon" role="img" aria-label="file icon">{getFileIcon(file.mimeType)}</span>
              </div>
            )}
            
            <div className="modal-header-section">
              <h3>{file.name}</h3>
              <p className="modal-meta">
                {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'} • {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="modal-tags-section">
              <div className="modal-tags-header">
                <h4>Tags</h4>
                {!isEditingTags ? (
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
                {isImage ? 'View in Drive' : 'Open in Drive'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileModal;
