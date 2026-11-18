import React, { useState, useRef, useEffect } from 'react';
import { useDrive } from '../DriveContext';
import { CheckIcon, ChevronIcon } from './DriveIcons';
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
        type="button"
        className="drive-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Switch drive"
      >
        <span className="drive-indicator" aria-hidden="true" />
        <span className="drive-name">{activeDrive?.name || 'Select drive'}</span>
        <ChevronIcon size={16} />
      </button>

      {isOpen && (
        <div className="drive-dropdown" role="listbox">
          <div className="drive-dropdown-header">Storage drives</div>
          {drives.map((drive) => (
            <button
              type="button"
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
                  {drive.isDefault && <span className="drive-option-tag">Default</span>}
                </span>
              </div>
              {drive.id === activeDrive?.id && <CheckIcon size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriveSwitcher;
