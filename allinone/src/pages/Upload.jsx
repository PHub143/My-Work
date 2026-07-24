import React, { useState, useRef, useCallback, useEffect } from 'react';
import './Upload.css';
import { API_URL, MAX_FILE_SIZE } from '../config';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { useDrive } from '../DriveContext';

/**
 * Formats bytes into a human-readable string (e.g., "1.24 GB").
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Detects a default tag based on the file's MIME type.
 */
function getAutoTag(mimeType) {
  const type = mimeType.split('/')[0];
  const subType = mimeType.split('/')[1];
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  if (subType === 'pdf') return 'pdf';
  if (type === 'text') return 'text';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('gzip')) return 'archive';
  if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint') ||
      mimeType.includes('spreadsheet') || mimeType.includes('presentation') || mimeType.includes('document')) return 'document';
  return '';
}

const Upload = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);
  const { token } = useAuth();
  const { activeDriveId, activeDrive } = useDrive();

  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tags`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags.map(t => t.name));
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const loadTags = async () => {
      try {
        const response = await fetch(`${API_URL}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok && !cancelled) {
          const data = await response.json();
          setAvailableTags(data.tags.map(t => t.name));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    loadTags();
    return () => { cancelled = true; };
  }, [token]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Client-side size check
      if (selectedFile.size > MAX_FILE_SIZE) {
        setStatus({ type: 'error', message: `File too large (${formatBytes(selectedFile.size)}). Maximum is ${formatBytes(MAX_FILE_SIZE)}.` });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setFile(selectedFile);
      setStatus({ type: '', message: '' });
      setUploadProgress(0);
      
      const autoTag = getAutoTag(selectedFile.type);
      if (autoTag && !tags.includes(autoTag)) {
        setTags(prev => [...prev, autoTag]);
      }
    }
  };

  const addTag = (tag) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag]);
    }
    setTagInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      setTotalBytes(0);
      setStatus({ type: 'error', message: 'Upload cancelled.' });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: '', message: '' });
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);

    // Include a tag still typed in the input but not yet committed to a pill,
    // so it isn't silently dropped when the user uploads without pressing Enter.
    const pendingTag = tagInput.trim().toLowerCase();
    const finalTags = pendingTag && !tags.includes(pendingTag)
      ? [...tags, pendingTag]
      : tags;
    if (finalTags !== tags) {
      setTags(finalTags);
      setTagInput('');
    }

    const formData = new FormData();
    // Important: Append fields before file for busboy sequential processing
    formData.append('tags', JSON.stringify(finalTags));
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        setUploadProgress(percent);
        setUploadedBytes(event.loaded);
        setTotalBytes(event.total);
      }
    });

    xhr.addEventListener('load', () => {
      xhrRef.current = null;
      setIsUploading(false);

      try {
        const data = JSON.parse(xhr.responseText);

        if (xhr.status === 200) {
          setStatus({ type: 'success', message: 'File uploaded successfully!' });
          setFile(null);
          setTags([]);
          setTagInput('');
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchAvailableTags();
        } else if (xhr.status === 412) {
          window.location.hash = '/settings';
        } else {
          setStatus({ type: 'error', message: data.message || 'Error uploading file.' });
        }
      } catch {
        setStatus({ type: 'error', message: 'Error parsing server response.' });
      }
    });

    xhr.addEventListener('error', () => {
      xhrRef.current = null;
      setIsUploading(false);
      setStatus({ type: 'error', message: 'Connection to server failed.' });
    });

    xhr.addEventListener('abort', () => {
      xhrRef.current = null;
      setIsUploading(false);
    });

    let uploadUrl = `${API_URL}/upload`;
    if (activeDriveId) {
      uploadUrl += `?driveConfigId=${activeDriveId}`;
    }
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const filteredSuggestions = availableTags.filter(
    t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
  );

  return (
    <div className="upload-container cosmic-page" style={{ '--page-accent': 'var(--cosmic-orange)' }}>
      <svg className="cosmic-star" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill="currentColor"/>
      </svg>
      <div className="cosmic-cube" />

      <div className="upload-content cosmic-content">
        <div className="upload-header">
          <span className="upload-badge">UP TO 10 GB</span>
          <h1>Send it <em>up.</em></h1>
          <p className="upload-subtitle">
            Auto-tagged · Auto-organized · Synced to <span>{activeDrive?.name || 'Google Drive'}</span>
          </p>
        </div>

        <div className="upload-card">
          <div className="upload-drop-grid">
            <div>
              <h2>{file ? file.name : 'Drag your stuff here.'}</h2>
              <p className="upload-drop-copy">
                {file
                  ? `${formatBytes(file.size)} · ready to upload`
                  : 'or click below · paste with ⌘V · accepts pretty much anything'}
              </p>
              <div className="file-input-wrapper">
                <label htmlFor="file-upload" className="custom-file-upload">
                  {file ? 'Change file' : 'Choose file'}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  ref={fileInputRef}
                />
                <button
                  type="button"
                  className="paste-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Paste ⌘V
                </button>
              </div>
            </div>
            <div className="upload-orbit" aria-hidden="true">
              <div>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <p className="upload-subtitle">
          {activeDrive
            ? `Uploading to ${activeDrive.name} — up to 10 GB`
            : 'Supports videos, images, documents & more — up to 10 GB'}
        </p>

        <div className="tags-section">
          <div className="tag-label">Tag with →</div>
          <div className="tags-container">
            {tags.map(tag => (
              <span key={tag} className="tag-pill">
                {tag}
                <button onClick={() => removeTag(tag)} className="tag-remove">&times;</button>
              </span>
            ))}
          </div>
          
          <div className="tag-input-wrapper">
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              className="tag-input"
              disabled={isUploading}
            />
            {showSuggestions && tagInput && (
              <div className="tag-suggestions">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map(tag => (
                    <div 
                      key={tag} 
                      className="tag-suggestion-item"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </div>
                  ))
                ) : (
                  <div className="tag-suggestion-item" onClick={() => addTag(tagInput)}>
                    Create new tag: "{tagInput}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isUploading && (
          <div className="upload-progress-section">
            <div className="upload-progress-track">
              <div 
                className="upload-progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="upload-progress-info">
              <span className="upload-progress-percent">{uploadProgress.toFixed(1)}%</span>
              <span className="upload-progress-bytes">
                {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
              </span>
            </div>
          </div>
        )}

        <div className="upload-actions">
          <button 
            className="upload-button" 
            onClick={handleUpload} 
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Spinner inline /> Uploading...
              </>
            ) : (
              'Upload Now'
            )}
          </button>
          {isUploading && (
            <button className="cancel-button" onClick={cancelUpload}>
              Cancel
            </button>
          )}
        </div>

        {status.message && (
          <div className={`status-message ${status.type}`} role="status" aria-live="polite">
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
