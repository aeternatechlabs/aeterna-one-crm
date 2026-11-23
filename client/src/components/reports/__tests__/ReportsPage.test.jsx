import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsPage } from '../../../pages/ReportsPage';
import { reportService } from '../../../services/report.service';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'admin_1', name: 'Sachin Founder', role: 'super_admin', branch: 'all' },
  }),
}));

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({
    selectedBranch: 'all',
    setSelectedBranch: vi.fn(),
    isBranchSwitchable: true,
  }),
}));

const { mockOverview, mockScorecards, mockFunnel, mockPerformance, mockIntake } = vi.hoisted(() => {
  const overview = {
    metrics: {
      totalLeads: 184,
      activeStudents: 52,
      totalApplications: 68,
      visasApproved: 28,
      enrolledCount: 16,
      overallConversionRate: 8.7,
      avgTurnaroundDays: 24,
    },
    leadsByDestination: [
      { country: 'United Kingdom', count: 82, percentage: 44.6 },
      { country: 'Canada', count: 48, percentage: 26.1 },
    ],
    leadsBySource: [
      { source: 'Google Search', count: 74, percentage: 40.2 },
      { source: 'Instagram Ad', count: 46, percentage: 25.0 },
    ],
    trendSeries: [
      { date: '2026-11-01', count: 12 },
    ],
  };

  const scorecards = {
    branches: [
      {
        branchId: 'bengaluru',
        branchName: 'Bengaluru (HQ)',
        metrics: {
          totalLeads: 120,
          targetLeads: 150,
          targetAchieved: 80,
          activeStudents: 35,
          applications: 48,
          visasApproved: 20,
          enrolled: 12,
          conversionRate: 10.0,
          slaComplianceRate: 96.5,
          counsellorCount: 5,
        },
      },
      {
        branchId: 'mysuru',
        branchName: 'Mysuru',
        metrics: {
          totalLeads: 42,
          targetLeads: 80,
          targetAchieved: 52.5,
          activeStudents: 12,
          applications: 14,
          visasApproved: 5,
          enrolled: 3,
          conversionRate: 7.1,
          slaComplianceRate: 94.0,
          counsellorCount: 3,
        },
      },
    ],
    consolidated: {
      totalLeads: 162,
      totalApplications: 62,
      totalVisas: 25,
      totalEnrolled: 15,
    },
  };

  const funnel = {
    totalCohortLeads: 184,
    funnelSteps: [
      { stageIndex: 1, stageKey: 'new', stageLabel: 'New Enquiry', count: 184, conversionRate: 100, dropoffRate: 0 },
      { stageIndex: 2, stageKey: 'contacted', stageLabel: 'Contact Established', count: 165, conversionRate: 89.7, dropoffRate: 10.3 },
      { stageIndex: 16, stageKey: 'enrolled', stageLabel: 'Successfully Enrolled', count: 16, conversionRate: 8.7, dropoffRate: 91.3 },
    ],
  };

  const performance = {
    period: { daysCount: 30, workingDays: 26 },
    counsellors: [
      {
        counsellorId: 'c1',
        counsellorName: 'Priya Nair',
        branch: 'bengaluru',
        tasksCompleted: 45,
        reachoutsCompleted: 120,
        dailyVelocity: 4.6,
        dailyTarget: 25,
        velocityEfficiency: 18.4,
        slaComplianceRate: 96.0,
        activeCaseload: 60,
      },
    ],
  };

  const intake = {
    trends: [
      { destination: 'UK', intake: 'Fall 2026', enquiries: 65, forecastEnrolled: 12 },
      { destination: 'Canada', intake: 'Spring 2027', enquiries: 40, forecastEnrolled: 7 },
    ],
  };

  return {
    mockOverview: overview,
    mockScorecards: scorecards,
    mockFunnel: funnel,
    mockPerformance: performance,
    mockIntake: intake,
  };
});

vi.mock('../../../services/report.service', () => ({
  reportService: {
    getOverview: vi.fn(() => Promise.resolve({ data: mockOverview })),
    getBranchScorecards: vi.fn(() => Promise.resolve({ data: mockScorecards })),
    getFunnel: vi.fn(() => Promise.resolve({ data: mockFunnel })),
    getCounsellorPerformance: vi.fn(() => Promise.resolve({ data: mockPerformance })),
    getIntakeTrends: vi.fn(() => Promise.resolve({ data: mockIntake })),
  },
}));

describe('ReportsPage UI Component & Tab Navigation Suite (Day 67)', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithProviders = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders reports hero banner, title, and initial Executive Overview KPI cards', async () => {
    renderWithProviders();

    expect(screen.getByText(/Reports & Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Management Intelligence Hub/i)).toBeInTheDocument();

    expect(await screen.findByText('184')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
    expect(screen.getByText('68')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText(/8.7% overall conversion/i)).toBeInTheDocument();
  });

  it('switches to Branch Scorecards tab and displays comparative cards', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const scorecardsTabBtn = screen.getByRole('tab', { name: /Branch Scorecards/i });
    await user.click(scorecardsTabBtn);

    const blrMatches = await screen.findAllByText('Bengaluru (HQ)');
    expect(blrMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mysuru').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/80% Target/i)).toBeInTheDocument();
    expect(screen.getByText(/Consolidated Branch Benchmark Table/i)).toBeInTheDocument();
  });

  it('switches to Conversion Funnel tab and displays 16-stage waterfall', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const funnelTabBtn = screen.getByRole('tab', { name: /Conversion Funnel/i });
    await user.click(funnelTabBtn);

    expect(await screen.findByText(/16-Stage Admissions Conversion Waterfall/i)).toBeInTheDocument();
    expect(screen.getAllByText('New Enquiry').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contact Established').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Successfully Enrolled').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Counsellor Productivity tab and displays velocity leaderboard', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const counsellorsTabBtn = screen.getByRole('tab', { name: /Counsellor Productivity/i });
    await user.click(counsellorsTabBtn);

    expect(await screen.findByText(/Counsellor Productivity & Reach-Out Velocity Leaderboard/i)).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('4.6 / day')).toBeInTheDocument();
  });

  it('triggers window.print when Export PDF button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithProviders();

    const exportBtn = screen.getByRole('button', { name: /Print or Export Report to PDF/i });
    await user.click(exportBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
