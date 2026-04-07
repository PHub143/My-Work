import React, { useState, useEffect } from 'react';
import './Documents.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`${API_URL}/files?excludeType=image`);
        if (!response.ok) {
          throw new Error('Failed to fetch files from the server.');
        }
        const data = await response.json();
        // data is now { files: [...], total: 10, limit: 50, offset: 0 }
        setFiles(data.files || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, []);

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h1>Documents</h1>
        <p>Your uploaded files on Google Drive</p>
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
