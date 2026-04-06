import React from 'react';
import './Page.css';

const Services = () => {
  return (
    <div className="page-container">
      <h1>Our Services</h1>
      <p>Secure, fast, and simple file solutions.</p>
      
      <div className="page-content">
        <h2>Secure File Upload</h2>
        <p>
          Upload your documents directly to Google Drive with high-speed, 
          encrypted streaming. No local storage, no intermediate risks.
        </p>
        
        <h2>Seamless Access</h2>
        <p>
          View and manage your files from anywhere, on any device. 
          Our cloud-native approach ensures your files are always synced.
        </p>
        
        <h2>Apple-Standard UI</h2>
        <p>
          Experience a beautiful interface with glassmorphism, 
          system typography, and smooth transitions that make document management a joy.
        </p>
      </div>
    </div>
  );
};

export default Services;
