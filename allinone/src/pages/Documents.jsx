import React, { useState, useEffect } from 'react';
import './Documents.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import FileModal from '../components/FileModal';
import { useAuth } from '../AuthContext';

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${API_URL}/tags?excludeType=image,video`, { headers });
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
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        let url = `${API_URL}/files?excludeType=image,video`;
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
  }, [selectedTag, token]);

  const handleUpdateSuccess = (updatedFile) => {
    setFiles(prevFiles => prevFiles.map(f => 
      f.driveFileId === updatedFile.driveFileId ? updatedFile : f
    ));
    setSelectedFile(updatedFile);
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_URL}/tags?excludeType=image,video`, { headers })
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .catch(err => console.error('Error refreshing tags:', err));
  };

  const handleDeleteSuccess = (driveFileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.driveFileId !== driveFileId));
    // Refresh tags list
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`${API_URL}/tags?excludeType=image,video`, { headers })
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
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedFile(file);
                }
              }}
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
