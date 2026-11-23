import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import {
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
  DISPOSITION_OUTCOME_LABELS,
} from '../../config/constants';

const QUICK_FOLLOWUP_OPTIONS = [
  { value: '1', label: 'In 1 hour (+1h)' },
  { value: '2', label: 'In 2 hours (+2h)' },
  { value: '4', label: 'In 4 hours (+4h)' },
  { value: '24', label: 'Tomorrow morning (+24h)' },
  { value: '48', label: 'In 2 days (+48h)' },
];

export const TaskDispositionModal = ({
  isOpen,
  onClose,
  task,
  initialChannel = REACHOUT_CHANNELS.WHATSAPP,
  onLogReachout,
  loading = false,
}) => {
  const [channel, setChannel] = useState(initialChannel);
  const [selectedOutcome, setSelectedOutcome] = useState(DISPOSITION_OUTCOMES.CONNECTED_INTERESTED);
  const [notes, setNotes] = useState('');
  const [followupHours, setFollowupHours] = useState('4');

  if (!task) return null;

  const handleOutcomeClick = (outcome) => {
    setSelectedOutcome(outcome);
    if (outcome === DISPOSITION_OUTCOMES.NO_ANSWER) {
      setFollowupHours('4');
    } else if (outcome === DISPOSITION_OUTCOMES.BUSY) {
      setFollowupHours('2');
    } else if (outcome === DISPOSITION_OUTCOMES.CALLBACK_REQUESTED) {
      setFollowupHours('2');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedOutcome) return;

    const isCompletion = selectedOutcome === DISPOSITION_OUTCOMES.CONNECTED_INTERESTED;
    if (isCompletion && notes.trim().length < 5) {
      return;
    }

    onLogReachout({
      channel,
      outcomeCode: selectedOutcome,
      notes: notes.trim(),
      nextFollowupHours:
        selectedOutcome === DISPOSITION_OUTCOMES.NO_ANSWER ||
        selectedOutcome === DISPOSITION_OUTCOMES.BUSY ||
        selectedOutcome === DISPOSITION_OUTCOMES.CALLBACK_REQUESTED
          ? Number(followupHours)
          : null,
      markComplete: isCompletion,
    });
  };

  const isCompletion = selectedOutcome === DISPOSITION_OUTCOMES.CONNECTED_INTERESTED;
  const isSubmitDisabled = isCompletion && notes.trim().length < 5;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="1-Click Reach-Out Disposition"
      maxWidth="540px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitDisabled || loading}
            loading={loading}
          >
            <CheckCircle size={14} style={{ marginRight: '6px' }} />
            <span>Save Disposition & Next Action</span>
          </Button>
        </div>
      }
    >
      <div className="task-modal-candidate-box">
        <div className="task-candidate-top">
          <span className="task-candidate-name">{task.candidateName}</span>
          <span className="task-candidate-id-badge">{task.candidatePhone || 'No Phone'}</span>
        </div>
        {task.candidateProgram && (
          <div className="task-candidate-program">{task.candidateProgram}</div>
        )}
        <div className="task-candidate-meta">
          <span>Task: {task.title}</span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label className="task-form-label" style={{ display: 'block', marginBottom: '8px' }}>
          Outreach Channel Used
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn-channel-chip ${channel === REACHOUT_CHANNELS.WHATSAPP ? 'active' : ''}`}
            onClick={() => setChannel(REACHOUT_CHANNELS.WHATSAPP)}
          >
            <MessageSquare size={13} />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            className={`btn-channel-chip ${channel === REACHOUT_CHANNELS.CALL ? 'active' : ''}`}
            onClick={() => setChannel(REACHOUT_CHANNELS.CALL)}
          >
            <Phone size={13} />
            <span>Phone Call</span>
          </button>
          <button
            type="button"
            className={`btn-channel-chip ${channel === REACHOUT_CHANNELS.EMAIL ? 'active' : ''}`}
            onClick={() => setChannel(REACHOUT_CHANNELS.EMAIL)}
          >
            <Mail size={13} />
            <span>Email</span>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label className="task-form-label" style={{ display: 'block', marginBottom: '8px' }}>
          1-Tap Disposition Outcome <span style={{ color: 'var(--color-maroon-700)' }}>*</span>
        </label>
        <div className="disposition-grid">
          {Object.entries(DISPOSITION_OUTCOMES).map(([key, val]) => (
            <button
              key={val}
              type="button"
              className={`disposition-btn disposition-${val} ${selectedOutcome === val ? 'selected' : ''}`}
              onClick={() => handleOutcomeClick(val)}
            >
              <span>{DISPOSITION_OUTCOME_LABELS[val]}</span>
            </button>
          ))}
        </div>
      </div>

      {(selectedOutcome === DISPOSITION_OUTCOMES.NO_ANSWER ||
        selectedOutcome === DISPOSITION_OUTCOMES.BUSY ||
        selectedOutcome === DISPOSITION_OUTCOMES.CALLBACK_REQUESTED) && (
        <div className="task-form-group" style={{ marginBottom: '16px' }}>
          <label className="task-form-label" htmlFor="followup-hours-select">
            <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Automated Next Follow-up Schedule
          </label>
          <Select
            id="followup-hours-select"
            value={followupHours}
            onChange={(e) => setFollowupHours(e.target.value)}
            options={QUICK_FOLLOWUP_OPTIONS}
          />
        </div>
      )}

      <div className="task-form-group">
        <label className="task-form-label" htmlFor="disposition-notes">
          Discussion Notes & Reference {isCompletion && <span style={{ color: 'var(--color-maroon-700)' }}>* (min 5 chars)</span>}
        </label>
        <textarea
          id="disposition-notes"
          className="task-form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Spoke with candidate; confirmed visa appointment booking for next Tuesday."
          rows={3}
        />
        {isCompletion && (
          <div className="task-form-char-count">
            <span
              style={{
                color: notes.trim().length >= 5 ? '#2e7d32' : 'var(--color-maroon-700)',
                fontWeight: 600,
              }}
            >
              {notes.trim().length} / 5 chars required
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};
