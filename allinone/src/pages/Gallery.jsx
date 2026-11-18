import React, { useState, useEffect, useMemo } from 'react';
import './Documents.css';
import './Gallery.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import FileModal from '../components/FileModal';
import TopBar from '../components/TopBar';
import { CrossCircleIcon, ImageIcon, PlayIcon } from '../components/DriveIcons';
import { useAuth } from '../AuthContext';
import { useDrive } from '../DriveContext';

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const isVideo = (file) => (file.mimeType || '').startsWith('video/');

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('medium');
  const { token } = useAuth();
  const { activeDriveId, activeDrive } = useDrive();

  const refreshTags = () => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let url = `${API_URL}/tags?includeType=image,video`;
    if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;
    fetch(url, { headers })
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch((err) => console.error('Error refreshing tags:', err));
  };

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
        if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
        if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;

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
    setImages((prev) => prev.map((img) => (img.driveFileId === updatedFile.driveFileId ? updatedFile : img)));
    setSelectedImage(updatedFile);
    refreshTags();
  };

  const handleDeleteSuccess = (driveFileId) => {
    setImages((prev) => prev.filter((img) => img.driveFileId !== driveFileId));
    refreshTags();
  };

  const getHighResThumbnail = (url, thumbSize = 's1080') => {
    if (!url) return null;
    return url.replace(/=s\d+.*$/, `=${thumbSize}`);
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

  useEffect(() => setSelectedTag(null), [activeDriveId]);

  const totalSize = images.reduce((sum, image) => sum + (image.size ? Number(image.size) : 0), 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => (img.name || '').toLowerCase().includes(q));
  }, [images, query]);

  return (
    <>
      <TopBar
        value={query}
        onChange={setQuery}
        placeholder="Search images and videos…"
        action={{ label: 'Upload', to: '/upload' }}
      />

      <div className="drive-page gallery-page">
        <div className="drive-head">
          <div className="drive-head-copy">
            <h1 className="as-headline">Gallery</h1>
            <p>
              {images.length} item{images.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
              {activeDrive ? ` on ${activeDrive.name}` : ''}
            </p>
          </div>

          <div className="drive-head-actions">
            <div className="drive-seg gal-size" role="group" aria-label="Thumbnail size">
              <button type="button" aria-pressed={size === 'medium'} onClick={() => setSize('medium')}>
                Medium
              </button>
              <button type="button" aria-pressed={size === 'large'} onClick={() => setSize('large')}>
                Large
              </button>
            </div>
          </div>
        </div>

        <div className="drive-chips" role="group" aria-label="Filter by tag">
          <button
            type="button"
            className="drive-chip"
            aria-pressed={selectedTag === null}
            onClick={() => setSelectedTag(null)}
          >
            All <span className="drive-chip-count">{images.length}</span>
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id || tag.name}
              type="button"
              className="drive-chip"
              aria-pressed={selectedTag === tag.name}
              onClick={() => setSelectedTag(tag.name)}
            >
              {tag.name}
              {tag.count ? <span className="drive-chip-count">{tag.count}</span> : null}
            </button>
          ))}
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

        {isLoading ? (
          <div className="doc-loading"><Spinner /></div>
        ) : visible.length === 0 ? (
          <div className="doc-empty">
            <p>{query ? `Nothing matches “${query}”.` : 'No images or videos in this drive yet.'}</p>
            {query && (
              <button type="button" className="as-btn as-btn--secondary" onClick={() => setQuery('')}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className={`gal-grid is-${size}`}>
            {visible.map((image) => (
              <figure
                key={image.id}
                className="gal-item"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedImage(image)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedImage(image);
                  }
                }}
              >
                <div className="gal-frame">
                  {image.thumbnailLink ? (
                    <img
                      src={getHighResThumbnail(image.thumbnailLink, size === 'large' ? 's1600' : 's1080')}
                      alt={image.name}
                      loading="lazy"
                    />
                  ) : (
                    <span className="gal-placeholder">
                      {isVideo(image) ? <PlayIcon size={32} stroke={1.25} /> : <ImageIcon size={32} stroke={1.25} />}
                      No preview
                    </span>
                  )}
                  {isVideo(image) && (
                    <span className="gal-badge">
                      <PlayIcon size={14} stroke={1.75} />
                      Video
                    </span>
                  )}
                </div>

                <figcaption className="gal-caption">
                  <span className="gal-name">{image.name}</span>
                  <span className="gal-meta">
                    {image.tags?.[0]?.name ? `${image.tags[0].name} · ` : ''}
                    {formatBytes(image.size)} · {formatDate(image.modifiedTime || image.createdTime)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <FileModal
        file={selectedImage}
        onClose={closeModal}
        onUpdateSuccess={handleUpdateSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        isImage
      />
    </>
  );
};

export default Gallery;
