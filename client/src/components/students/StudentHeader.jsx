import React from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const StudentHeader = ({
  student,
  onAddNote,
  onBack,
  isMobileDrawer = false,
}) => {
  if (!student) return null;

  const initials = (student.studentName || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const statusVariantMap = {
    active: 'success',
    enrolled: 'primary',
    archived: 'default',
    withdrawn: 'danger',
    alumni: 'warning',
  };

  const branchLabelMap = {
    bengaluru: 'Bengaluru HQ',
    mysuru: 'Mysuru Branch',
    belagavi: 'Belagavi Branch',
  };

  return (
    <header className="student-profile-header">
      <div className="student-header-top">
        <div className="student-avatar-wrap">
          <div className="student-avatar-circle" aria-hidden="true">
            {initials}
          </div>
        </div>

        <div className="student-identity-meta">
          <div className="student-name-row">
            <h1 className="student-name-heading">{student.studentName}</h1>
            <span className="student-id-tag" title="Unique Student Registration ID">
              {student.studentId}
            </span>
            <Badge
              variant={statusVariantMap[student.status] || 'default'}
              size="md"
              className="student-status-badge"
            >
              {student.status?.toUpperCase() || 'ACTIVE'}
            </Badge>
          </div>

          <div className="student-attributes-row">
            <span className="student-attribute-pill branch-pill">
              <span className="branch-dot" />
              {branchLabelMap[student.branch] || student.branch}
            </span>

            {student.email && (
              <a
                href={`mailto:${student.email}`}
                className="student-attribute-pill contact-pill email-pill"
                title="Send Email"
              >
                ✉ {student.email}
              </a>
            )}

            {student.phone && (
              <a
                href={`tel:${student.phone}`}
                className="student-attribute-pill contact-pill phone-pill"
                title="Call Phone"
              >
                ☎ {student.phone}
              </a>
            )}

            {student.assignedCounsellorName && (
              <span className="student-attribute-pill staff-pill" title="Assigned Counsellor">
                👤 Counsellor: {student.assignedCounsellorName}
              </span>
            )}
          </div>
        </div>

        <div className="student-header-actions">
          {onAddNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddNote}
              className="btn-add-note"
            >
              ✍ Add Note
            </Button>
          )}

          {onBack && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="btn-back-directory"
            >
              ← Back to Directory
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
