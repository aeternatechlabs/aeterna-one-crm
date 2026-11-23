import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ROLES } from '../../config/constants';

const CATEGORY_DEFINITIONS = [
  { id: 'passport_identity', label: 'Passport & Identity (Mandatory)', isMandatory: true, icon: '🛂' },
  { id: 'academic_transcripts', label: 'Academic Transcripts (Mandatory)', isMandatory: true, icon: '📜' },
  { id: 'financial_affidavits', label: 'Financial Statements (Mandatory)', isMandatory: true, icon: '🏦' },
  { id: 'test_score_cards', label: 'Standardized Test Score Cards', isMandatory: false, icon: '📊' },
  { id: 'sop_lor', label: 'Statement of Purpose & LORs', isMandatory: false, icon: '📝' },
  { id: 'visa_documents', label: 'Visa Application Documents', isMandatory: false, icon: '✈️' },
  { id: 'other', label: 'Other Supporting Documents', isMandatory: false, icon: '📁' },
];

export const DocumentVault = ({ student, userRole, initialDocuments = [], onUploadSuccess, onVerifySuccess }) => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('passport_identity');
  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Edit / Replace Document State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editSelectedCategory, setEditSelectedCategory] = useState('');
  const [editReplacementFile, setEditReplacementFile] = useState(null);
  const [editFileError, setEditFileError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete Document Confirmation State
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canVerify =
    userRole === ROLES.SUPER_ADMIN ||
    userRole === ROLES.BRANCH_MANAGER ||
    userRole === ROLES.APPLICATION_OFFICER;

  const canEdit =
    userRole === ROLES.SUPER_ADMIN ||
    userRole === ROLES.BRANCH_MANAGER ||
    userRole === ROLES.APPLICATION_OFFICER;

  const canDelete =
    userRole === ROLES.SUPER_ADMIN || userRole === ROLES.BRANCH_MANAGER;

  // File selection & validation
  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (isEdit) setEditFileError('');
    else setFileError('');

    if (!file) {
      if (isEdit) setEditReplacementFile(null);
      else setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const err = 'File size exceeds the 10MB limit';
      if (isEdit) {
        setEditFileError(err);
        setEditReplacementFile(null);
      } else {
        setFileError(err);
        setSelectedFile(null);
      }
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const err = 'Unsupported file type. Only PDF, JPEG, PNG, and WEBP are accepted';
      if (isEdit) {
        setEditFileError(err);
        setEditReplacementFile(null);
      } else {
        setFileError(err);
        setSelectedFile(null);
      }
      return;
    }

    if (isEdit) {
      setEditReplacementFile(file);
    } else {
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  // Handle document upload (Add to Cloudflare R2)
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError('Please select a file to upload');
      return;
    }
    if (!docTitle.trim()) {
      setFileError('Please provide a document title');
      return;
    }

    setIsSubmitting(true);
    setFileError('');

    try {
      const base64Data = await fileToBase64(selectedFile);
      const res = await fetch(`/api/v1/students/${student._id}/vault/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim(),
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          category: selectedCategory,
          fileBase64: base64Data,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }

      const uploadedDoc = data.data?.document || data.document;
      setDocuments((prev) => [uploadedDoc, ...prev]);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocTitle('');
      const providerLabel = uploadedDoc?.storageProvider === 'cloudflare_r2' ? 'Cloudflare R2' : 'Local Storage Vault';
      setActionMessage({
        type: 'success',
        text: `"${selectedFile.name}" successfully uploaded and synchronized with ${providerLabel}.`,
      });
      if (onUploadSuccess) onUploadSuccess(uploadedDoc);
    } catch (err) {
      setFileError(err.message || 'Upload error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setEditDocTitle(doc.title || doc.fileName);
    setEditSelectedCategory(doc.category);
    setEditReplacementFile(null);
    setEditFileError('');
    setIsEditModalOpen(true);
  };

  // Handle Edit / Replacement Submit (Sync to Cloudflare R2)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    if (!editDocTitle.trim()) {
      setEditFileError('Please provide a document title');
      return;
    }

    setIsEditSubmitting(true);
    setEditFileError('');

    try {
      const payload = {
        title: editDocTitle.trim(),
        category: editSelectedCategory,
      };

      if (editReplacementFile) {
        const base64Data = await fileToBase64(editReplacementFile);
        payload.fileBase64 = base64Data;
        payload.fileName = editReplacementFile.name;
        payload.fileSize = editReplacementFile.size;
        payload.mimeType = editReplacementFile.type;
      }

      const res = await fetch(`/api/v1/students/${student._id}/vault/${editingDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update document');
      }

      const updated = data.data?.document || data.document;
      setDocuments((prev) =>
        prev.map((d) => (d._id === editingDoc._id ? { ...d, ...updated } : d))
      );
      setIsEditModalOpen(false);
      setEditingDoc(null);
      setActionMessage({
        type: 'success',
        text: data.data?.fileReplaced
          ? `Document binary replaced and updated in Cloudflare R2 storage.`
          : `Document metadata updated successfully.`,
      });
    } catch (err) {
      setEditFileError(err.message || 'Update failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDelete = (doc) => {
    setDocToDelete(doc);
    setIsConfirmDeleteOpen(true);
  };

  // Confirm Document Deletion & Cloudflare R2 Purge
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/students/${student._id}/vault/${docToDelete._id}?purge=true`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete document');
      }

      setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id));
      setIsConfirmDeleteOpen(false);
      setActionMessage({
        type: 'success',
        text: `Document "${docToDelete.fileName}" permanently deleted and purged from Cloudflare R2 storage.`,
      });
      setDocToDelete(null);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Delete failed' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle document verification
  const handleVerify = async (docId, newStatus) => {
    try {
      const res = await fetch(`/api/v1/students/${student._id}/vault/${docId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification update failed');
      }

      setDocuments((prev) =>
        prev.map((d) => (d._id === docId ? { ...d, isVerified: newStatus } : d))
      );
      setActionMessage({
        type: 'success',
        text: `Document ${newStatus ? 'marked as verified' : 'unverified'} successfully.`,
      });
      if (onVerifySuccess) onVerifySuccess(data);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Verification failed' });
    }
  };

  // Handle secure download link
  const handleDownload = async (docId) => {
    try {
      const res = await fetch(`/api/v1/students/${student._id}/vault/${docId}/download`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Download request failed');
      }
      const downloadUrl = data.data?.downloadUrl || data.downloadUrl;
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Could not download document' });
    }
  };

  // Compute mandatory gate checklist progress
  const mandatoryVerifiedCount = CATEGORY_DEFINITIONS.filter(
    (c) => c.isMandatory && documents.some((d) => d.category === c.id && d.isVerified)
  ).length;
  const isGateUnlocked = mandatoryVerifiedCount === 3;

  return (
    <div className="document-vault-wrapper">
      {/* Vault Header & Progress Summary */}
      <div className="vault-header-row">
        <div>
          <h3 className="vault-title">Student Document Vault & Compliance Gate</h3>
          <p className="vault-subtitle">
            Secure, encrypted document repository powered by Cloudflare R2 object storage with role-scoped verification.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsUploadModalOpen(true)}>
          + Upload Document
        </Button>
      </div>

      {/* Mandatory Verification Gate Banner */}
      <div className={`gate-status-card ${isGateUnlocked ? 'gate-unlocked' : 'gate-locked'}`}>
        <div className="gate-icon" aria-hidden="true">
          {isGateUnlocked ? '✅' : '🔒'}
        </div>
        <div className="gate-info">
          <div className="gate-title-row">
            <strong>Admissions Submission Gate: {isGateUnlocked ? 'Unlocked' : 'Incomplete'}</strong>
            <Badge variant={isGateUnlocked ? 'success' : 'warning'} size="sm">
              {mandatoryVerifiedCount} of 3 Mandatory Categories Verified
            </Badge>
          </div>
          <p className="gate-desc">
            {isGateUnlocked
              ? 'All required documents (Identity, Academic Transcripts, and Financial Statements) are verified. This candidate is eligible for university submission.'
              : 'University submission stage gate requires verified Passport, Academic Transcripts, and Financial Statements.'}
          </p>
        </div>
      </div>

      {actionMessage.text && (
        <div className={`vault-alert ${actionMessage.type}`} role="alert" style={{ marginBottom: '16px' }}>
          {actionMessage.text}
        </div>
      )}

      {/* Category Accordion / List */}
      <div className="vault-categories-grid">
        {CATEGORY_DEFINITIONS.map((cat) => {
          const catDocs = documents.filter((d) => d.category === cat.id);
          const hasVerified = catDocs.some((d) => d.isVerified);

          return (
            <div key={cat.id} className="category-section-card">
              <div className="category-section-header">
                <div className="cat-title-group">
                  <span className="cat-icon" aria-hidden="true">{cat.icon}</span>
                  <span className="cat-title">{cat.label}</span>
                </div>
                <div className="cat-badges">
                  {catDocs.length === 0 ? (
                    <Badge variant="outline" size="sm">Missing</Badge>
                  ) : hasVerified ? (
                    <Badge variant="success" size="sm">Verified ({catDocs.length})</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">Pending Verification ({catDocs.length})</Badge>
                  )}
                </div>
              </div>

              {catDocs.length > 0 ? (
                <ul className="category-doc-list">
                  {catDocs.map((doc) => (
                    <li key={doc._id} className="doc-item-row">
                      <div className="doc-meta-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="doc-name">{doc.title || doc.fileName}</span>
                          {doc.storageProvider === 'cloudflare_r2' ? (
                            <span style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              ☁️ R2 Cloud
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#854d0e', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              🔒 Local Vault
                            </span>
                          )}
                        </div>
                        <div className="doc-submeta">
                          <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                          <span>•</span>
                          <span>{doc.mimeType?.replace('application/', '')}</span>
                          <span>•</span>
                          <span>Uploaded {new Date(doc.createdAt || Date.now()).toLocaleDateString()}</span>
                          {doc.isVerified && doc.verifiedByName && (
                            <span className="verified-by-tag"> • Verified by {doc.verifiedByName}</span>
                          )}
                        </div>
                      </div>

                      <div className="doc-actions-group">
                        <button
                          type="button"
                          className="action-link-btn"
                          onClick={() => handleDownload(doc._id)}
                          title="Download document"
                        >
                          ⬇ Download
                        </button>

                        {canVerify && (
                          <button
                            type="button"
                            className={`action-pill-btn ${doc.isVerified ? 'unverify-btn' : 'verify-btn'}`}
                            onClick={() => handleVerify(doc._id, !doc.isVerified)}
                          >
                            {doc.isVerified ? 'Mark Unverified' : '✓ Verify'}
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            className="action-link-btn"
                            onClick={() => handleOpenEdit(doc)}
                            title="Edit metadata or replace file in Cloudflare R2"
                            style={{ color: '#2563eb' }}
                          >
                            ✏️ Edit
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            className="action-link-btn"
                            onClick={() => handleOpenDelete(doc)}
                            title="Delete and purge from Cloudflare R2"
                            style={{ color: '#dc2626' }}
                          >
                            🗑 Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="cat-empty-notice">
                  <span>No documents uploaded in this category.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload Document Modal (Add to Cloudflare R2) */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Upload Document to Vault (Cloudflare R2)"
        >
          <form onSubmit={handleUploadSubmit} className="vault-upload-form">
            <div className="form-group">
              <label htmlFor="vault-category-select">Document Category</label>
              <Select
                id="vault-category-select"
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={CATEGORY_DEFINITIONS.map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
              />
            </div>

            <div className="form-group">
              <Input
                label="Document Title / Descriptor"
                id="vault-doc-title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Official Degree Certificate"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="vault-file-picker">Select File (PDF, JPEG, PNG, WEBP - Max 10MB)</label>
              <input
                id="vault-file-picker"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange(e, false)}
                className="file-input-control"
              />
              {selectedFile && (
                <div className="file-selection-preview">
                  <span>Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>

            {fileError && <div className="vault-form-error">{fileError}</div>}

            <div className="modal-actions-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !selectedFile}>
                {isSubmitting ? 'Uploading to R2...' : 'Upload & Encrypt'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Document & File Replacement Modal (Cloudflare R2 Synchronized) */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Document & Cloudflare R2 Sync"
        >
          <form onSubmit={handleEditSubmit} className="vault-upload-form">
            <div className="form-group">
              <label htmlFor="edit-vault-category-select">Document Category</label>
              <Select
                id="edit-vault-category-select"
                value={editSelectedCategory}
                onChange={setEditSelectedCategory}
                options={CATEGORY_DEFINITIONS.map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
              />
            </div>

            <div className="form-group">
              <Input
                label="Document Title / Descriptor"
                id="edit-vault-doc-title"
                value={editDocTitle}
                onChange={(e) => setEditDocTitle(e.target.value)}
                placeholder="e.g. Updated Degree Certificate"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-vault-file-picker">
                Replace File in Cloudflare R2 (Optional — leave blank to keep existing file)
              </label>
              <input
                id="edit-vault-file-picker"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange(e, true)}
                className="file-input-control"
              />
              {editReplacementFile ? (
                <div className="file-selection-preview" style={{ color: '#0369a1' }}>
                  <span>Replacement file: <strong>{editReplacementFile.name}</strong> ({(editReplacementFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Current file: <strong>{editingDoc?.fileName}</strong> ({(editingDoc?.fileSize / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>

            {editFileError && <div className="vault-form-error">{editFileError}</div>}

            <div className="modal-actions-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isEditSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isEditSubmitting}>
                {isEditSubmitting ? 'Synchronizing with R2...' : 'Save & Sync R2'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Document Confirmation Dialog */}
      {isConfirmDeleteOpen && docToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Document from Cloudflare R2?"
          message={`Are you sure you want to permanently delete "${docToDelete.fileName}"? This will delete the document record and purge the object from Cloudflare R2 storage immediately.`}
          confirmText={isDeleting ? 'Purging from R2...' : 'Delete & Purge'}
          cancelText="Keep Document"
          variant="danger"
          disabled={isDeleting}
        />
      )}
    </div>
  );
};
