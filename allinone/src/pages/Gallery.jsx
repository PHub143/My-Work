import React, { useState, useEffect } from 'react';
import './Gallery.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import FileModal from '../components/FileModal';
import { useAuth } from '../AuthContext';
import { useDrive } from '../DriveContext';

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const { token } = useAuth();
  const { activeDriveId, activeDrive } = useDrive();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let url = `${API_URL}/tags?includeType=image,video`;
        if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;

        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, [token, activeDriveId]);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let url = `${API_URL}/files?includeType=image,video`;
        if (selectedTag) {
          url += `&tag=${encodeURIComponent(selectedTag)}`;
        }
        if (activeDriveId) {
          url += `&driveConfigId=${activeDriveId}`;
        }

        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(url, { headers });
        
        if (response.status === 412) {
          window.location.hash = '/settings';
          return;
        }

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
  }, [selectedTag, token, activeDriveId]);

  const handleUpdateSuccess = (updatedFile) => {
    setImages(prevImages => prevImages.map(img => 
      img.driveFileId === updatedFile.driveFileId ? updatedFile : img
    ));
    setSelectedImage(updatedFile);
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_URL}/tags?includeType=image,video`;
    if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;

    fetch(url, { headers })
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .catch(err => console.error('Error refreshing tags:', err));
  };

  const handleDeleteSuccess = (driveFileId) => {
    setImages(prevImages => prevImages.filter(img => img.driveFileId !== driveFileId));
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_URL}/tags?includeType=image,video`;
    if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;

    fetch(url, { headers })
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .catch(err => console.error('Error refreshing tags:', err));
  };

  const getHighResThumbnail = (url, size = 's1080') => {
    if (!url) return null;
    return url.replace(/=s\d+.*$/, `=${size}`);
  };

  const closeModal = () => setSelectedImage(null);

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

  // Reset tag filter when drive changes
  useEffect(() => {
    setSelectedTag(null);
  }, [activeDriveId]);

  const totalSize = images.reduce((sum, image) => sum + (image.size ? Number(image.size) : 0), 0);

  return (
    <div
      className="gallery-container cosmic-page"
      style={{
        '--page-accent': 'var(--cosmic-pink)',
        '--cosmic-orb-top': '4px',
        '--cosmic-orb-right': '60px',
        '--cosmic-star-top': '124px',
        '--cosmic-star-left': '45%',
        '--cosmic-star-size': '40px',
        '--cosmic-cube-top': '44px',
        '--cosmic-cube-left': '240px',
        '--cosmic-cube-size': '24px',
      }}
    >
      <svg className="cosmic-star" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill="currentColor"/>
      </svg>
      <div className="cosmic-cube" />

      <div className="gallery-content cosmic-content">
        <div className="gallery-header">
          <div className="gallery-title-block">
            <div className="gallery-kicker">
              <span className="gallery-badge">VOL. 04</span>
              <span className="gallery-meta">· {images.length} entries · {activeDrive?.name || 'summer 2026'}</span>
            </div>
            <h1>
              The <span className="gallery-title-word">
                gallery
                <svg className="gallery-title-swoop" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 12 Q 50 2, 100 8 T 198 6" />
                </svg>
              </span>
              <span className="gallery-title-line">of <em>everything</em>.</span>
            </h1>
            <p>
              {activeDrive
                ? `Images and videos on ${activeDrive.name}`
                : 'Your uploaded images and videos on Google Drive'}
            </p>
          </div>
          <div className="gallery-storage-card">
            <span>STORAGE</span>
            <strong>{formatBytes(totalSize)}</strong>
            <div className="gallery-storage-track">
              <div style={{ width: `${Math.min(100, Math.max(12, images.length * 8))}%` }} />
            </div>
          </div>
        </div>

        <div className="filter-bar">
          <button 
            className={`filter-pill ${!selectedTag ? 'active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            ★ All · {images.length}
          </button>
          {tags.map(tag => (
            <button 
              key={tag.id}
              className={`filter-pill ${selectedTag === tag.name ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag.name)}
            >
              #{tag.name}
            </button>
          ))}
        </div>

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
                <span className="gallery-tag-chip">#{image.tags?.[0]?.name || 'misc'}</span>
                <div className="gallery-info">
                  <span className="gallery-name">{image.name}</span>
                  <span className="gallery-file-meta">{formatBytes(image.size)} · {formatDate(image.modifiedTime || image.createdTime)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-images">
            <p>No images found in your Drive.</p>
          </div>
        )}
      </div>

      <FileModal 
        file={selectedImage} 
        onClose={closeModal} 
        onUpdateSuccess={handleUpdateSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        isImage={true}
      />
    </div>
  );
};

export default Gallery;
