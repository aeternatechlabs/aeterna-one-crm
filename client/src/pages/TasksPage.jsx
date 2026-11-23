import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useDailyQueue, useTasks, useTaskMutations } from '../hooks/useTaskQueries';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskDispositionModal } from '../components/tasks/TaskDispositionModal';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  BRANCH_LABELS,
  REACHOUT_CHANNELS,
} from '../config/constants';

const TAB_OPTIONS = [
  { id: 'dueToday', label: "Today's Due" },
  { id: 'overdue', label: 'Overdue' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All Active' },
];

export const TasksPage = () => {
  const { user } = useAuth();
  const { selectedBranch, setSelectedBranch, isBranchSwitchable } = useBranch();

  const [activeTab, setActiveTab] = useState('dueToday');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeDispositionTask, setActiveDispositionTask] = useState(null);
  const [initialReachoutChannel, setInitialReachoutChannel] = useState(REACHOUT_CHANNELS.WHATSAPP);

  const [activeDirectCompleteTask, setActiveDirectCompleteTask] = useState(null);
  const [completionOutcome, setCompletionOutcome] = useState('Task Completed — Discussion Logged');
  const [completionNotes, setCompletionNotes] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    candidateName: '',
    candidatePhone: '',
    candidateEmail: '',
    candidateProgram: '',
    title: '',
    taskType: TASK_TYPES.CALL_FOLLOWUP,
    priority: TASK_PRIORITIES.MEDIUM,
    dueDate: '',
  });

  const queryFilters = useMemo(() => {
    return {
      branch: selectedBranch,
      priority: priorityFilter || undefined,
    };
  }, [selectedBranch, priorityFilter]);

  const { queue, stats, isLoading: isQueueLoading } = useDailyQueue(queryFilters);
  const { tasks: allTasks, isLoading: isAllTasksLoading } = useTasks(queryFilters, {
    enabled: activeTab === 'all',
  });

  const {
    logReachoutMutation,
    completeTaskMutation,
    createTaskMutation,
  } = useTaskMutations();

  // Active task list according to selected tab and search
  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'dueToday') {
      list = queue.dueToday || [];
    } else if (activeTab === 'overdue') {
      list = queue.overdue || [];
    } else if (activeTab === 'upcoming') {
      list = queue.upcoming || [];
    } else {
      list = allTasks || [];
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.trim().toLowerCase();
    return list.filter((t) => {
      const matchName = (t.candidateName || '').toLowerCase().includes(query);
      const matchTitle = (t.title || '').toLowerCase().includes(query);
      const matchPhone = (t.candidatePhone || '').toLowerCase().includes(query);
      return matchName || matchTitle || matchPhone;
    });
  }, [activeTab, queue, allTasks, searchQuery]);

  const dailyGoal = stats.dailyTarget || 25;
  const completedToday = stats.completedTodayCount || 0;
  const progressPercent = Math.min(Math.round((completedToday / dailyGoal) * 100), 100);

  const handleOpenDisposition = (task, channel) => {
    setInitialReachoutChannel(channel || REACHOUT_CHANNELS.WHATSAPP);
    setActiveDispositionTask(task);
  };

  const handleLogReachoutSubmit = (reachoutData) => {
    if (!activeDispositionTask) return;
    logReachoutMutation.mutate(
      { id: activeDispositionTask._id, reachoutData },
      {
        onSuccess: () => {
          setActiveDispositionTask(null);
        },
      }
    );
  };

  const handleOpenDirectComplete = (task) => {
    setActiveDirectCompleteTask(task);
    setCompletionOutcome('Task Completed — Discussion Logged');
    setCompletionNotes('');
  };

  const handleDirectCompleteSubmit = (e) => {
    e.preventDefault();
    if (!activeDirectCompleteTask || completionNotes.trim().length < 5) return;

    completeTaskMutation.mutate(
      {
        id: activeDirectCompleteTask._id,
        completionData: {
          outcome: completionOutcome,
          notes: completionNotes.trim(),
        },
      },
      {
        onSuccess: () => {
          setActiveDirectCompleteTask(null);
          setCompletionNotes('');
        },
      }
    );
  };

  const handleCreateTaskSubmit = (e) => {
    e.preventDefault();
    if (!createForm.candidateName.trim() || !createForm.title.trim() || !createForm.dueDate) return;

    createTaskMutation.mutate(
      {
        ...createForm,
        branch: selectedBranch !== 'all' ? selectedBranch : user?.branch !== 'all' ? user?.branch : 'bengaluru',
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
          setCreateForm({
            candidateName: '',
            candidatePhone: '',
            candidateEmail: '',
            candidateProgram: '',
            title: '',
            taskType: TASK_TYPES.CALL_FOLLOWUP,
            priority: TASK_PRIORITIES.MEDIUM,
            dueDate: '',
          });
        },
      }
    );
  };

  const isLoading = isQueueLoading || (activeTab === 'all' && isAllTasksLoading);

  return (
    <div className="tasks-page-container">
      {/* 1. Velocity Progress Card */}
      <section className="tasks-velocity-card" aria-label="Daily Follow-up Velocity">
        <div className="tasks-velocity-header">
          <div className="tasks-velocity-title-group">
            <h2>Daily Reach-Out & Follow-up Velocity</h2>
            <div className="tasks-velocity-subtitle">
              Target: {dailyGoal} daily reach-outs per counsellor • Current: {completedToday} completed today ({progressPercent}%)
            </div>
          </div>

          <div className="tasks-velocity-stats">
            <span className="velocity-stat-pill stat-goal">
              <CheckCircle size={13} />
              <span>{completedToday} / {dailyGoal} Daily Goal</span>
            </span>
            {stats.overdueCount > 0 && (
              <span className="velocity-stat-pill stat-overdue">
                <AlertTriangle size={13} />
                <span>{stats.overdueCount} Overdue</span>
              </span>
            )}
            <span className="velocity-stat-pill">
              <Clock size={13} />
              <span>{stats.dueTodayCount} Due Today</span>
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              style={{ padding: '6px 14px' }}
            >
              <Plus size={14} style={{ marginRight: '4px' }} />
              <span>Schedule Follow-up</span>
            </Button>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="velocity-progress-track">
          <div
            className="velocity-progress-fill"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
      </section>

      {/* 2. Controls & Tabs Bar */}
      <div className="tasks-controls-bar">
        <div className="tasks-tabs-nav" role="tablist">
          <button
            type="button"
            className={`task-tab-btn ${activeTab === 'dueToday' ? 'active' : ''}`}
            onClick={() => setActiveTab('dueToday')}
            role="tab"
            aria-selected={activeTab === 'dueToday'}
          >
            <span>Today's Due</span>
            <span className="task-tab-count">{stats.dueTodayCount || 0}</span>
          </button>

          <button
            type="button"
            className={`task-tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveTab('overdue')}
            role="tab"
            aria-selected={activeTab === 'overdue'}
          >
            <span>Overdue</span>
            <span className="task-tab-count" style={{ color: stats.overdueCount > 0 ? '#dc2626' : 'inherit' }}>
              {stats.overdueCount || 0}
            </span>
          </button>

          <button
            type="button"
            className={`task-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
            role="tab"
            aria-selected={activeTab === 'upcoming'}
          >
            <span>Upcoming</span>
            <span className="task-tab-count">{stats.upcomingCount || 0}</span>
          </button>

          <button
            type="button"
            className={`task-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            role="tab"
            aria-selected={activeTab === 'all'}
          >
            <span>All Active</span>
            <span className="task-tab-count">{stats.totalActive || 0}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Input
            placeholder="Search candidate, phone, task..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px', padding: '6px 10px', fontSize: '12px' }}
          />

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Priorities' },
              { value: TASK_PRIORITIES.URGENT, label: 'Urgent' },
              { value: TASK_PRIORITIES.HIGH, label: 'High' },
              { value: TASK_PRIORITIES.MEDIUM, label: 'Medium' },
              { value: TASK_PRIORITIES.LOW, label: 'Low' },
            ]}
          />
        </div>
      </div>

      {/* 3. Task Cards Queue */}
      <div className="tasks-queue-list">
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <LoadingSpinner text="Loading counsellor task queue..." />
          </div>
        ) : currentList.length === 0 ? (
          <div className="tasks-empty-state">
            <CheckCircle size={36} style={{ color: '#2e7d32', margin: '0 auto 8px' }} />
            <h3>All clear!</h3>
            <p>
              {activeTab === 'overdue'
                ? 'Zero overdue tasks. Operational follow-up SLAs are 100% on track!'
                : activeTab === 'dueToday'
                ? "All tasks scheduled for today have been completed. Great velocity! 🎉"
                : 'No tasks matching your current filter.'}
            </p>
          </div>
        ) : (
          currentList.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onOpenDisposition={handleOpenDisposition}
              onDirectComplete={handleOpenDirectComplete}
            />
          ))
        )}
      </div>

      {/* 4. 1-Click Reach-Out Disposition Modal */}
      {activeDispositionTask && (
        <TaskDispositionModal
          isOpen={Boolean(activeDispositionTask)}
          onClose={() => setActiveDispositionTask(null)}
          task={activeDispositionTask}
          initialChannel={initialReachoutChannel}
          onLogReachout={handleLogReachoutSubmit}
          loading={logReachoutMutation.isPending}
        />
      )}

      {/* 5. Complete Task Modal */}
      {activeDirectCompleteTask && (
        <Modal
          isOpen={Boolean(activeDirectCompleteTask)}
          onClose={() => setActiveDirectCompleteTask(null)}
          title={`Complete Task — ${activeDirectCompleteTask.candidateName}`}
          maxWidth="520px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDirectCompleteTask(null)}
                disabled={completeTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDirectCompleteSubmit}
                disabled={completionNotes.trim().length < 5 || completeTaskMutation.isPending}
                loading={completeTaskMutation.isPending}
              >
                <CheckCircle size={14} style={{ marginRight: '4px' }} />
                <span>Verify & Complete</span>
              </Button>
            </div>
          }
        >
          <div className="task-modal-form">
            <div className="task-form-group">
              <label className="task-form-label" htmlFor="complete-outcome-input">
                Completion Outcome / Resolution
              </label>
              <Input
                id="complete-outcome-input"
                value={completionOutcome}
                onChange={(e) => setCompletionOutcome(e.target.value)}
              />
            </div>

            <div className="task-form-group">
              <label className="task-form-label" htmlFor="complete-notes-textarea">
                Operational Notes & Reference <span style={{ color: 'var(--color-maroon-700)' }}>* (min 5 chars)</span>
              </label>
              <textarea
                id="complete-notes-textarea"
                className="task-form-textarea"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Discussed fee payment structure with parents; student will upload receipt."
                rows={3}
              />
              <div className="task-form-char-count">
                <span
                  style={{
                    color: completionNotes.trim().length >= 5 ? '#2e7d32' : 'var(--color-maroon-700)',
                    fontWeight: 600,
                  }}
                >
                  {completionNotes.trim().length} / 5 chars required
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Schedule Follow-up Task Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Schedule Candidate Follow-up Task"
          maxWidth="540px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateTaskSubmit}
                disabled={
                  !createForm.candidateName.trim() ||
                  !createForm.title.trim() ||
                  !createForm.dueDate ||
                  createTaskMutation.isPending
                }
                loading={createTaskMutation.isPending}
              >
                <Plus size={14} style={{ marginRight: '4px' }} />
                <span>Create Task</span>
              </Button>
            </div>
          }
        >
          <div className="task-modal-form">
            <div className="task-form-group">
              <label className="task-form-label" htmlFor="task-create-candidate">
                Candidate Name <span style={{ color: 'var(--color-maroon-700)' }}>*</span>
              </label>
              <Input
                id="task-create-candidate"
                value={createForm.candidateName}
                onChange={(e) => setCreateForm({ ...createForm, candidateName: e.target.value })}
                placeholder="e.g. Rohan Sharma"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="task-form-group">
                <label className="task-form-label" htmlFor="task-create-phone">
                  Phone (for WhatsApp/Call)
                </label>
                <Input
                  id="task-create-phone"
                  value={createForm.candidatePhone}
                  onChange={(e) => setCreateForm({ ...createForm, candidatePhone: e.target.value })}
                  placeholder="+91 98451 12345"
                />
              </div>

              <div className="task-form-group">
                <label className="task-form-label" htmlFor="task-create-email">
                  Candidate Email
                </label>
                <Input
                  id="task-create-email"
                  type="email"
                  value={createForm.candidateEmail}
                  onChange={(e) => setCreateForm({ ...createForm, candidateEmail: e.target.value })}
                  placeholder="rohan@example.com"
                />
              </div>
            </div>

            <div className="task-form-group">
              <label className="task-form-label" htmlFor="task-create-program">
                Target Program / Degree
              </label>
              <Input
                id="task-create-program"
                value={createForm.candidateProgram}
                onChange={(e) => setCreateForm({ ...createForm, candidateProgram: e.target.value })}
                placeholder="e.g. MSc Advanced Computer Science — Imperial College"
              />
            </div>

            <div className="task-form-group">
              <label className="task-form-label" htmlFor="task-create-title">
                Task Title / Action Item <span style={{ color: 'var(--color-maroon-700)' }}>*</span>
              </label>
              <Input
                id="task-create-title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Follow up on university application fee payment"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="task-form-group">
                <label className="task-form-label" htmlFor="task-create-type">
                  Task Type
                </label>
                <Select
                  id="task-create-type"
                  value={createForm.taskType}
                  onChange={(e) => setCreateForm({ ...createForm, taskType: e.target.value })}
                  options={Object.entries(TASK_TYPES).map(([k, v]) => ({
                    value: v,
                    label: TASK_TYPE_LABELS[v] || v,
                  }))}
                />
              </div>

              <div className="task-form-group">
                <label className="task-form-label" htmlFor="task-create-priority">
                  Priority
                </label>
                <Select
                  id="task-create-priority"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  options={Object.entries(TASK_PRIORITIES).map(([k, v]) => ({
                    value: v,
                    label: TASK_PRIORITY_LABELS[v] || v,
                  }))}
                />
              </div>
            </div>

            <div className="task-form-group">
              <label className="task-form-label" htmlFor="task-create-due">
                Scheduled Due Date & Time <span style={{ color: 'var(--color-maroon-700)' }}>*</span>
              </label>
              <Input
                id="task-create-due"
                type="datetime-local"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                required
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
