import React from 'react';

export const LoadingSpinner = ({ text = 'Loading application...' }) => {
  return (
    <div className="spinner-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};
