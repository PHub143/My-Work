import React, { useState, useEffect } from 'react';
import './Gallery.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import FileModal from '../components/FileModal';
import { useAuth } from '../AuthContext';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/tags?includeType=image,video`, { headers });
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, [token]);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        let url = `${API_URL}/files?includeType=image,video`;
        if (selectedTag) {
          url += `&tag=${encodeURIComponent(selectedTag)}`;
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
  }, [selectedTag, token]);

  const handleUpdateSuccess = (updatedFile) => {
    setImages(prevImages => prevImages.map(img => 
      img.driveFileId === updatedFile.driveFileId ? updatedFile : img
    ));
    setSelectedImage(updatedFile);
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_URL}/tags?includeType=image,video`, { headers })
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .catch(err => console.error('Error refreshing tags:', err));
  };

  const handleDeleteSuccess = (driveFileId) => {
    setImages(prevImages => prevImages.filter(img => img.driveFileId !== driveFileId));
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`${API_URL}/tags?includeType=image,video`, { headers })
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

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h1>Gallery</h1>
        <p>Your uploaded images and videos on Google Drive</p>
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
