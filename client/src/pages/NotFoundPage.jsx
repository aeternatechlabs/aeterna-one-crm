import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="status-page">
      <div className="status-card">
        <div className="status-icon text-muted" style={{ marginBottom: '8px' }}>
          <Compass size={44} strokeWidth={1.8} />
        </div>
        <div className="status-code">404</div>
        <h2>Page Not Found</h2>
        <p className="status-desc">
          The requested CRM workspace page could not be located or has moved.
        </p>
        <div className="status-actions">
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
