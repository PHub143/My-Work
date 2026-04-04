import React from 'react';
import './Spinner.css';

const Spinner = ({ inline }) => {
  if (inline) {
    return <div className="spinner"></div>;
  }
  return (
    <div className="spinner-container">
      <div className="spinner spinner-large"></div>
    </div>
  );
};

export default Spinner;