import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../config/constants';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="status-page">
      <div className="status-card">
        <div className="status-icon text-warning">
          <ShieldAlert size={48} strokeWidth={1.8} />
        </div>
        <h2>Access Restricted</h2>
        <p className="status-desc">
          Your assigned role (<strong>{ROLE_LABELS[user?.role] || user?.role || 'Current Role'}</strong>) does not have permission to view this section or perform this action.
        </p>
        <p className="muted-text text-sm">
          If you believe this is in error, contact your Aeterna Super Admin to update your account privileges.
        </p>
        <div className="status-actions">
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
