import React, { useState, useMemo } from 'react';
import {
  Users,
  MessageSquare,
  ClipboardList,
  Send,
  Trophy,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePipeline } from '../hooks/usePipelineQueries';
import {
  useUpdateStudentStage,
  useToggleDocumentVerification,
  useCreateStudent,
} from '../hooks/usePipelineMutations';
import { PipelineColumn } from '../components/pipeline/PipelineColumn';
import { ReasonModal } from '../components/pipeline/ReasonModal';
import { NewStudentModal } from '../components/pipeline/NewStudentModal';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import admissionsBannerImg from '../assets/modules/03-admissions.webp';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  BRANCHES,
  ROLES,
} from '../config/constants';

const STAGE_GROUPS = [
  { id: 'all', label: 'All Stages', stages: PIPELINE_STAGE_ORDER },
  {
    id: 'enquiry',
    label: '1. Enquiry & Qualification',
    stages: [
      PIPELINE_STAGES.NEW,
      PIPELINE_STAGES.CONTACTED,
      PIPELINE_STAGES.QUALIFIED,
    ],
  },
  {
    id: 'counselling',
    label: '2. Counselling & Shortlist',
    stages: [
      PIPELINE_STAGES.COUNSELLING_BOOKED,
      PIPELINE_STAGES.COUNSELLING_COMPLETED,
      PIPELINE_STAGES.SHORTLISTED,
    ],
  },
  {
    id: 'application',
    label: '3. Applications & Documents',
    stages: [
      PIPELINE_STAGES.APPLICATION_STARTED,
      PIPELINE_STAGES.DOCUMENTS_COMPLETE,
      PIPELINE_STAGES.SUBMITTED,
    ],
  },
  {
    id: 'offers_visa',
    label: '4. Offers & Visa',
    stages: [
      PIPELINE_STAGES.OFFER_RECEIVED,
      PIPELINE_STAGES.DEPOSIT_PAID,
      PIPELINE_STAGES.VISA_FILED,
      PIPELINE_STAGES.VISA_DECISION,
    ],
  },
  {
    id: 'outcome',
    label: '5. Pre-departure & Outcome',
    stages: [
      PIPELINE_STAGES.PRE_DEPARTURE,
      PIPELINE_STAGES.ENROLLED,
      PIPELINE_STAGES.DEFERRED,
      PIPELINE_STAGES.LOST,
    ],
  },
];

export const PipelinePage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const [selectedBranch, setSelectedBranch] = useState(
    isSuperAdmin ? 'all' : user?.branch || BRANCHES.BENGALURU
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [simulateError, setSimulateError] = useState(false);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reasonModalState, setReasonModalState] = useState({
    isOpen: false,
    student: null,
    targetStage: null,
  });

  // Query Hook (TanStack Query Cache - Rule 12)
  const filters = {
    branch: selectedBranch,
    search: searchQuery,
  };
  const {
    studentsByStage,
    stats,
    isLoading,
    isError,
    error,
    refetch,
  } = usePipeline(filters);

  // Filtered stage columns based on active category tab
  const displayedStages = useMemo(() => {
    const group = STAGE_GROUPS.find((g) => g.id === activeGroup);
    return group ? group.stages : PIPELINE_STAGE_ORDER;
  }, [activeGroup]);

  // Mutation Hooks (Optimistic with Revert - Rules 13, 14)
  const updateStageMutation = useUpdateStudentStage();
  const toggleDocsMutation = useToggleDocumentVerification();
  const createStudentMutation = useCreateStudent();

  const isMutating = updateStageMutation.isPending;

  // Move stage handler: triggers instantaneous optimistic update
  const handleMoveStage = (student, targetStage) => {
    // If moving to Lost or Deferred, prompt for reason modal first
    if (targetStage === PIPELINE_STAGES.LOST || targetStage === PIPELINE_STAGES.DEFERRED) {
      setReasonModalState({
        isOpen: true,
        student,
        targetStage,
      });
      return;
    }

    // Execute optimistic stage transition
    updateStageMutation.mutate({
      studentId: student._id,
      newStage: targetStage,
      studentName: student.studentName,
      simulateError,
    });
  };

  const handleConfirmReason = ({ reason, deferredIntake }) => {
    if (!reasonModalState.student || !reasonModalState.targetStage) return;

    updateStageMutation.mutate({
      studentId: reasonModalState.student._id,
      newStage: reasonModalState.targetStage,
      studentName: reasonModalState.student.studentName,
      reason,
      deferredIntake,
      simulateError,
    });

    setReasonModalState({ isOpen: false, student: null, targetStage: null });
  };

  const handleToggleDocs = (student) => {
    toggleDocsMutation.mutate({
      studentId: student._id,
      documentsVerified: !student.documentsVerified,
      studentName: student.studentName,
    });
  };

  const handleCreateStudent = (formData) => {
    createStudentMutation.mutate(formData);
  };

  return (
    <div className="pipeline-page">
      {/* Page Header Banner with Module Artwork */}
      <div className="pipeline-header-banner">
        <div className="pipeline-header-content">
          <div>
            <h1 className="page-title">Admissions Pipeline</h1>
            <p className="page-subtitle">
              Overseas Admissions Kanban — Instantaneous Optimistic Updates with Automatic Revert
            </p>
          </div>
          <div className="page-header-actions">
            <Button
              variant="primary"
              onClick={() => setIsNewModalOpen(true)}
              className="btn-new-candidate"
            >
              <Plus size={16} strokeWidth={2.5} className="mr-1.5" />
              <span>New Candidate</span>
            </Button>
          </div>
        </div>

        {/* Admissions Module Illustration Artwork */}
        <div className="pipeline-banner-artwork" aria-hidden="true">
          <img
            src={admissionsBannerImg}
            alt="Admissions & Visa Processing"
            className="module-banner-img"
            loading="eager"
          />
        </div>
      </div>

      {/* KPI Stat Cards Row */}
      <div className="pipeline-stats-grid">
        <StatCard
          title="Total Candidates"
          value={stats.total}
          icon={<Users size={18} strokeWidth={2} />}
          color="blue"
        />
        <StatCard
          title="In Pipeline"
          value={stats.activeApplications}
          icon={<ClipboardList size={18} strokeWidth={2} />}
          color="amber"
        />
        <StatCard
          title="Docs Verified"
          value={stats.verifiedDocs}
          icon={<CheckCircle2 size={18} strokeWidth={2} />}
          color="cyan"
        />
        <StatCard
          title="Docs Pending"
          value={stats.pendingDocs}
          icon={<AlertTriangle size={18} strokeWidth={2} />}
          color="purple"
        />
        <StatCard
          title="Enrolled"
          value={stats.enrolled}
          icon={<Trophy size={18} strokeWidth={2} />}
          color="green"
        />
      </div>

      {/* Interactive Testing & Simulation Banner */}
      <div className="pipeline-simulation-banner">
        <div className="simulation-banner-info">
          <div className="simulation-banner-title">
            <Zap size={18} strokeWidth={2.2} className="simulation-pulse-icon" />
            <span>Optimistic Transitions & Automatic Revert Engine</span>
          </div>
          <p className="simulation-banner-desc">
            Candidate stage moves update <strong>visually instantaneously</strong> in the UI. If backend validation fails, the change automatically rolls back to the previous column with an explanation toast.
          </p>
          <div className="simulation-test-steps">
            <span className="simulation-step-tag">
              <strong>Test Case 1:</strong> Try moving <em>Aarav Sharma</em> (Docs Pending) from <strong>Shortlisted → Application Submitted</strong>. Backend rejects unverified documents and reverts instantly!
            </span>
            <span className="simulation-step-tag">
              <strong>Test Case 2:</strong> Click <em>Mark Verified</em> on Aarav, then advance — transition succeeds!
            </span>
          </div>
        </div>

        {/* Global Validation Error Simulation Toggle */}
        <div className="simulation-toggle-box">
          <label className="simulation-toggle-label" htmlFor="simulate-error-switch">
            <input
              id="simulate-error-switch"
              type="checkbox"
              className="simulation-checkbox"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
            />
            <span className="simulation-toggle-text">
              Simulate Backend 400 Failure
            </span>
          </label>
          <span
            className={`simulation-mode-badge ${
              simulateError ? 'mode-active' : 'mode-inactive'
            }`}
          >
            {simulateError ? (
              <>
                <AlertTriangle size={12} strokeWidth={2.5} className="mr-1 inline" />
                <span>SIMULATING REJECTION</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={12} strokeWidth={2.5} className="mr-1 inline" />
                <span>NORMAL MODE</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="pipeline-controls-bar">
        <div className="pipeline-search-box">
          <Input
            placeholder="Search candidates by name, course, university or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isSuperAdmin && (
          <div className="pipeline-branch-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="selector-label" htmlFor="branch-filter">Branch:</label>
            <div style={{ minWidth: '180px' }}>
              <Select
                id="branch-filter"
                name="branch"
                variant="compact"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                options={[
                  { value: 'all', label: 'All Branches' },
                  { value: BRANCHES.BENGALURU, label: 'Bengaluru Branch' },
                  { value: BRANCHES.MYSURU, label: 'Mysuru Branch' },
                  { value: BRANCHES.BELAGAVI, label: 'Belagavi Branch' },
                ]}
                aria-label="Filter pipeline by branch"
              />
            </div>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          title="Refresh pipeline from server"
        >
          ↻ Refresh
        </Button>
      </div>

      {/* Stage Group Category Navigation Tabs */}
      <div className="pipeline-stage-tabs" role="tablist" aria-label="Pipeline stage groups">
        {STAGE_GROUPS.map((group) => {
          const groupCount = group.stages.reduce(
            (acc, s) => acc + (studentsByStage[s]?.length || 0),
            0
          );
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={activeGroup === group.id}
              className={`pipeline-stage-tab ${activeGroup === group.id ? 'active' : ''}`}
              onClick={() => setActiveGroup(group.id)}
            >
              <span>{group.label}</span>
              <span className="pipeline-tab-count">{groupCount}</span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="pipeline-loading-container">
          <LoadingSpinner text="Synchronizing Admissions Pipeline..." />
        </div>
      ) : isError ? (
        <div className="pipeline-error-container">
          <p>Failed to load admissions pipeline: {error?.message}</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="pipeline-kanban-board">
          {displayedStages.map((stageKey) => (
            <PipelineColumn
              key={stageKey}
              stageKey={stageKey}
              students={studentsByStage[stageKey] || []}
              onMoveStage={handleMoveStage}
              onToggleDocs={handleToggleDocs}
              isMutating={isMutating}
            />
          ))}
        </div>
      )}

      {/* Reason Modal for Lost / Deferred */}
      <ReasonModal
        isOpen={reasonModalState.isOpen}
        student={reasonModalState.student}
        targetStage={reasonModalState.targetStage}
        targetStageLabel={
          PIPELINE_STAGE_LABELS[reasonModalState.targetStage] || 'Lost / Deferred'
        }
        onClose={() =>
          setReasonModalState({ isOpen: false, student: null, targetStage: null })
        }
        onConfirm={handleConfirmReason}
      />

      {/* New Candidate Modal */}
      <NewStudentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateStudent}
        currentBranch={selectedBranch}
        isSubmitting={createStudentMutation.isPending}
      />
    </div>
  );
};
