import React, { useState, useRef } from 'react';
import './Upload.css';
import { API_URL, ALLOWED_FILE_TYPES } from '../config';
import Spinner from '../components/Spinner';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    fetchAvailableTags();
  }, []);

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch(`${API_URL}/tags`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags.map(t => t.name));
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus({ type: '', message: '' });
      
      // Auto-detect default tag based on file type
      const fileType = selectedFile.type.split('/')[0];
      const subType = selectedFile.type.split('/')[1];
      
      let defaultTag = '';
      if (fileType === 'image') defaultTag = 'image';
      else if (subType === 'pdf') defaultTag = 'pdf';
      else if (fileType === 'text') defaultTag = 'text';

      if (defaultTag && !tags.includes(defaultTag)) {
        setTags(prev => [...prev, defaultTag]);
      }
    }
  };

  const addTag = (tag) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag]);
    }
    setTagInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    // Important: Append fields before file for busboy sequential processing
    formData.append('tags', JSON.stringify(tags));
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.status === 412) {
        window.location.href = '#/settings';
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'File uploaded successfully!' });
        setFile(null);
        setTags([]); // Clear tags
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchAvailableTags(); // Refresh tags list
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

  const filteredSuggestions = availableTags.filter(
    t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
  );

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
            accept={ALLOWED_FILE_TYPES.join(',')}
          />
          {file && (
            <div className="file-name">
              Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="tags-section">
          <div className="tags-container">
            {tags.map(tag => (
              <span key={tag} className="tag-pill">
                {tag}
                <button onClick={() => removeTag(tag)} className="tag-remove">&times;</button>
              </span>
            ))}
          </div>
          
          <div className="tag-input-wrapper">
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              className="tag-input"
              disabled={isUploading}
            />
            {showSuggestions && tagInput && (
              <div className="tag-suggestions">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map(tag => (
                    <div 
                      key={tag} 
                      className="tag-suggestion-item"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </div>
                  ))
                ) : (
                  <div className="tag-suggestion-item" onClick={() => addTag(tagInput)}>
                    Create new tag: "{tagInput}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button 
          className="upload-button" 
          onClick={handleUpload} 
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Spinner inline /> Uploading...
            </>
          ) : (
            'Upload Now'
          )}
        </button>

        {status.message && (
          <div className={`status-message ${status.type}`} role="status" aria-live="polite">
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
