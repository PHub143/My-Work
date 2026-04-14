/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from './config';

const DriveContext = createContext(null);

const STORAGE_KEY = 'activeDriveId';

export const DriveProvider = ({ children }) => {
  const [drives, setDrives] = useState([]);
  const [activeDriveId, setActiveDriveIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrives = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/config/drives`);
      if (response.ok) {
        const data = await response.json();
        const fetchedDrives = data.configs || [];
        setDrives(fetchedDrives);

        // If no active drive is set (or the stored one no longer exists), use the default
        const storedId = localStorage.getItem(STORAGE_KEY);
        const storedExists = fetchedDrives.some(d => d.id === storedId);
        
        if (!storedId || !storedExists) {
          const defaultDrive = fetchedDrives.find(d => d.isDefault) || fetchedDrives[0];
          if (defaultDrive) {
            setActiveDriveIdState(defaultDrive.id);
            localStorage.setItem(STORAGE_KEY, defaultDrive.id);
          } else {
            setActiveDriveIdState(null);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching drive configs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const setActiveDriveId = useCallback((id) => {
    setActiveDriveIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeDrive = useMemo(
    () => drives.find(d => d.id === activeDriveId) || null,
    [drives, activeDriveId]
  );

  const value = useMemo(() => ({
    drives,
    activeDriveId,
    activeDrive,
    setActiveDriveId,
    isLoading,
    refreshDrives: fetchDrives
  }), [drives, activeDriveId, activeDrive, setActiveDriveId, isLoading, fetchDrives]);

  return (
    <DriveContext.Provider value={value}>
      {children}
    </DriveContext.Provider>
  );
};

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};
