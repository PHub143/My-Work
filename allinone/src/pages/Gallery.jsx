import React, { useState, useEffect } from 'react';
import './Gallery.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTags, setEditingTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (selectedImage) {
      setEditingTags(selectedImage.tags?.map(t => t.name) || []);
      setIsEditingTags(false);
    }
  }, [selectedImage]);

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
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        let url = `${API_URL}/files?includeType=image`;
        if (selectedTag) {
          url += `&tag=${encodeURIComponent(selectedTag)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch images from the server.');
        }
        const data = await response.json();
        setImages(data.files || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [selectedTag]);

  const handleUpdateTags = async () => {
    try {
      const response = await fetch(`${API_URL}/files/${selectedImage.driveFileId}/tags`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: editingTags }),
      });

      if (response.ok) {
        const data = await response.json();
        setImages(images.map(img => img.driveFileId === selectedImage.driveFileId ? data.file : img));
        setSelectedImage(data.file);
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

  const getHighResThumbnail = (url, size = 's1080') => {
    if (!url) return null;
    return url.replace(/=s\d+.*$/, `=${size}`);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setIsEditingTags(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };

    if (selectedImage) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage]);

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h1>Gallery</h1>
        <p>Your uploaded images on Google Drive</p>
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
      ) : images.length > 0 ? (
        <div className="gallery-grid">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="gallery-card"
              onClick={() => setSelectedImage(image)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedImage(image);
                }
              }}
            >
              {image.thumbnailLink ? (
                <div className="gallery-thumbnail-container">
                  <img 
                    src={getHighResThumbnail(image.thumbnailLink, 's1080')} 
                    alt={image.name} 
                    className="gallery-thumbnail" 
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="card-icon">🖼️</div>
              )}
              <div className="gallery-info">
                <span className="gallery-name">{image.name}</span>
                <div className="card-tags">
                  {image.tags?.slice(0, 2).map(tag => (
                    <span key={tag.id} className="card-tag">{tag.name}</span>
                  ))}
                  {image.tags?.length > 2 && <span className="card-tag">+{image.tags.length - 2}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-images">
          <p>No images found in your Drive.</p>
        </div>
      )}

      {selectedImage && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close">
              &times;
            </button>
            <div className="modal-layout">
              <div className="modal-visual">
                {selectedImage.thumbnailLink ? (
                  <img 
                    src={getHighResThumbnail(selectedImage.thumbnailLink, 's0')} 
                    alt={selectedImage.name} 
                    className="modal-image" 
                  />
                ) : (
                  <div className="modal-icon-placeholder">🖼️</div>
                )}
              </div>
              <div className="modal-info-panel">
                <div className="modal-header-section">
                  <h3>{selectedImage.name}</h3>
                  <p className="modal-meta">
                    {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB • {new Date(selectedImage.createdAt).toLocaleDateString()}
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
                      {selectedImage.tags?.length > 0 ? (
                        selectedImage.tags.map(tag => (
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
                    href={selectedImage.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="primary-action-btn"
                  >
                    View in Drive
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
