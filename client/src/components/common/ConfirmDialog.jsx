import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Please Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
}) => {
  const containerRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useFocusTrap({ isOpen, containerRef, initialFocusRef: cancelBtnRef });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = 'confirm-dialog-title';

  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={containerRef} className="modal-container max-w-sm" tabIndex="-1">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={18}
              strokeWidth={2.2}
              className={danger ? 'text-danger' : 'text-warning'}
              aria-hidden="true"
            />
            <h3 id={titleId}>{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <div className="modal-body">
          <p className="text-muted text-sm">{message}</p>
        </div>
        <div className="modal-footer">
          <Button
            ref={cancelBtnRef}
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
