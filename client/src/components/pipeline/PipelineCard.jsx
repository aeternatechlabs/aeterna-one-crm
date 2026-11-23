import React from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Select } from '../common/Select';
import { useAuth } from '../../context/AuthContext';
import {
  ROLES,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_COLORS,
} from '../../config/constants';

export const PipelineCard = ({
  student,
  onMoveStage,
  onToggleDocs,
  isMutating = false,
}) => {
  const { hasRole, hasBranch } = useAuth();
  const canVerifyDocs =
    hasRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER) &&
    hasBranch(student.branch);
  const canMoveStage =
    hasRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR) &&
    hasBranch(student.branch);

  const currentStageIndex = PIPELINE_STAGE_ORDER.indexOf(student.stage);
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGE_ORDER.length - 1
      ? PIPELINE_STAGE_ORDER[currentStageIndex + 1]
      : null;

  const isOptimistic = Boolean(student._isOptimistic);
  const stageColor = PIPELINE_STAGE_COLORS[student.stage] || {
    bg: '#f1f5f9',
    text: '#475569',
  };

  const handleStageSelect = (e) => {
    const targetStage = e.target.value;
    if (targetStage && targetStage !== student.stage) {
      onMoveStage(student, targetStage);
    }
    e.target.value = '';
  };

  const handleDragStart = (e) => {
    if (!canMoveStage || isMutating) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        _id: student._id,
        studentName: student.studentName,
        stage: student.stage,
        branch: student.branch,
        documentsVerified: student.documentsVerified,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`pipeline-card ${isOptimistic ? 'pipeline-card-optimistic' : ''}`}
      id={`student-card-${student._id}`}
      style={{ borderLeftColor: stageColor.text }}
      draggable={canMoveStage && !isMutating}
      onDragStart={handleDragStart}
    >
      {/* Top Header: Student Name & Destination */}
      <div className="pipeline-card-header">
        <div className="pipeline-card-title-group">
          <h4 className="pipeline-student-name">{student.studentName}</h4>
          <span className="pipeline-student-email">{student.email}</span>
        </div>
        <Badge variant="info" size="sm">
          <Globe size={11} strokeWidth={2} className="inline mr-1" />
          {student.destination || 'Global'}
        </Badge>
      </div>

      {/* Course & Target University */}
      <div className="pipeline-card-meta">
        <div className="pipeline-course-title">{student.programme}</div>
        {student.university && (
          <div className="pipeline-uni-name">
            <Building2 size={13} strokeWidth={2} className="inline mr-1 opacity-75" />
            <span>{student.university}</span>
          </div>
        )}
      </div>

      {/* Intake & Branch Badges */}
      <div className="pipeline-badge-row">
        <span className="pipeline-intake-pill">
          <Calendar size={11} strokeWidth={2} className="inline mr-1 opacity-75" />
          {student.intake || 'Fall 2026'}
        </span>
        <span className="pipeline-branch-pill">
          <MapPin size={11} strokeWidth={2} className="inline mr-1 opacity-75" />
          {student.branch}
        </span>
      </div>

      {/* Document Verification Status with 1-Click Toggle */}
      <div className="pipeline-doc-verification-box">
        <div className="pipeline-doc-status-info">
          {student.documentsVerified ? (
            <span className="doc-status-badge doc-status-verified">
              <CheckCircle2 size={12} strokeWidth={2.5} className="inline mr-1 text-success" />
              Docs Verified
            </span>
          ) : (
            <span className="doc-status-badge doc-status-pending">
              <Clock size={12} strokeWidth={2.5} className="inline mr-1 text-warning" />
              Docs Pending
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn-toggle-doc"
          title={
            !canVerifyDocs
              ? 'Document verification requires Application Officer or Branch Manager permissions'
              : student.documentsVerified
              ? 'Click to set docs as unverified'
              : 'Click to mark documents as verified'
          }
          onClick={() => onToggleDocs(student)}
          disabled={isMutating || !canVerifyDocs}
        >
          {student.documentsVerified ? 'Mark Unverified' : 'Mark Verified'}
        </button>
      </div>

      {/* Explanatory hint for testing validation rollback */}
      {!student.documentsVerified && student.stage === PIPELINE_STAGES.SHORTLISTED && (
        <div className="pipeline-rollback-tip">
          <Zap size={13} strokeWidth={2.2} className="inline mr-1 text-warning" />
          <strong>Rollback Test:</strong> Moving to <em>Application Submitted</em> will be rejected by backend and revert!
        </div>
      )}

      {isOptimistic && (
        <div className="pipeline-optimistic-indicator">
          <span className="spinner-xs" /> Instant Update applied (validating...)
        </div>
      )}

      {/* Quick Stage Actions Footer */}
      <div className="pipeline-card-actions">
        {nextStage && (
          <button
            type="button"
            className="btn-quick-advance"
            onClick={() => onMoveStage(student, nextStage)}
            disabled={isMutating || !canMoveStage}
            title={
              !canMoveStage
                ? 'Stage movement requires Counsellor or Manager permissions'
                : `Advance directly to ${PIPELINE_STAGE_LABELS[nextStage]}`
            }
          >
            <span>Advance</span>
            <ArrowRight size={13} strokeWidth={2.2} className="inline ml-1" />
          </button>
        )}

        <div className="pipeline-move-select-wrapper">
          <Select
            variant="compact"
            value=""
            placeholder={!canMoveStage ? 'No permission' : 'Move stage...'}
            placement="top"
            align="right"
            onChange={handleStageSelect}
            options={PIPELINE_STAGE_ORDER.map((s) => ({
              value: s,
              label: PIPELINE_STAGE_LABELS[s],
              disabled: s === student.stage,
            }))}
            disabled={isMutating || !canMoveStage}
            className="pipeline-card-stage-select"
            aria-label="Move student to another stage"
          />
        </div>
      </div>
    </div>
  );
};
