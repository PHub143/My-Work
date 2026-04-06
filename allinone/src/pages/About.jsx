import React from 'react';
import './Page.css';

const About = () => {
  return (
    <div className="page-container">
      <h1>About Us</h1>
      <p>Innovation and simplicity in one place.</p>
      
      <div className="page-content">
        <h2>Our Mission</h2>
        <p>
          We aim to provide a seamless file management experience that feels modern, fast, and secure. 
          By integrating with Google Drive, we leverage a world-class infrastructure to keep your documents safe while 
          providing a high-fidelity user interface inspired by the best design principles.
        </p>
        
        <h2>Technology</h2>
        <p>
          Our platform is built with React 19 and a lightweight Node.js backend. 
          We prioritize performance and responsiveness, ensuring that whether you're on a MacBook or an iPhone, 
          the experience is equally delightful.
        </p>
      </div>
    </div>
  );
};

export default About;
