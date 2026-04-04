import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';

const Documents = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`${API_URL}/files`);
        if (!response.ok) {
          throw new Error('Failed to fetch files.');
        }
        const data = await response.json();
        setFiles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, []);

  return (
    <div>
      <h1>Documents</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isLoading ? (
        <Spinner />
      ) : (
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
      )}
    </div>
  );
};

export default Documents;
