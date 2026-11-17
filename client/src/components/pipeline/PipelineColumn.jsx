import React from 'react';
import {
  Inbox,
  Sparkles,
  MessageSquare,
  ClipboardList,
  Send,
  Award,
  XCircle,
} from 'lucide-react';
import { PipelineCard } from './PipelineCard';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_COLORS,
} from '../../config/constants';

const STAGE_ICON_MAP = {
  [PIPELINE_STAGES.NEW_ENQUIRY]: Sparkles,
  [PIPELINE_STAGES.COUNSELLING]: MessageSquare,
  [PIPELINE_STAGES.SHORTLISTED]: ClipboardList,
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: Send,
  [PIPELINE_STAGES.OFFER_VISA_WON]: Award,
  [PIPELINE_STAGES.LOST]: XCircle,
};

export const PipelineColumn = ({
  stageKey,
  students = [],
  onMoveStage,
  onToggleDocs,
  isMutating = false,
}) => {
  const stageLabel = PIPELINE_STAGE_LABELS[stageKey] || stageKey;
  const stageColor = PIPELINE_STAGE_COLORS[stageKey] || {
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#475569',
  };
  const StageIcon = STAGE_ICON_MAP[stageKey] || Sparkles;

  return (
    <div className="pipeline-column">
      <div
        className="pipeline-column-header"
        style={{ borderTopColor: stageColor.text }}
      >
        <div className="pipeline-column-title-group">
          <StageIcon
            size={14}
            strokeWidth={2.2}
            style={{ color: stageColor.text }}
            className="flex-shrink-0"
          />
          <h3 className="pipeline-column-title">{stageLabel}</h3>
        </div>
        <span
          className="pipeline-column-count"
          style={{
            backgroundColor: stageColor.bg,
            color: stageColor.text,
            borderColor: stageColor.border,
          }}
        >
          {students.length}
        </span>
      </div>

      <div className="pipeline-column-body">
        {students.length === 0 ? (
          <div className="pipeline-column-empty">
            <Inbox size={26} strokeWidth={1.5} className="empty-box-icon opacity-60" />
            <p className="empty-text">No candidates</p>
          </div>
        ) : (
          students.map((student) => (
            <PipelineCard
              key={student._id}
              student={student}
              onMoveStage={onMoveStage}
              onToggleDocs={onToggleDocs}
              isMutating={isMutating}
            />
          ))
        )}
      </div>
    </div>
  );
};
