import React, { useState } from 'react';
import {
  BarChart3,
  Building2,
  GitBranch,
  Award,
  Calendar,
  Printer,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { Select } from '../components/common/Select';
import { Button } from '../components/common/Button';
import {
  useReportOverview,
  useBranchScorecards,
  useConversionFunnel,
  useCounsellorPerformance,
  useIntakeTrends,
} from '../hooks/useReportQueries';
import { OverviewTab } from '../components/reports/OverviewTab';
import { ScorecardsTab } from '../components/reports/ScorecardsTab';
import { FunnelTab } from '../components/reports/FunnelTab';
import { CounsellorsTab } from '../components/reports/CounsellorsTab';
import { IntakeTrendsTab } from '../components/reports/IntakeTrendsTab';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
];

export const ReportsPage = () => {
  const { user } = useAuth();
  const { selectedBranch, setSelectedBranch, isBranchSwitchable } = useBranch();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const queryParams = {
    branch: selectedBranch,
    period: selectedPeriod,
  };

  const overviewQuery = useReportOverview(queryParams, {
    enabled: activeTab === 'overview',
  });
  const scorecardsQuery = useBranchScorecards(queryParams, {
    enabled: activeTab === 'scorecards',
  });
  const funnelQuery = useConversionFunnel(queryParams, {
    enabled: activeTab === 'funnel',
  });
  const counsellorQuery = useCounsellorPerformance(queryParams, {
    enabled: activeTab === 'counsellors',
  });
  const intakeQuery = useIntakeTrends(queryParams, {
    enabled: activeTab === 'intake',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    if (activeTab === 'overview') overviewQuery.refetch();
    if (activeTab === 'scorecards') scorecardsQuery.refetch();
    if (activeTab === 'funnel') funnelQuery.refetch();
    if (activeTab === 'counsellors') counsellorQuery.refetch();
    if (activeTab === 'intake') intakeQuery.refetch();
  };

  const isLoading =
    (activeTab === 'overview' && overviewQuery.isLoading) ||
    (activeTab === 'scorecards' && scorecardsQuery.isLoading) ||
    (activeTab === 'funnel' && funnelQuery.isLoading) ||
    (activeTab === 'counsellors' && counsellorQuery.isLoading) ||
    (activeTab === 'intake' && intakeQuery.isLoading);

  return (
    <div className="reports-page-container">
      {/* 1. Header Hero Banner */}
      <header className="reports-header-hero">
        <div className="reports-header-left">
          <div className="reports-badge-tag">
            <Sparkles size={12} strokeWidth={2.5} />
            <span>Management Intelligence Hub · Phase B5</span>
          </div>
          <h1 className="reports-header-title">Reports & Analytics</h1>
          <p className="reports-header-subtitle">
            Authoritative KPI dashboards, multi-branch scorecards, and admissions funnel intelligence.
          </p>
        </div>

        <div className="reports-header-actions">
          {isBranchSwitchable && (
            <div style={{ width: '160px' }}>
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
                aria-label="Filter Reports by Branch"
              />
            </div>
          )}

          <div style={{ width: '150px' }}>
            <Select
              variant="compact"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              options={PERIOD_OPTIONS}
              aria-label="Filter Reports by Reporting Window"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh Active Report Data"
            title="Refresh report data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            aria-label="Print or Export Report to PDF"
          >
            <Printer size={14} style={{ marginRight: '6px' }} />
            <span>Export PDF</span>
          </Button>
        </div>
      </header>

      {/* 2. Navigation Tabs Bar */}
      <nav className="reports-tabs-bar" role="tablist" aria-label="Reports Categories">
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`reports-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={15} />
          <span>Executive Overview</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'scorecards'}
          className={`reports-tab-btn ${activeTab === 'scorecards' ? 'active' : ''}`}
          onClick={() => setActiveTab('scorecards')}
        >
          <Building2 size={15} />
          <span>Branch Scorecards</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'funnel'}
          className={`reports-tab-btn ${activeTab === 'funnel' ? 'active' : ''}`}
          onClick={() => setActiveTab('funnel')}
        >
          <GitBranch size={15} />
          <span>Conversion Funnel</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'counsellors'}
          className={`reports-tab-btn ${activeTab === 'counsellors' ? 'active' : ''}`}
          onClick={() => setActiveTab('counsellors')}
        >
          <Award size={15} />
          <span>Counsellor Productivity</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'intake'}
          className={`reports-tab-btn ${activeTab === 'intake' ? 'active' : ''}`}
          onClick={() => setActiveTab('intake')}
        >
          <Calendar size={15} />
          <span>Intake Trends</span>
        </button>
      </nav>

      {/* 3. Active Tab Content Pane */}
      <main role="tabpanel" style={{ minHeight: '400px' }}>
        {activeTab === 'overview' && (
          <OverviewTab
            overview={overviewQuery.overview}
            loading={overviewQuery.isLoading}
          />
        )}

        {activeTab === 'scorecards' && (
          <ScorecardsTab
            scorecards={scorecardsQuery.scorecards}
            loading={scorecardsQuery.isLoading}
          />
        )}

        {activeTab === 'funnel' && (
          <FunnelTab
            funnel={funnelQuery.funnel}
            loading={funnelQuery.isLoading}
          />
        )}

        {activeTab === 'counsellors' && (
          <CounsellorsTab
            performance={counsellorQuery.performance}
            loading={counsellorQuery.isLoading}
          />
        )}

        {activeTab === 'intake' && (
          <IntakeTrendsTab
            intakeTrends={intakeQuery.intakeTrends}
            loading={intakeQuery.isLoading}
          />
        )}
      </main>
    </div>
  );
};
