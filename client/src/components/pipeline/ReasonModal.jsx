import React, { useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PIPELINE_STAGES } from '../../config/constants';

export const ReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  student,
  targetStage,
  targetStageLabel,
}) => {
  const [reason, setReason] = useState('');
  const [deferredIntake, setDeferredIntake] = useState('');
  const [error, setError] = useState('');

  const isDeferred = targetStage === PIPELINE_STAGES.DEFERRED;

  const handleConfirm = () => {
    if (!reason || reason.trim().length < 5) {
      setError('Please provide a specific reason (at least 5 characters).');
      return;
    }
    setError('');
    onConfirm({
      reason: reason.trim(),
      deferredIntake: deferredIntake ? deferredIntake.trim() : '',
    });
    setReason('');
    setDeferredIntake('');
  };

  const handleClose = () => {
    setError('');
    setReason('');
    setDeferredIntake('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          {isDeferred ? (
            <Clock size={18} strokeWidth={2.2} style={{ color: 'var(--color-warning)' }} />
          ) : (
            <AlertCircle size={18} strokeWidth={2.2} style={{ color: 'var(--color-danger)' }} />
          )}
          <span>Mark as {targetStageLabel}</span>
        </span>
      }
      footer={
        <div className="modal-actions-row">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant={isDeferred ? 'warning' : 'danger'} onClick={handleConfirm}>
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

        {isDeferred && (
          <div className="mb-4" style={{ marginBottom: '16px' }}>
            <label
              htmlFor="deferred-intake-input"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: 'var(--color-text-primary)',
              }}
            >
              Deferred Target Intake (Optional):
            </label>
            <Input
              id="deferred-intake-input"
              placeholder="e.g. Spring 2027, Fall 2027"
              value={deferredIntake}
              onChange={(e) => setDeferredIntake(e.target.value)}
            />
          </div>
        )}

        <div style={{ marginBottom: '8px' }}>
          <label
            htmlFor="exit-reason-textarea"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '6px',
              color: 'var(--color-text-primary)',
            }}
          >
            Mandatory Reason (minimum 5 characters):
          </label>
          <textarea
            id="exit-reason-textarea"
            className="reason-textarea"
            rows={4}
            placeholder={
              isDeferred
                ? 'e.g. Candidate requested deferral due to IELTS exam re-take schedule.'
                : 'e.g. Candidate selected domestic university due to financial budget.'
            }
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            autoFocus
          />
        </div>

        {error && <p className="form-error-msg">{error}</p>}
      </div>
    </Modal>
  );
};
