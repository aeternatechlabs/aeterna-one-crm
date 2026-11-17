import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { Select } from '../components/common/Select';
import skylineBannerImg from '../assets/heritage/vidhana-soudha.webp';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Interactive Task List state
  const [tasks, setTasks] = useState([
    {
      id: 1,
      text: 'Follow up with Rohan Sharma (UK Sept Intake)',
      time: '11:00 AM',
      completed: false,
    },
    {
      id: 2,
      text: 'Review SOP for Ananya Patel (Canada)',
      time: '12:30 PM',
      completed: false,
    },
    {
      id: 3,
      text: 'Visa mock interview — Karthik Rao',
      time: '03:00 PM',
      completed: false,
    },
    {
      id: 4,
      text: 'Submit university application for Sneha Reddy',
      time: '04:30 PM',
      completed: true,
    },
  ]);

  const toggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await authService.checkHealth();
        if (isMounted) {
          setHealth(data);
          setHealthError(null);
        }
      } catch (err) {
        if (isMounted) {
          setHealthError(err.message || 'Could not connect to backend API');
        }
      } finally {
        if (isMounted) {
          setHealthLoading(false);
        }
      }
    };

    fetchHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Sachin';

  return (
    <div className="dashboard-page">
      {/* 1. Hero Greeting & Heritage Skyline Banner */}
      <section className="dashboard-hero-banner" aria-label="Hero Welcome Banner">
        <div className="hero-left-content">
          <span className="hero-greeting-pill">
            Good Morning, {firstName} <Sparkles size={14} className="hero-sparkle-icon" aria-hidden="true" />
          </span>
          <h1 className="hero-brand-heading">AETERNA ONE</h1>
          <p className="hero-brand-sub">Overseas Education CRM</p>
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
            <span className="metric-value-number">1,384</span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+18%</span>
            </span>
          </div>
          {/* Subtle Lotus Watermark */}
          <svg
            className="metric-card-watermark"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C12 2 13.5 6.5 16 8C18.5 9.5 22 10 22 10C22 10 18.5 12 17 14.5C15.5 17 15 21 15 21C15 21 13.5 17.5 12 16C10.5 17.5 9 21 9 21C9 21 8.5 17 7 14.5C5.5 12 2 10 2 10C2 10 5.5 9.5 8 8C10.5 6.5 12 2 12 2Z" />
          </svg>
        </div>

        {/* Card 2: Active Students */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <GraduationCap size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Active Students</span>
            <span className="metric-value-number">392</span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+22%</span>
            </span>
          </div>
          <svg
            className="metric-card-watermark"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C12 2 13.5 6.5 16 8C18.5 9.5 22 10 22 10C22 10 18.5 12 17 14.5C15.5 17 15 21 15 21C15 21 13.5 17.5 12 16C10.5 17.5 9 21 9 21C9 21 8.5 17 7 14.5C5.5 12 2 10 2 10C2 10 5.5 9.5 8 8C10.5 6.5 12 2 12 2Z" />
          </svg>
        </div>

        {/* Card 3: Applications */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <FileText size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Applications</span>
            <span className="metric-value-number">176</span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+20%</span>
            </span>
          </div>
          <svg
            className="metric-card-watermark"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C12 2 13.5 6.5 16 8C18.5 9.5 22 10 22 10C22 10 18.5 12 17 14.5C15.5 17 15 21 15 21C15 21 13.5 17.5 12 16C10.5 17.5 9 21 9 21C9 21 8.5 17 7 14.5C5.5 12 2 10 2 10C2 10 5.5 9.5 8 8C10.5 6.5 12 2 12 2Z" />
          </svg>
        </div>

        {/* Card 4: Visas Approved */}
        <div className="metric-card-theme">
          <div className="metric-icon-badge" aria-hidden="true">
            <Plane size={24} strokeWidth={2} />
          </div>
          <div className="metric-data-group">
            <span className="metric-label-text">Visas Approved</span>
            <span className="metric-value-number">118</span>
            <span className="metric-trend-pill">
              <TrendingUp size={12} strokeWidth={2.5} />
              <span>+26%</span>
            </span>
          </div>
          <svg
            className="metric-card-watermark"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C12 2 13.5 6.5 16 8C18.5 9.5 22 10 22 10C22 10 18.5 12 17 14.5C15.5 17 15 21 15 21C15 21 13.5 17.5 12 16C10.5 17.5 9 21 9 21C9 21 8.5 17 7 14.5C5.5 12 2 10 2 10C2 10 5.5 9.5 8 8C10.5 6.5 12 2 12 2Z" />
          </svg>
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
          <Link to="/pipeline" className="pipeline-link-btn">
            <span>View Pipeline</span>
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>

        {/* 7-Stage Chevrons Grid */}
        <div className="pipeline-chevrons-grid">
          <div className="chevron-stage-box">
            <span className="chevron-stage-title">New</span>
            <span className="chevron-stage-number">284</span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Qualified</span>
            <span className="chevron-stage-number">146</span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Counselling</span>
            <span className="chevron-stage-number">112</span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Application</span>
            <span className="chevron-stage-number">88</span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Offer</span>
            <span className="chevron-stage-number">64</span>
          </div>

          <div className="chevron-stage-box">
            <span className="chevron-stage-title">Visa</span>
            <span className="chevron-stage-number">38</span>
          </div>

          {/* Highlighted 'Enrolled' Final Milestone Stage */}
          <div className="chevron-stage-box chevron-stage-enrolled">
            <span className="chevron-stage-title">Enrolled</span>
            <span className="chevron-stage-number">32</span>
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
                <text x="36" y="24">320</text>
                <text x="36" y="64">240</text>
                <text x="36" y="104">160</text>
                <text x="36" y="144">80</text>
                <text x="36" y="184">0</text>
              </g>

              {/* Smooth Area Path */}
              <path
                d="M 60 148 C 110 135, 140 152, 180 110 C 220 68, 250 82, 300 48 C 340 22, 380 40, 430 35 C 470 30, 495 55, 520 70 L 520 180 L 60 180 Z"
                fill="url(#leadTrendGradient)"
              />

              {/* Smooth Spline Stroke Curve */}
              <path
                d="M 60 148 C 110 135, 140 152, 180 110 C 220 68, 250 82, 300 48 C 340 22, 380 40, 430 35 C 470 30, 495 55, 520 70"
                fill="none"
                stroke="var(--color-maroon-800)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* High Peak Indicator Dot and Tag Pill at peak (300, 48) */}
              <circle
                cx="300"
                cy="48"
                r="5"
                fill="var(--color-maroon-850)"
                stroke="var(--color-bg-surface)"
                strokeWidth="2.5"
              />
              <g transform="translate(282, 16)">
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
                  278
                </text>
              </g>

              {/* X-Axis Month Markers */}
              <g
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fill: 'var(--color-text-secondary)',
                  textAnchor: 'middle',
                }}
              >
                <text x="60" y="202">Aug</text>
                <text x="150" y="202">Sep</text>
                <text x="240" y="202">Oct</text>
                <text x="330" y="202">Nov</text>
                <text x="420" y="202">Dec</text>
                <text x="510" y="202">Jan</text>
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
                onClick={() => toggleTask(task.id)}
                role="checkbox"
                aria-checked={task.completed}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleTask(task.id);
                  }
                }}
              >
                <div className="task-left-info">
                  <input
                    type="checkbox"
                    className="task-checkbox-custom"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={task.text}
                  />
                  <span
                    className={`task-desc-text ${
                      task.completed ? 'task-desc-completed' : ''
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
                <span className="task-time-badge">
                  <Clock size={11} strokeWidth={2} className="inline mr-1" />
                  {task.time}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 5. System Health & Infrastructure Diagnostics (Zero Regression from Phase 0/1) */}
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
    </div>
  );
};
