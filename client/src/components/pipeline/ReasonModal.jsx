import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const ReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  student,
  targetStageLabel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason || reason.trim().length < 5) {
      setError('Please provide a specific reason (at least 5 characters).');
      return;
    }
    setError('');
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setError('');
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <AlertCircle size={18} strokeWidth={2.2} style={{ color: 'var(--color-danger)' }} />
          <span>Mark as {targetStageLabel}</span>
        </span>
      }
      footer={
        <div className="modal-actions-row">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Confirm Move
          </Button>
        </div>
      }
    >
      <div className="reason-modal-content">
        <p className="reason-modal-prompt">
          Please provide a reason for moving{' '}
          <strong>{student?.studentName}</strong> to{' '}
          <strong>{targetStageLabel}</strong>:
        </p>

        <textarea
          className="reason-textarea"
          rows={4}
          placeholder="e.g. Student postponed intake to 2027 due to personal reasons / Financial constraints."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          autoFocus
        />

        {error && <p className="form-error-msg">{error}</p>}
      </div>
    </Modal>
  );
};
