import React, { useState, useRef } from 'react';
import './Upload.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus({ type: '', message: '' });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'File uploaded successfully!' });
        setFile(null); // Clear file after successful upload
        // Clear file input using ref
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setStatus({ type: 'error', message: data.message || 'Error uploading file.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Connection to server failed.' });
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>Upload to Google Drive</h1>
        
        <div className="file-input-wrapper">
          <label htmlFor="file-upload" className="custom-file-upload">
            {file ? 'Change File' : 'Select File'}
          </label>
          <input 
            id="file-upload" 
            type="file" 
            onChange={handleFileChange} 
            disabled={isUploading}
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"
          />
          {file && (
            <div className="file-name">
              Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <button 
          className="upload-button" 
          onClick={handleUpload} 
          disabled={!file || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Now'}
        </button>

        {status.message && (
          <div className={`status-message ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
