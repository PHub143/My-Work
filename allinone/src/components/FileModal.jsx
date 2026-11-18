import React, { useCallback, useState, useEffect } from 'react';
import './FileModal.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../utils/roles';
import {
  CloseIcon,
  CrossCircleIcon,
  DocIcon,
  DownloadIcon,
  ImageIcon,
  InfoIcon,
  TrashIcon,
  WarnIcon
} from './DriveIcons';

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
  const canAdmin = isAdmin(user);

  const isVideo = file?.mimeType?.startsWith('video/');
  const isDoc = file?.mimeType?.includes('pdf') ||
                file?.mimeType?.includes('document') ||
                file?.mimeType?.includes('text/plain');

  const hasPreview = isImage || isVideo || isDoc;

  const handleClose = useCallback(() => {
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditingTags) {
          setIsEditingTags(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isEditingTags]);

  useEffect(() => {
    setShowDeleteConfirm(false);

    if (file) {
      setEditingTags(file.tags?.map(t => t.name) || []);
      setIsEditingTags(false);
      setError(null);
    }
  }, [file]);

  useEffect(() => {
    if (!canAdmin) {
      setIsEditingTags(false);
      setShowDeleteConfirm(false);
    }
  }, [canAdmin]);

  const handleUpdateTags = async () => {
    if (!canAdmin) return;

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
    if (!canAdmin) return;

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
        handleClose();
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

  // Google Drive direct-download link. Forces a file download via
  // Content-Disposition rather than opening the in-browser viewer.
  const getDownloadUrl = (driveFileId) => {
    if (!driveFileId) return null;
    return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  };

  if (!file) return null;

  const toggleInfo = () => setShowInfo(!showInfo);
  const panelHidden = hasPreview && !showInfo;

  return (
    <div className={`fm-overlay${isImage ? ' is-image' : ''}`} onClick={handleClose}>
      <div
        className={`fm-content ${hasPreview ? 'has-preview' : 'info-only'}`}
        role="dialog"
        aria-modal="true"
        aria-label={file.name}
        onClick={(e) => e.stopPropagation()}
      >

        {hasPreview && (
          <div className="fm-preview" onClick={handleClose}>
            {isImage ? (
              file.thumbnailLink ? (
                <img
                  src={getHighResThumbnail(file.thumbnailLink, 's0')}
                  alt={file.name}
                  className="fm-image"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="fm-placeholder"
                  role="img"
                  aria-label="No preview"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ImageIcon size={40} stroke={1.25} />
                  <span>No preview</span>
                </div>
              )
            ) : (
              <div className="fm-doc-viewer" onClick={(e) => e.stopPropagation()}>
                <iframe
                  src={getPreviewUrl(file.webViewLink)}
                  title={file.name}
                  className="fm-iframe"
                  frameBorder="0"
                  allow="autoplay"
                />
              </div>
            )}
          </div>
        )}

        <div className={`fm-side${panelHidden ? ' is-collapsed' : ''}`}>
          <div className="fm-controls">
            {hasPreview && (
              <button
                type="button"
                className="fm-btn"
                aria-pressed={showInfo}
                onClick={toggleInfo}
                aria-label="Toggle info panel"
                title="Info"
              >
                <InfoIcon />
              </button>
            )}
            <a
              className="fm-btn"
              href={getDownloadUrl(file.driveFileId)}
              download={file.name}
              aria-label="Download file"
              title="Download"
            >
              <DownloadIcon />
            </a>
            {canAdmin && (
              <button
                type="button"
                className="fm-btn fm-btn--delete"
                aria-pressed={showDeleteConfirm}
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                disabled={isDeleting}
                aria-label="Delete file"
                title="Delete file"
              >
                <TrashIcon />
              </button>
            )}
            <button type="button" className="fm-btn" onClick={handleClose} aria-label="Close" title="Close">
              <CloseIcon />
            </button>
          </div>

          <div className={`fm-info${hasPreview ? ' is-floating' : ''}${panelHidden ? ' is-hidden' : ''}`}>
            {!hasPreview && (
              <div className="fm-icon" aria-hidden="true">
                <DocIcon size={28} stroke={1.25} />
              </div>
            )}

            <div className="fm-title-block">
              <h2>{file.name}</h2>
              <p className="fm-meta">
                {formatBytes(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>

            {showDeleteConfirm && (
              <div className="fm-confirm" role="alertdialog" aria-label="Delete this file permanently?">
                <p>
                  <WarnIcon />
                  Delete this file permanently?
                </p>
                <div className="fm-confirm-actions">
                  <button type="button" className="fm-confirm-delete" onClick={handleDeleteFile} disabled={isDeleting}>
                    {isDeleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button type="button" className="fm-confirm-cancel" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <section className="fm-tags" aria-label="Tags">
              <div className="fm-tags-head">
                <h3>Tags</h3>
                {canAdmin && (
                  !isEditingTags ? (
                    <button type="button" className="fm-text-btn" onClick={() => setIsEditingTags(true)}>Edit</button>
                  ) : (
                    <div className="fm-edit-actions">
                      <button
                        type="button"
                        className="fm-text-btn is-save"
                        onClick={handleUpdateTags}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="fm-text-btn" onClick={() => setIsEditingTags(false)} disabled={isSaving}>Cancel</button>
                    </div>
                  )
                )}
              </div>

              {error && (
                <div className="as-alert as-alert--error" role="alert">
                  <span className="as-alert__icon"><CrossCircleIcon /></span>
                  <span>
                    <span className="as-visually-hidden">Error: </span>
                    {error}
                  </span>
                </div>
              )}

              {canAdmin && isEditingTags ? (
                <div className="fm-tag-editor">
                  <div className="fm-tag-list">
                    {editingTags.map(tag => (
                      <span key={tag} className="fm-tag is-editable">
                        {tag}
                        <button
                          type="button"
                          aria-label={`Remove tag ${tag}`}
                          onClick={() => removeTag(tag)}
                        >
                          <CloseIcon size={16} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="fm-tag-input">
                    <input
                      type="text"
                      placeholder="Add tag…"
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
                    <button type="button" onClick={() => addTag(tagInput)}>Add</button>
                  </div>
                </div>
              ) : (
                <div className="fm-tag-list">
                  {file.tags?.length > 0 ? (
                    file.tags.map(tag => (
                      <span key={tag.id} className="fm-tag">{tag.name}</span>
                    ))
                  ) : (
                    <p className="fm-no-tags">No tags</p>
                  )}
                </div>
              )}
            </section>

            <div className="fm-actions">
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="fm-action fm-action--primary"
              >
                Open in Drive
              </a>
              <a
                href={getDownloadUrl(file.driveFileId)}
                download={file.name}
                className="fm-action"
              >
                <DownloadIcon />
                Download
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FileModal;
