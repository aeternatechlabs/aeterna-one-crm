import React from 'react';
import {
  Inbox,
  Sparkles,
  PhoneCall,
  UserCheck,
  Calendar,
  MessageSquare,
  ListFilter,
  FileText,
  CheckSquare,
  Send,
  Mail,
  CreditCard,
  PlaneTakeoff,
  ShieldCheck,
  Compass,
  GraduationCap,
  Clock,
  XCircle,
  Award,
} from 'lucide-react';
import { PipelineCard } from './PipelineCard';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_COLORS,
} from '../../config/constants';

const STAGE_ICON_MAP = {
  [PIPELINE_STAGES.NEW]: Sparkles,
  [PIPELINE_STAGES.CONTACTED]: PhoneCall,
  [PIPELINE_STAGES.QUALIFIED]: UserCheck,
  [PIPELINE_STAGES.COUNSELLING_BOOKED]: Calendar,
  [PIPELINE_STAGES.COUNSELLING_COMPLETED]: MessageSquare,
  [PIPELINE_STAGES.SHORTLISTED]: ListFilter,
  [PIPELINE_STAGES.APPLICATION_STARTED]: FileText,
  [PIPELINE_STAGES.DOCUMENTS_COMPLETE]: CheckSquare,
  [PIPELINE_STAGES.SUBMITTED]: Send,
  [PIPELINE_STAGES.OFFER_RECEIVED]: Mail,
  [PIPELINE_STAGES.DEPOSIT_PAID]: CreditCard,
  [PIPELINE_STAGES.VISA_FILED]: PlaneTakeoff,
  [PIPELINE_STAGES.VISA_DECISION]: ShieldCheck,
  [PIPELINE_STAGES.PRE_DEPARTURE]: Compass,
  [PIPELINE_STAGES.ENROLLED]: GraduationCap,
  [PIPELINE_STAGES.DEFERRED]: Clock,
  [PIPELINE_STAGES.LOST]: XCircle,

  // Legacy mappings
  [PIPELINE_STAGES.NEW_ENQUIRY]: Sparkles,
  [PIPELINE_STAGES.COUNSELLING]: MessageSquare,
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: Send,
  [PIPELINE_STAGES.OFFER_VISA_WON]: Award,
};

export const PipelineColumn = ({
  stageKey,
  students = [],
  onMoveStage,
  onToggleDocs,
  isMutating = false,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const stageLabel = PIPELINE_STAGE_LABELS[stageKey] || stageKey;
  const stageColor = PIPELINE_STAGE_COLORS[stageKey] || {
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#475569',
  };
  const StageIcon = STAGE_ICON_MAP[stageKey] || Sparkles;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const student = JSON.parse(dataStr);
      if (student?._id && student.stage !== stageKey) {
        onMoveStage(student, stageKey);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div
      className={`pipeline-column ${isDragOver ? 'pipeline-column-dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
