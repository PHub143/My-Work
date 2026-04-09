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
            <a 
              key={file.id} 
              href={file.webViewLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="document-card"
            >
              <div className="card-icon">📄</div>
              <div className="document-info">
                <span className="document-name">{file.name}</span>
                <span className="document-link">View document →</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="no-documents">
          <p>No documents found in your Drive.</p>
        </div>
      )}
    </div>
  );
};

export default Documents;
