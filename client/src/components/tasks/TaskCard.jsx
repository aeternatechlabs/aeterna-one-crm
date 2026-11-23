import React from 'react';
import { Phone, MessageSquare, Mail, Clock, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  REACHOUT_CHANNELS,
} from '../../config/constants';

export const TaskCard = ({
  task,
  onOpenDisposition,
  onDirectComplete,
}) => {
  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const cleanPhone = (task.candidatePhone || '').replace(/[^0-9]/g, '');

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case TASK_PRIORITIES.URGENT:
        return 'danger';
      case TASK_PRIORITIES.HIGH:
        return 'warning';
      case TASK_PRIORITIES.MEDIUM:
        return 'gold';
      default:
        return 'secondary';
    }
  };

  const handleWhatsAppClick = () => {
    const text = encodeURIComponent(
      `Hello ${task.candidateName}, this is your counsellor from Aeterna Overseas Education regarding your ${task.candidateProgram || 'study abroad application'}. Are you free for a quick 5-minute discussion?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
    onOpenDisposition(task, REACHOUT_CHANNELS.WHATSAPP);
  };

  const handleCallClick = () => {
    window.location.href = `tel:${cleanPhone}`;
    onOpenDisposition(task, REACHOUT_CHANNELS.CALL);
  };

  const handleEmailClick = () => {
    const subject = encodeURIComponent(`Aeterna Education Follow-up: ${task.title}`);
    const body = encodeURIComponent(
      `Dear ${task.candidateName},\n\nI hope you are doing well. I am reaching out from Aeterna Overseas Education regarding your ${task.candidateProgram || 'application'}.\n\nBest regards,\nAeterna Counsellor Team`
    );
    window.location.href = `mailto:${task.candidateEmail}?subject=${subject}&body=${body}`;
    onOpenDisposition(task, REACHOUT_CHANNELS.EMAIL);
  };

  return (
    <div className={`task-queue-card ${isOverdue ? 'card-overdue' : ''}`}>
      <div className="task-card-header-row">
        <div className="task-card-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="task-candidate-heading">{task.candidateName}</span>
            <Badge variant={getPriorityVariant(task.priority)}>
              {TASK_PRIORITY_LABELS[task.priority] || task.priority}
            </Badge>
            {isOverdue && (
              <span className="task-badge-overdue">
                <AlertTriangle size={11} /> Overdue
              </span>
            )}
          </div>
          {task.candidateProgram && (
            <span className="task-program-sub">{task.candidateProgram}</span>
          )}
        </div>

        <div className="task-card-type-tag">
          {TASK_TYPE_LABELS[task.taskType] || task.taskType}
        </div>
      </div>

      <div className="task-card-body-text">
        <strong>{task.title}</strong>
        {task.description && <p>{task.description}</p>}
      </div>

      <div className="task-card-footer-bar">
        <div className="task-due-time-tag">
          <Clock size={12} />
          <span>Due: {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>•</span>
          <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        </div>

        <div className="task-smart-actions-group">
          {task.candidatePhone && (
            <>
              <button
                type="button"
                className="btn-reachout-action action-whatsapp"
                onClick={handleWhatsAppClick}
                title="1-Click WhatsApp Reach-Out"
                aria-label={`WhatsApp ${task.candidateName}`}
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                className="btn-reachout-action action-call"
                onClick={handleCallClick}
                title="1-Click Phone Dialer"
                aria-label={`Call ${task.candidateName}`}
              >
                <Phone size={13} />
                <span>Call</span>
              </button>
            </>
          )}

          {task.candidateEmail && (
            <button
              type="button"
              className="btn-reachout-action action-email"
              onClick={handleEmailClick}
              title="1-Click Contextual Email"
              aria-label={`Email ${task.candidateName}`}
            >
              <Mail size={13} />
              <span>Email</span>
            </button>
          )}

          {task.studentId ? (
            <Link to={`/students/${task.studentId}`} className="btn-record-link" title="Open Student 360° Profile">
              <span>Vault</span>
              <ExternalLink size={12} />
            </Link>
          ) : (
            <Link to="/pipeline" className="btn-record-link" title="Open Admissions Pipeline">
              <span>Pipeline</span>
              <ExternalLink size={12} />
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDirectComplete(task)}
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            <CheckCircle size={13} style={{ marginRight: '4px' }} />
            <span>Complete</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
