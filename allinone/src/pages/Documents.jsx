import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('http://localhost:3001/files');
        if (!response.ok) {
          throw new Error('Failed to fetch files.');
        }
        const data = await response.json();
        setFiles(data);
      } catch (err) {
        setError(err.message);
      }
    };

    const fetchVersion = async () => {
      try {
        const response = await fetch('http://localhost:3001/version');
        const data = await response.json();
        setVersion(data.version);
      } catch {
        // do nothing
      }
    };

    fetchFiles();
    fetchVersion();
  }, []);

  return (
    <div>
      <h1>Documents</h1>
      {version && <p>Server version: {version}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>File Name</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <tr key={index}>
              <td>
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                  {file.name}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Documents;