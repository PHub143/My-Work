import React, { useState, useRef, useEffect } from 'react';
import { useDrive } from '../DriveContext';
import './DriveSwitcher.css';

const DriveSwitcher = () => {
  const { drives, activeDrive, setActiveDriveId } = useDrive();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!drives || drives.length === 0) {
    return null;
  }

  const handleSelect = (driveId) => {
    setActiveDriveId(driveId);
    setIsOpen(false);
  };

  return (
    <div className="drive-switcher" ref={dropdownRef}>
      <button
        className="drive-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Switch Drive"
      >
        <svg className="drive-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12H16L14 15H10L8 12H2" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
        <span className="drive-name">{activeDrive?.name || 'Select Drive'}</span>
        <svg className={`drive-chevron ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="drive-dropdown" role="listbox">
          <div className="drive-dropdown-header">Storage Drives</div>
          {drives.map((drive) => (
            <button
              key={drive.id}
              className={`drive-option ${drive.id === activeDrive?.id ? 'active' : ''}`}
              onClick={() => handleSelect(drive.id)}
              role="option"
              aria-selected={drive.id === activeDrive?.id}
            >
              <div className="drive-option-info">
                <span className="drive-option-name">{drive.name}</span>
                <span className="drive-option-meta">
                  {drive.fileCount} file{drive.fileCount !== 1 ? 's' : ''}
                  {drive.isDefault && <span className="default-badge">Default</span>}
                </span>
              </div>
              {drive.id === activeDrive?.id && (
                <svg className="drive-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriveSwitcher;
