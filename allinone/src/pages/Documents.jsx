import React, { useState, useEffect } from 'react';
import './Documents.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Tag editing state
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTags, setEditingTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (selectedFile) {
      setEditingTags(selectedFile.tags?.map(t => t.name) || []);
      setIsEditingTags(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch(`${API_URL}/tags`);
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        let url = `${API_URL}/files?excludeType=image`;
        if (selectedTag) {
          url += `&tag=${encodeURIComponent(selectedTag)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch files from the server.');
        }
        const data = await response.json();
        setFiles(data.files || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [selectedTag]);

  const handleUpdateTags = async () => {
    try {
      const response = await fetch(`${API_URL}/files/${selectedFile.driveFileId}/tags`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: editingTags }),
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(files.map(f => f.driveFileId === selectedFile.driveFileId ? data.file : f));
        setSelectedFile(data.file);
        setIsEditingTags(false);
        const tagsRes = await fetch(`${API_URL}/tags`);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData.tags);
        }
      } else {
        alert('Failed to update tags');
      }
    } catch (err) {
      console.error('Error updating tags:', err);
      alert('An error occurred while updating tags');
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

  const closeModal = () => {
    setSelectedFile(null);
    setIsEditingTags(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };

    if (selectedFile) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFile]);

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('text/plain')) return '📄';
    return '📁';
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h1>Documents</h1>
        <p>Your uploaded files on Google Drive</p>
      </div>

      {tags.length > 0 && (
        <div className="filter-bar">
          <button 
            className={`filter-pill ${!selectedTag ? 'active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            All
          </button>
          {tags.map(tag => (
            <button 
              key={tag.id}
              className={`filter-pill ${selectedTag === tag.name ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <Spinner />
        </div>
      ) : files.length > 0 ? (
        <div className="documents-grid">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="document-card"
              onClick={() => setSelectedFile(file)}
            >
              <div className="document-icon">{getFileIcon(file.mimeType)}</div>
              <div className="document-info">
                <span className="document-name">{file.name}</span>
                <div className="card-tags">
                  {file.tags?.slice(0, 2).map(tag => (
                    <span key={tag.id} className="card-tag">{tag.name}</span>
                  ))}
                  {file.tags?.length > 2 && <span className="card-tag">+{file.tags.length - 2}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-documents">
          <p>No documents found in your Drive.</p>
        </div>
      )}

      {selectedFile && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content info-only" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close">
              &times;
            </button>
            <div className="modal-details-container">
              <div className="modal-icon-header">
                <span className="large-icon">{getFileIcon(selectedFile.mimeType)}</span>
                <h3>{selectedFile.name}</h3>
                <p className="modal-meta">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {new Date(selectedFile.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="modal-tags-section">
                <div className="modal-tags-header">
                  <h4>Tags</h4>
                  {!isEditingTags ? (
                    <button className="text-action-btn" onClick={() => setIsEditingTags(true)}>Edit</button>
                  ) : (
                    <div className="edit-actions">
                      <button className="text-action-btn save" onClick={handleUpdateTags}>Save</button>
                      <button className="text-action-btn" onClick={() => setIsEditingTags(false)}>Cancel</button>
                    </div>
                  )}
                </div>

                {isEditingTags ? (
                  <div className="modal-tag-editor">
                    <div className="active-tags">
                      {editingTags.map(tag => (
                        <span key={tag} className="edit-tag-pill">
                          {tag}
                          <button onClick={() => removeTag(tag)}>&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="tag-input-group">
                      <input 
                        type="text" 
                        placeholder="Add tag..." 
                        value={tagInput}
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
                    {selectedFile.tags?.length > 0 ? (
                      selectedFile.tags.map(tag => (
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
                  href={selectedFile.webViewLink} 
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
      )}
    </div>
  );
};

export default Documents;
