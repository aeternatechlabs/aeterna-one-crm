import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  GraduationCap,
  FileText,
  Plane,
  TrendingUp,
  Sparkles,
  CheckSquare,
  ArrowRight,
  Workflow,
  Clock,
  MapPin,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useDashboardSummary, useSystemHealth } from '../hooks/useDashboardQueries';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Lotus } from '../components/common/Lotus';
import { BRANCH_LABELS, ROLES } from '../config/constants';
import skylineBannerImg from '../assets/heritage/vidhana-soudha.webp';

// Operational task disposition outcomes mapped by task type
const TASK_OUTCOME_OPTIONS = {
  call_followup: [
    { value: 'Call Completed — Discussion Notes Recorded', label: 'Call Completed — Discussion Notes Recorded' },
    { value: 'Student Requested Callback — Rescheduled', label: 'Student Requested Callback — Rescheduled' },
    { value: 'CAS / Visa Documents Verified with Student', label: 'CAS / Visa Documents Verified with Student' },
    { value: 'Call Unanswered — WhatsApp Follow-up Dispatched', label: 'Call Unanswered — WhatsApp Follow-up Dispatched' },
  ],
  sop_review: [
    { value: 'SOP Approved — Cleared for Application', label: 'SOP Approved — Cleared for Application' },
    { value: 'Revisions Requested — Feedback Shared with Student', label: 'Revisions Requested — Feedback Shared with Student' },
    { value: 'Draft Checked — Minor Edits Required', label: 'Draft Checked — Minor Edits Required' },
  ],
  visa_mock: [
    { value: 'Mock Interview Cleared — High Confidence', label: 'Mock Interview Cleared — High Confidence' },
    { value: 'Interview Completed — Additional Prep Required', label: 'Interview Completed — Additional Prep Required' },
    { value: 'Financial Q&A Cleared — Ready for VFS Slot', label: 'Financial Q&A Cleared — Ready for VFS Slot' },
  ],
  application_submission: [
    { value: 'Application Submitted to University Portal', label: 'Application Submitted to University Portal' },
    { value: 'Pending Student Documents — Action Raised', label: 'Pending Student Documents — Action Raised' },
    { value: 'Application Fee Processed — Receipt Uploaded', label: 'Application Fee Processed — Receipt Uploaded' },
  ],
  default: [
    { value: 'Task Completed — Verification Confirmed', label: 'Task Completed — Verification Confirmed' },
    { value: 'In Progress — Awaiting External Response', label: 'In Progress — Awaiting External Response' },
    { value: 'Rescheduled for Next Working Slot', label: 'Rescheduled for Next Working Slot' },
  ],
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const { selectedBranch, setSelectedBranch, isBranchSwitchable } = useBranch();
  const navigate = useNavigate();

  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === 'super_admin';

  // TanStack Query Cached Dashboard Summary & System Health (Rule 12)
  const {
    summary,
    isLoading: summaryLoading,
    error: summaryErrorObj,
    refetch: refetchSummary,
  } = useDashboardSummary({
    branch: selectedBranch,
    period: selectedPeriod,
  });

  const {
    health,
    isLoading: healthLoading,
    error: healthErrorObj,
  } = useSystemHealth({ enabled: isSuperAdmin });

  const summaryError = summaryErrorObj?.message || null;
  const healthError = healthErrorObj?.message || null;

  // Operational Task Execution & Verification Modal State
  const [activeTaskModal, setActiveTaskModal] = useState(null);
  const [completionOutcome, setCompletionOutcome] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  // Interactive Task List state with full candidate metadata
  const [tasks, setTasks] = useState([
    {
      id: 1,
      text: 'Follow up with Rohan Sharma (UK Sept Intake)',
      type: 'call_followup',
      candidateName: 'Rohan Sharma',
      candidateId: 'AET-BLR-2026-0001',
      program: 'MSc Advanced Computer Science — Imperial College London',
      time: '11:00 AM',
      completed: false,
      completedAt: null,
      completionNotes: '',
      outcome: '',
      link: '/students/AET-BLR-2026-0001',
      linkType: 'student',
      actionLabel: 'Call Follow-up & CAS Verification',
    },
    {
      id: 2,
      text: 'Review SOP for Ananya Patel (Canada)',
      type: 'sop_review',
      candidateName: 'Ananya Patel',
      candidateId: 'Pipeline Lead',
      program: 'Global Full-time MBA — Rotman School of Management',
      time: '12:30 PM',
      completed: false,
      completedAt: null,
      completionNotes: '',
      outcome: '',
      link: '/pipeline',
      linkType: 'pipeline',
      actionLabel: 'SOP Review & Feedback',
    },
    {
      id: 3,
      text: 'Visa mock interview — Karthik Rao',
      type: 'visa_mock',
      candidateName: 'Karthik Rao',
      candidateId: 'AET-BLR-2026-0002',
      program: 'MSc Mechanical Engineering — TU Munich',
      time: '03:00 PM',
      completed: false,
      completedAt: null,
      completionNotes: '',
      outcome: '',
      link: '/students/AET-BLR-2026-0002',
      linkType: 'student',
      actionLabel: 'Conduct Visa Mock Interview',
    },
    {
      id: 4,
      text: 'Submit university application for Sneha Reddy',
      type: 'application_submission',
      candidateName: 'Sneha Reddy',
      candidateId: 'Pipeline Lead',
      program: 'MS Data Science & AI — National University of Singapore',
      time: '04:30 PM',
      completed: true,
      completedAt: '10:15 AM',
      completionNotes: 'Application verified and submitted via NUS portal. Reference: NUS-2026-APP-891',
      outcome: 'Application Submitted to University Portal',
      link: '/pipeline',
      linkType: 'pipeline',
      actionLabel: 'University Portal Submission',
    },
  ]);

  // Synchronize tasks when backend dashboard summary loads
  useEffect(() => {
    if (summary?.tasks && Array.isArray(summary.tasks) && summary.tasks.length > 0) {
      setTasks(summary.tasks);
    }
  }, [summary]);

  const handleOpenTask = (task) => {
    setActiveTaskModal(task);
    const options = TASK_OUTCOME_OPTIONS[task.type] || TASK_OUTCOME_OPTIONS.default;
    setCompletionOutcome(task.outcome || options[0].value);
    setCompletionNotes(task.completionNotes || '');
  };

  const handleCloseTaskModal = () => {
    setActiveTaskModal(null);
    setCompletionOutcome('');
    setCompletionNotes('');
  };

  const handleVerifyAndCompleteTask = () => {
    if (!activeTaskModal) return;
    if (!completionNotes.trim() || completionNotes.trim().length < 5) {
      toast.error('Operational notes must be at least 5 characters to ensure audit integrity.');
      return;
    }
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTaskModal.id
          ? {
              ...t,
              completed: true,
              completedAt: nowTime,
              outcome: completionOutcome,
              completionNotes: completionNotes.trim(),
            }
          : t
      )
    );
    toast.success(`Task for ${activeTaskModal.candidateName} verified and logged successfully!`);
    handleCloseTaskModal();
  };

  const handleReopenTask = () => {
    if (!activeTaskModal) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTaskModal.id
          ? {
              ...t,
              completed: false,
              completedAt: null,
              outcome: '',
              completionNotes: '',
            }
          : t
      )
    );
    toast('Task reopened for follow-up and action verification.', { icon: '🔄' });
    handleCloseTaskModal();
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Sachin';
  const activeBranchName = BRANCH_LABELS[selectedBranch] || BRANCH_LABELS[user?.branch] || 'Bengaluru (HQ)';

  // Compute Lead Trend Dynamic Spline Chart Parameters
  const trendData = summary?.leadTrend?.length
    ? summary.leadTrend
    : [
        { label: 'Aug', count: 45 },
        { label: 'Sep', count: 72 },
        { label: 'Oct', count: 110 },
        { label: 'Nov', count: 185 },
        { label: 'Dec', count: 210 },
        { label: 'Jan', count: 278 },
      ];

  const peakCount = Math.max(...trendData.map((d) => d.count), 1);
  const yMax = Math.ceil((peakCount * 1.2) / 40) * 40 || 320;
  const xBase = [60, 150, 240, 330, 420, 510];

  const coords = trendData.map((d, idx) => {
    const x = xBase[idx] || 60 + idx * 90;
    const ratio = Math.min(d.count / yMax, 1);
    const y = 180 - ratio * 140;
    return { x, y: Math.round(y), count: d.count, label: d.label };
  });

  const peakCoord = coords.reduce(
    (prev, curr) => (curr.count >= prev.count ? curr : prev),
    coords[coords.length - 1]
  );

  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = coords.length > 0 ? `${pathD} L ${coords[coords.length - 1].x} 180 L ${coords[0].x} 180 Z` : '';

  return (
    <div className="dashboard-page">
      {/* 1. Hero Greeting & Heritage Skyline Banner */}
      <section className="dashboard-hero-banner" aria-label="Hero Welcome Banner">
        <div className="hero-left-content">
          <span className="hero-greeting-pill">
            Good Morning, {firstName} <Sparkles size={14} className="hero-sparkle-icon" aria-hidden="true" />
          </span>
          <h1 className="hero-brand-heading">AETERNA ONE</h1>
          <p className="hero-brand-sub">
            Overseas Education CRM • <span style={{ color: 'var(--color-gold-300)', fontWeight: 700 }}>{activeBranchName}</span>
          </p>
          <div className="hero-gold-accent-line" />
        </div>

        {/* Vidhana Soudha Palace Heritage Skyline Artwork */}
        <div className="hero-skyline-wrapper" aria-hidden="true">
          <img
            src={skylineBannerImg}
            alt="Vidhana Soudha Palace and Blooming Gardens"
            className="hero-skyline-photo"
          />
        </div>
      </section>

      {/* 2. Key Metrics 4-Card Grid */}
      <section className="dashboard-metrics-grid" aria-label="Key Performance Metrics">
        {/* Card 1: Total Leads */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <Users size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Total Leads</span>
            <span className="metric-value-number">
              {summaryLoading ? '...' : (summary?.metrics?.totalLeads ?? 1384).toLocaleString()}
            </span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+18%</span>
            </span>
          </div>
          {/* Karnataka Heritage Lotus Emblem Watermark */}
          <Lotus className="metric-card-watermark" />
        </div>

        {/* Card 2: Active Students */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <GraduationCap size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Active Students</span>
            <span className="metric-value-number">
              {summaryLoading ? '...' : (summary?.metrics?.activeStudents ?? 392).toLocaleString()}
            </span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+22%</span>
            </span>
          </div>
          <Lotus className="metric-card-watermark" />
        </div>

        {/* Card 3: Applications */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <FileText size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Applications</span>
            <span className="metric-value-number">
              {summaryLoading ? '...' : (summary?.metrics?.totalApplications ?? 176).toLocaleString()}
            </span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+20%</span>
            </span>
          </div>
          <Lotus className="metric-card-watermark" />
        </div>

        {/* Card 4: Visas Approved */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <Plane size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Visas Approved</span>
            <span className="metric-value-number">
              {summaryLoading ? '...' : (summary?.metrics?.visasApproved ?? 118).toLocaleString()}
            </span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+26%</span>
            </span>
          </div>
          <Lotus className="metric-card-watermark" />
        </div>
      </section>

      {/* 3. Admissions Pipeline Progress Ribbon */}
      <section className="dashboard-pipeline-card" aria-label="Admissions Pipeline Overview">
        <div className="pipeline-card-header-row">
          <div className="pipeline-title-group">
            <span className="pipeline-icon-circle" aria-hidden="true">
              <Workflow size={20} strokeWidth={2} />
            </span>
            <h2 className="pipeline-header-title">Admissions Pipeline</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isBranchSwitchable && (
              <div style={{ width: '150px' }}>
                <Select
                  variant="compact"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Branches' },
                    { value: 'bengaluru', label: 'Bengaluru (HQ)' },
                    { value: 'mysuru', label: 'Mysuru' },
                    { value: 'belagavi', label: 'Belagavi' },
                  ]}
                  align="right"
                  aria-label="Filter Admissions Pipeline by Operating Branch"
                />
              </div>
            )}
            <Link to="/pipeline" className="pipeline-link-btn">
              <span>View Pipeline</span>
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* 7-Stage Chevrons Grid */}
        <div className="pipeline-chevrons-grid">
          <div className="chevron-stage-box">
            <span className="chevron-stage-title">New</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.new ?? 284)}
            </span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Qualified</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.qualified ?? 146)}
            </span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Counselling</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.counselling ?? 112)}
            </span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Application</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.application ?? 88)}
            </span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Offer</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.offer ?? 64)}
            </span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Visa</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.visa ?? 38)}
            </span>
          </div>

          {/* Highlighted 'Enrolled' Final Milestone Stage */}
          <div className="chevron-stage-box chevron-stage-enrolled">
            <span className="chevron-stage-title">Enrolled</span>
            <span className="chevron-stage-number">
              {summaryLoading ? '...' : (summary?.chevrons?.enrolled ?? 32)}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Bottom Two-Column Suite: Lead Trend & Today's Tasks */}
      <div className="dashboard-two-col-grid">
        {/* Left Column: Lead Trend Spline Area Chart */}
        <section className="lead-trend-card" aria-label="Lead Trend Analytics">
          <div className="trend-card-top">
            <div className="trend-card-heading">
              <TrendingUp size={18} strokeWidth={2} aria-hidden="true" />
              <h3>Lead Trend</h3>
            </div>
            <div style={{ width: '140px' }}>
              <Select
                variant="compact"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                options={[
                  { value: '7', label: 'Last 7 Days' },
                  { value: '30', label: 'Last 30 Days' },
                  { value: '90', label: 'Last 90 Days' },
                ]}
                align="right"
                aria-label="Filter Lead Trend by Period"
              />
            </div>
          </div>

          {/* Responsive SVG Area Spline Chart */}
          <div className="trend-chart-svg-wrap">
            <svg
              viewBox="0 0 540 220"
              className="w-full h-full"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="leadTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-maroon-850)" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="var(--color-maroon-850)" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="var(--color-maroon-850)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              <g style={{ opacity: 0.25, stroke: 'var(--color-border-default)' }}>
                <line x1="45" y1="20" x2="520" y2="20" strokeDasharray="3 3" />
                <line x1="45" y1="60" x2="520" y2="60" strokeDasharray="3 3" />
                <line x1="45" y1="100" x2="520" y2="100" strokeDasharray="3 3" />
                <line x1="45" y1="140" x2="520" y2="140" strokeDasharray="3 3" />
                <line x1="45" y1="180" x2="520" y2="180" strokeDasharray="3 3" />
              </g>

              {/* Y-Axis Value Labels */}
              <g
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fill: 'var(--color-text-muted)',
                  textAnchor: 'end',
                }}
              >
                <text x="36" y="24">{yMax}</text>
                <text x="36" y="64">{Math.round(yMax * 0.75)}</text>
                <text x="36" y="104">{Math.round(yMax * 0.5)}</text>
                <text x="36" y="144">{Math.round(yMax * 0.25)}</text>
                <text x="36" y="184">0</text>
              </g>

              {/* Dynamic Smooth Area Path */}
              {areaD && (
                <path
                  d={areaD}
                  fill="url(#leadTrendGradient)"
                />
              )}

              {/* Dynamic Smooth Spline Stroke Curve */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--color-maroon-800)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Dynamic Peak Indicator Dot and Tag Pill */}
              {peakCoord && (
                <>
                  <circle
                    cx={peakCoord.x}
                    cy={peakCoord.y}
                    r="5"
                    fill="var(--color-maroon-850)"
                    stroke="var(--color-bg-surface)"
                    strokeWidth="2.5"
                  />
                  <g transform={`translate(${peakCoord.x - 18}, ${Math.max(peakCoord.y - 32, 10)})`}>
                    <rect
                      x="0"
                      y="0"
                      width="36"
                      height="20"
                      rx="6"
                      fill="var(--color-maroon-850)"
                    />
                    <text
                      x="18"
                      y="14"
                      fill="var(--color-gold-300)"
                      fontSize="11"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {peakCoord.count}
                    </text>
                  </g>
                </>
              )}

              {/* X-Axis Month Markers */}
              <g
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fill: 'var(--color-text-secondary)',
                  textAnchor: 'middle',
                }}
              >
                {coords.map((c) => (
                  <text key={c.label} x={c.x} y="202">{c.label}</text>
                ))}
              </g>
            </svg>
          </div>
        </section>

        {/* Right Column: Today's Tasks Interactive Checklist */}
        <section className="todays-tasks-card" aria-label="Today's Operational Tasks">
          <div className="tasks-card-top">
            <div className="tasks-card-heading">
              <CheckSquare size={18} strokeWidth={2} aria-hidden="true" />
              <h3>Today's Tasks</h3>
            </div>
            <Link to="/tasks" className="tasks-view-all-link">
              <span>View All</span>
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>

          <div className="tasks-checklist-wrap">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="task-item-row"
                onClick={() => handleOpenTask(task)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleOpenTask(task);
                  }
                }}
                title={
                  task.completed
                    ? 'Click to review verified operational audit log'
                    : 'Click to open candidate record and operational verification modal'
                }
              >
                <div className="task-left-info">
                  <input
                    type="checkbox"
                    className="task-checkbox-custom"
                    checked={task.completed}
                    onChange={() => {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTask(task);
                    }}
                    aria-label={`Verify task for ${task.candidateName || task.text}`}
                    title={
                      task.completed
                        ? 'Completed & verified task'
                        : 'Action verification required before completing'
                    }
                  />
                  <span
                    className={`task-desc-text ${
                      task.completed ? 'task-desc-completed' : ''
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task.completed && (
                    <span
                      className="task-verified-badge"
                      title={task.outcome ? `Outcome: ${task.outcome}` : 'Verified'}
                    >
                      <CheckCircle size={11} strokeWidth={2.5} />
                      <span>Verified</span>
                    </span>
                  )}
                  <span className="task-time-badge">
                    <Clock size={11} strokeWidth={2} style={{ display: 'inline', marginRight: '4px' }} />
                    {task.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 5. System Health & Infrastructure Diagnostics (Super Admin Only) */}
      {isSuperAdmin && (
        <section
          className="card"
          style={{
            marginTop: '12px',
            borderColor: 'var(--color-border-subtle)',
            boxShadow: 'var(--shadow-warm-xs)',
          }}
          aria-label="System Diagnostics"
        >
          <div className="card-header">
            <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              System Infrastructure & API Gateway Status
            </h3>
            <span className="card-tag">Live Diagnostics</span>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            {healthLoading ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Checking backend services...
              </p>
            ) : healthError ? (
              <div className="alert alert-warning" style={{ fontSize: '12px' }}>
                <strong>Diagnostics note:</strong> {healthError}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Backend Service:</span>
                  <span className="badge badge-success">{health?.service || 'aeterna-one-crm'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>API Status:</span>
                  <span className="badge badge-success">● {health?.status || 'healthy'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>MongoDB:</span>
                  <span
                    className={`badge ${
                      health?.database === 'connected' ? 'badge-success' : 'badge-warning'
                    }`}
                  >
                    ● {health?.database || 'connected'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Operating Hubs:</span>
                  <span className="badge badge-branch">BLR • MYS • BGVM</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. Operational Task Execution & Candidate Deep-Linking Modal */}
      {activeTaskModal && (
        <Modal
          isOpen={Boolean(activeTaskModal)}
          onClose={handleCloseTaskModal}
          title={activeTaskModal.actionLabel || 'Operational Task Verification'}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              {activeTaskModal.completed ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReopenTask}
                    className="btn-danger-outline"
                    style={{ borderColor: 'var(--color-maroon-700)', color: 'var(--color-maroon-800)' }}
                  >
                    <RotateCcw size={14} style={{ marginRight: '6px' }} />
                    <span>Reopen Task for Re-work</span>
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleCloseTaskModal}>
                    <span>Done</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCloseTaskModal}>
                    <span>Cancel</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleVerifyAndCompleteTask}
                    disabled={!completionNotes.trim() || completionNotes.trim().length < 5}
                  >
                    <CheckCircle size={14} style={{ marginRight: '6px' }} />
                    <span>Verify & Complete Task</span>
                  </Button>
                </>
              )}
            </div>
          }
        >
          {/* Candidate Snapshot & Metadata Box */}
          <div className="task-modal-candidate-box">
            <div className="task-candidate-top">
              <span className="task-candidate-name">
                {activeTaskModal.candidateName || 'Candidate Record'}
              </span>
              <span className="task-candidate-id-badge">
                {activeTaskModal.candidateId || 'Lead'}
              </span>
            </div>
            {activeTaskModal.program && (
              <div className="task-candidate-program">{activeTaskModal.program}</div>
            )}
            <div className="task-candidate-meta">
              <span>Scheduled: {activeTaskModal.time}</span>
              <span>•</span>
              <span>Type: {activeTaskModal.type || 'operational_task'}</span>
            </div>
          </div>

          {/* Deep-Link Navigation Bar to candidate profile or admissions pipeline */}
          <div className="task-modal-deeplink-bar">
            <div className="task-deeplink-info">
              <span className="task-deeplink-title">
                {activeTaskModal.linkType === 'student'
                  ? 'Student 360° Profile & Vault'
                  : 'Admissions Pipeline Kanban'}
              </span>
              <span className="task-deeplink-sub">
                Navigate directly to candidate record to conduct counsellor actions
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTaskModal.link) {
                  navigate(activeTaskModal.link);
                }
              }}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span>Open Record</span>
              <ExternalLink size={13} style={{ marginLeft: '6px' }} />
            </Button>
          </div>

          {/* Verification Body: Audit Log (if already completed) OR Verification Form */}
          {activeTaskModal.completed ? (
            <div className="task-audit-completed-box">
              <div className="task-audit-completed-title">
                <CheckCircle size={18} />
                <span>Task Verified & Completed</span>
                {activeTaskModal.completedAt && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#388e3c' }}>
                    ({activeTaskModal.completedAt})
                  </span>
                )}
              </div>
              <div className="task-audit-detail-row">
                <span className="task-audit-detail-label">Outcome:</span>
                <span className="task-audit-detail-text">
                  {activeTaskModal.outcome || 'Action verified successfully.'}
                </span>
              </div>
              <div className="task-audit-detail-row">
                <span className="task-audit-detail-label">Audit Remarks:</span>
                <span className="task-audit-detail-text">
                  "{activeTaskModal.completionNotes || 'Operational checks passed.'}"
                </span>
              </div>
            </div>
          ) : (
            <div className="task-modal-form">
              <div className="task-form-group">
                <label className="task-form-label" htmlFor="task-outcome-select">
                  Action Outcome / Resolution <span style={{ color: 'var(--color-maroon-700)' }}>*</span>
                </label>
                <Select
                  id="task-outcome-select"
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value)}
                  options={
                    TASK_OUTCOME_OPTIONS[activeTaskModal.type] || TASK_OUTCOME_OPTIONS.default
                  }
                />
              </div>

              <div className="task-form-group">
                <label className="task-form-label" htmlFor="task-notes-textarea">
                  Operational Action Remarks & Reference <span style={{ color: 'var(--color-maroon-700)' }}>*</span>
                </label>
                <textarea
                  id="task-notes-textarea"
                  className="task-form-textarea"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Spoke with candidate; confirmed visa checklist submission for Monday. (Minimum 5 characters)"
                  rows={3}
                />
                <div className="task-form-char-count">
                  <span
                    style={{
                      color:
                        completionNotes.trim().length >= 5
                          ? '#2e7d32'
                          : 'var(--color-maroon-700)',
                      fontWeight: 600,
                    }}
                  >
                    {completionNotes.trim().length} / 5 chars required
                  </span>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
