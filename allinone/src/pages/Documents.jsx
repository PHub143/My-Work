import React, { useState, useEffect, useMemo } from 'react';
import './Documents.css';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import FileModal from '../components/FileModal';
import TopBar from '../components/TopBar';
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

const SORTS = {
  modified: { label: 'Modified', fn: (a, b) => new Date(b.modifiedTime || b.createdTime || 0) - new Date(a.modifiedTime || a.createdTime || 0) },
  name: { label: 'Name', fn: (a, b) => (a.name || '').localeCompare(b.name || '') },
  size: { label: 'Size', fn: (a, b) => Number(b.size || 0) - Number(a.size || 0) }
};

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [sort, setSort] = useState('modified');
  const { token } = useAuth();
  const { activeDriveId, activeDrive } = useDrive();

  const refreshTags = () => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let url = `${API_URL}/tags?excludeType=image,video`;
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
    setFiles((prev) => prev.map((f) => (f.driveFileId === updatedFile.driveFileId ? updatedFile : f)));
    setSelectedFile(updatedFile);
    refreshTags();
  };

  const handleDeleteSuccess = (driveFileId) => {
    setFiles((prev) => prev.filter((f) => f.driveFileId !== driveFileId));
    refreshTags();
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

  useEffect(() => setSelectedTag(null), [activeDriveId]);

  const getFileExt = (file) => {
    const mimeType = file.mimeType || '';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('text/plain')) return 'TXT';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'XLS';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'DOC';
    return file.name?.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  };

  const totalSize = files.reduce((sum, file) => sum + (file.size ? Number(file.size) : 0), 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? files.filter((f) => (f.name || '').toLowerCase().includes(q))
      : files.slice();
    return filtered.sort(SORTS[sort].fn);
  }, [files, query, sort]);

  const cycleSort = () => {
    const keys = Object.keys(SORTS);
    setSort(keys[(keys.indexOf(sort) + 1) % keys.length]);
  };

  const openFile = (file) => setSelectedFile(file);

  return (
    <>
      <TopBar
        value={query}
        onChange={setQuery}
        placeholder="Search file names and contents…"
        action={{ label: 'Upload', to: '/upload' }}
      />

      <div className="page-scan documents-page">
        <div className="page-head">
          <div>
            <h1>Documents</h1>
            <p>
              {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)} used
              {activeDrive ? ` on ${activeDrive.name}` : ''}
            </p>
          </div>

          <div className="page-head-actions">
            <div className="seg">
              <button
                type="button"
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
              >
                List
              </button>
              <button
                type="button"
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
              >
                Grid
              </button>
            </div>
            <button type="button" className="btn-quiet" onClick={cycleSort}>
              Sort: {SORTS[sort].label}
            </button>
          </div>
        </div>

        <div className="tag-row">
          <button
            type="button"
            className={`tag-chip${selectedTag === null ? ' active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            All <b>{files.length}</b>
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id || tag.name}
              type="button"
              className={`tag-chip${selectedTag === tag.name ? ' active' : ''}`}
              onClick={() => setSelectedTag(tag.name)}
            >
              {tag.name}
              {tag.count ? <b>{tag.count}</b> : null}
            </button>
          ))}
        </div>

        {error && <div className="doc-error" role="alert">{error}</div>}

        {isLoading ? (
          <div className="doc-loading"><Spinner /></div>
        ) : visible.length === 0 ? (
          <div className="doc-empty">
            <p>{query ? `Nothing matches “${query}”.` : 'No documents in this drive yet.'}</p>
            {query && (
              <button type="button" className="btn-quiet" onClick={() => setQuery('')}>
                Clear search
              </button>
            )}
          </div>
        ) : view === 'list' ? (
          <div className="doc-table">
            <div className="doc-row doc-row-head">
              <span />
              <span>Name</span>
              <span>Tag</span>
              <span>Size</span>
              <span>Modified</span>
              <span />
            </div>
            {visible.map((file) => (
              <div
                key={file.id}
                className="doc-row"
                role="button"
                tabIndex={0}
                onClick={() => openFile(file)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFile(file);
                  }
                }}
              >
                <span className="doc-ext" data-ext={getFileExt(file)}>{getFileExt(file)}</span>
                <span className="doc-name">{file.name}</span>
                <span className="doc-tag">{file.tags?.[0]?.name || '—'}</span>
                <span className="doc-size">{formatBytes(file.size)}</span>
                <span className="doc-date">{formatDate(file.modifiedTime || file.createdTime)}</span>
                <span className="doc-more" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="doc-grid">
            {visible.map((file) => (
              <div
                key={file.id}
                className="doc-tile"
                role="button"
                tabIndex={0}
                onClick={() => openFile(file)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFile(file);
                  }
                }}
              >
                <span className="doc-ext" data-ext={getFileExt(file)}>{getFileExt(file)}</span>
                <span className="doc-tile-name">{file.name}</span>
                <div className="doc-tile-foot">
                  <span>{formatBytes(file.size)}</span>
                  <span>{formatDate(file.modifiedTime || file.createdTime)}</span>
                </div>
              </div>
            ))}
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
    </>
  );
};

export default Documents;
