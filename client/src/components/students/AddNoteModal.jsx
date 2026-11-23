import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';

export const AddNoteModal = ({ isOpen, onClose, onSubmit, isSubmitting = false }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('counselling');
  const [error, setError] = useState('');

  const categories = [
    { value: 'counselling', label: 'Counselling & Advisory' },
    { value: 'financial', label: 'Financial & Budget' },
    { value: 'visa', label: 'Visa & Immigration' },
    { value: 'document', label: 'Documents & Verification' },
    { value: 'application', label: 'University Application' },
    { value: 'general', label: 'General Remark' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 3) {
      setError('Note content must be at least 3 characters.');
      return;
    }
    setError('');
    onSubmit({ content: content.trim(), category });
  };

  const handleClose = () => {
    setContent('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Consultation Note"
      size="md"
    >
      <form onSubmit={handleSubmit} className="add-note-form">
        <div className="form-group mb-4">
          <label htmlFor="note-category-select" className="form-label text-sm font-semibold mb-1 block">
            Note Category
          </label>
          <Select
            id="note-category-select"
            value={category}
            onChange={(val) => setCategory(val)}
            options={categories}
            aria-label="Note category"
          />
        </div>

        <div className="form-group mb-4">
          <label htmlFor="note-content-area" className="form-label text-sm font-semibold mb-1 block">
            Note Remarks & Guidance <span className="text-danger">*</span>
          </label>
          <textarea
            id="note-content-area"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Record advice given, test prep guidance, shortlist discussion, or next steps..."
            className="w-full form-textarea p-3 rounded-lg border border-default text-sm"
            required
            minLength={3}
          />
          {error && <p className="text-danger text-xs mt-1">{error}</p>}
        </div>

        <div className="modal-actions flex justify-end gap-3 pt-3 border-t border-subtle">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? 'Saving Note...' : 'Save Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
