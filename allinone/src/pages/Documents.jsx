import React, { useState, useEffect } from 'react';
import './Documents.css';
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

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const { token } = useAuth();
  const { activeDriveId, activeDrive } = useDrive();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        let url = `${API_URL}/tags?excludeType=image,video`;
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
    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let url = `${API_URL}/files?excludeType=image,video`;
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
          throw new Error('Failed to fetch documents from the server.');
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
  }, [selectedTag, token, activeDriveId]);

  const handleUpdateSuccess = (updatedFile) => {
    setFiles(prevFiles => prevFiles.map(f => 
      f.driveFileId === updatedFile.driveFileId ? updatedFile : f
    ));
    setSelectedFile(updatedFile);
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_URL}/tags?excludeType=image,video`;
    if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;

    fetch(url, { headers })
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .catch(err => console.error('Error refreshing tags:', err));
  };

  const handleDeleteSuccess = (driveFileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.driveFileId !== driveFileId));
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_URL}/tags?excludeType=image,video`;
    if (activeDriveId) url += `&driveConfigId=${activeDriveId}`;

    fetch(url, { headers })
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .catch(err => console.error('Error refreshing tags:', err));
  };

  const closeModal = () => setSelectedFile(null);

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

  const getFileExt = (file) => {
    const mimeType = file.mimeType || '';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('text/plain')) return 'TXT';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'XLS';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'DOC';
    return file.name?.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  };

  // Reset tag filter when drive changes
  useEffect(() => {
    setSelectedTag(null);
  }, [activeDriveId]);

  const totalSize = files.reduce((sum, file) => sum + (file.size ? Number(file.size) : 0), 0);
  const folderPills = [
    { name: 'All docs', icon: '✦', count: files.length, value: null },
    ...tags.slice(0, 4).map(tag => ({ name: tag.name, icon: '#', count: tag.count || '', value: tag.name }))
  ];

  return (
    <div
      className="documents-container cosmic-page"
      style={{
        '--page-accent': 'var(--cosmic-blue)',
        '--cosmic-orb-top': '88px',
        '--cosmic-orb-right': '56px',
        '--cosmic-star-top': '208px',
        '--cosmic-star-left': '46%',
        '--cosmic-cube-top': '118px',
        '--cosmic-cube-left': '198px',
      }}
    >
      <svg className="cosmic-star" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill="currentColor"/>
      </svg>
      <div className="cosmic-cube" />

      <div className="documents-content cosmic-content">
        <div className="documents-header">
          <div className="documents-title-block">
            <div className="documents-kicker">
              <span className="documents-badge">{files.length} FILE{files.length === 1 ? '' : 'S'}</span>
              <span className="documents-meta">· text · pdf · {formatBytes(totalSize)}</span>
            </div>
            <h1>
              Read, review, <em>repeat.</em>
            </h1>
            <p>
              {activeDrive
                ? `Files on ${activeDrive.name}`
                : 'Your uploaded files on Google Drive'}
            </p>
          </div>

          <div className="documents-storage-card">
            <span>STORAGE</span>
            <strong>{formatBytes(totalSize)}</strong>
            <div className="documents-storage-track">
              <div style={{ width: `${Math.min(100, Math.max(12, (totalSize / (10 * 1024 * 1024 * 1024)) * 100))}%` }} />
            </div>
          </div>
        </div>

        <div className="folder-pill-row">
          {folderPills.map((folder, i) => (
            <button
              key={folder.name}
              className={`folder-pill ${selectedTag === folder.value ? 'active' : ''}`}
              onClick={() => setSelectedTag(folder.value)}
              style={{ '--folder-index': i }}
            >
              <span>{folder.icon}</span>
              {folder.name}
              <span className="folder-count">{folder.count}</span>
            </button>
          ))}
        </div>

        {tags.length > 4 && (
          <div className="filter-bar compact">
            {tags.slice(4).map(tag => (
              <button
                key={tag.id}
                className={`filter-pill ${selectedTag === tag.name ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag.name)}
              >
                #{tag.name}
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
            {files.map((file, i) => {
              const tag = file.tags?.[0]?.name || 'misc';
              return (
                <div
                  key={file.id}
                  className="document-card"
                  onClick={() => setSelectedFile(file)}
                  role="button"
                  tabIndex={0}
                  style={{ '--card-index': i }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedFile(file);
                    }
                  }}
                >
                  <div className="document-card-top">
                    <span className="document-ext">{getFileExt(file)}</span>
                    <span className="document-size">{formatBytes(file.size)}</span>
                  </div>
                  <span className="document-name">{file.name}</span>
                  <div className="document-footer">
                    <span>{formatDate(file.modifiedTime || file.createdTime)}</span>
                    <span className="card-tag">#{tag}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-documents">
            <p>No documents found in your Drive.</p>
          </div>
        )}
      </div>

      <FileModal 
        file={selectedFile} 
        onClose={closeModal} 
        onUpdateSuccess={handleUpdateSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        isImage={false}
      />
    </div>
  );
};

export default Documents;
