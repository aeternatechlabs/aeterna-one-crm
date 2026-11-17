import React, { useState } from 'react';
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

export const PipelinePage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const [selectedBranch, setSelectedBranch] = useState(
    isSuperAdmin ? 'all' : user?.branch || BRANCHES.BENGALURU
  );
  const [searchQuery, setSearchQuery] = useState('');
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

  // Mutation Hooks (Optimistic with Revert - Rules 13, 14)
  const updateStageMutation = useUpdateStudentStage();
  const toggleDocsMutation = useToggleDocumentVerification();
  const createStudentMutation = useCreateStudent();

  const isMutating = updateStageMutation.isPending;

  // Move stage handler: triggers instantaneous optimistic update
  const handleMoveStage = (student, targetStage) => {
    // If moving to Lost, prompt for reason modal first
    if (targetStage === PIPELINE_STAGES.LOST) {
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

  const handleConfirmLost = (reason) => {
    if (!reasonModalState.student || !reasonModalState.targetStage) return;

    updateStageMutation.mutate({
      studentId: reasonModalState.student._id,
      newStage: reasonModalState.targetStage,
      studentName: reasonModalState.student.studentName,
      reason,
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
            className="pipeline-banner-img"
          />
        </div>
      </div>

      {/* Real-time Metrics Summary */}
      <div className="pipeline-metrics-grid">
        <StatCard
          title="Total Candidates"
          value={stats.total}
          icon={<Users size={18} strokeWidth={2} />}
          color="blue"
        />
        <StatCard
          title="In Counselling"
          value={studentsByStage[PIPELINE_STAGES.COUNSELLING]?.length || 0}
          icon={<MessageSquare size={18} strokeWidth={2} />}
          color="amber"
        />
        <StatCard
          title="Shortlisted"
          value={studentsByStage[PIPELINE_STAGES.SHORTLISTED]?.length || 0}
          icon={<ClipboardList size={18} strokeWidth={2} />}
          color="purple"
        />
        <StatCard
          title="Applications Submitted"
          value={studentsByStage[PIPELINE_STAGES.APPLICATION_SUBMITTED]?.length || 0}
          icon={<Send size={18} strokeWidth={2} />}
          color="cyan"
        />
        <StatCard
          title="Visa / Offer Won"
          value={studentsByStage[PIPELINE_STAGES.OFFER_VISA_WON]?.length || 0}
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
          {PIPELINE_STAGE_ORDER.map((stageKey) => (
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
        targetStageLabel={
          PIPELINE_STAGE_LABELS[reasonModalState.targetStage] || 'Lost / Deferred'
        }
        onClose={() =>
          setReasonModalState({ isOpen: false, student: null, targetStage: null })
        }
        onConfirm={handleConfirmLost}
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
