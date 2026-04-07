import React, { useState, useEffect } from 'react';
import './Gallery.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
            <div key={image.id} className="gallery-item">
              <a href={image.webViewLink} target="_blank" rel="noopener noreferrer">
                {/* Use webViewLink for external viewing or potentially direct link if proxy is available */}
                {/* For now we show a stylized card as we don't have direct image proxy URLs from Drive easily available for <img> src without API keys or auth in URL */}
                <div className="image-placeholder">
                  <span className="image-icon">🖼️</span>
                  <span className="image-name">{image.name}</span>
                </div>
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-images">
          <p>No images found in your Drive.</p>
        </div>
      )}
    </div>
  );
};

export default Gallery;
