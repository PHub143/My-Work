import React, { useState, useEffect } from 'react';
import './Gallery.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`${API_URL}/files?includeType=image`);
        if (!response.ok) {
          throw new Error('Failed to fetch images from the server.');
        }
        const data = await response.json();
        // data is { files: [...], total: 10, limit: 50, offset: 0 }
        setImages(data.files || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  const getHighResThumbnail = (url, size = 's1080') => {
    if (!url) return null;
    return url.replace(/=s\d+$/, `=${size}`);
  };

  const closeModal = () => setSelectedImage(null);

  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h1>Gallery</h1>
        <p>Your uploaded images on Google Drive</p>
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
              <div className="gallery-info">
                <span className="gallery-name">{image.name}</span>
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
            {selectedImage.thumbnailLink ? (
              <img 
                src={getHighResThumbnail(selectedImage.thumbnailLink, 's0')} 
                alt={selectedImage.name} 
                className="modal-image" 
              />
            ) : (
              <div className="modal-icon-placeholder">🖼️</div>
            )}
            <div className="modal-caption">
              <h3>{selectedImage.name}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
