import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../../../pages/DashboardPage';
import { authService } from '../../../services/auth.service';
import { pipelineService } from '../../../services/pipeline.service';

// Mock contexts and services
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Sachin Admin', role: 'super_admin', branch: 'all' },
  }),
}));

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({
    selectedBranch: 'all',
    setSelectedBranch: vi.fn(),
    isBranchSwitchable: true,
  }),
}));

vi.mock('../../../services/auth.service', () => ({
  authService: {
    checkHealth: vi.fn().mockResolvedValue({ service: 'aeterna-one-backend', status: 'healthy', database: 'connected' }),
  },
}));

vi.mock('../../../services/pipeline.service', () => ({
  pipelineService: {
    getDashboardSummary: vi.fn().mockResolvedValue({
      metrics: { totalLeads: 23, activeStudents: 4, totalApplications: 17, visasApproved: 7 },
      chevrons: { new: 2, qualified: 3, counselling: 3, application: 5, offer: 4, visa: 4, enrolled: 3 },
      leadTrend: [{ label: 'Jan', count: 28 }],
      tasks: [
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
      ],
    }),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const renderWithProviders = (ui) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Interactive Task Verification & Candidate Deep-Linking Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tasks and displays verified badge on completed items', async () => {
    renderWithProviders(<DashboardPage />);

    // Initial render
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Follow up with Rohan Sharma/i)).toBeInTheDocument();
      expect(screen.getByText(/Submit university application for Sneha Reddy/i)).toBeInTheDocument();
    });

    // Sneha Reddy's task is completed, so it must render the Verified badge
    const verifiedBadges = screen.getAllByText(/Verified/i);
    expect(verifiedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking an uncompleted task or its checkbox opens the verification modal without blind ticking', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Follow up with Rohan Sharma/i)).toBeInTheDocument();
    });

    // Checkbox for Rohan Sharma
    const rohanCheckbox = screen.getByRole('checkbox', {
      name: /Verify task for Rohan Sharma/i,
    });
    expect(rohanCheckbox).not.toBeChecked();

    // Clicking checkbox must NOT blindly check it; it must open verification dialog
    await user.click(rohanCheckbox);

    // Modal dialog must be opened
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Call Follow-up & CAS Verification')).toBeInTheDocument();
    expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByText('AET-BLR-2026-0001')).toBeInTheDocument();

    // Still not checked until operational verification is submitted
    expect(rohanCheckbox).not.toBeChecked();
  });

  it('enforces at least 5 characters of operational action remarks before completing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    // Wait for summary to load
    expect(await screen.findByText('23')).toBeInTheDocument();

    // Open modal
    await user.click(screen.getByText(/Follow up with Rohan Sharma/i));

    const completeBtn = screen.getByRole('button', { name: /Verify & Complete Task/i });
    expect(completeBtn).toBeDisabled();

    // Enter 3 characters (less than 5)
    const textarea = screen.getByPlaceholderText(/Minimum 5 characters/i);
    fireEvent.change(textarea, { target: { value: 'abc' } });
    expect(completeBtn).toBeDisabled();
    expect(screen.getByText('3 / 5 chars required')).toBeInTheDocument();

    // Enter full operational notes
    fireEvent.change(textarea, { target: { value: 'Spoke with Rohan, confirmed CAS tracking ref 9988' } });
    expect(completeBtn).not.toBeDisabled();

    // Click verify and complete
    await user.click(completeBtn);

    // Modal should close and task should now be completed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // The checkbox should now be checked
    const rohanCheckbox = screen.getByRole('checkbox', {
      name: /Verify task for Rohan Sharma/i,
    });
    expect(rohanCheckbox).toBeChecked();
  });

  it('clicking a completed task opens the audit log with recorded outcome and allows reopen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    // Wait for summary to load
    expect(await screen.findByText('23')).toBeInTheDocument();

    // Click Sneha Reddy (already verified)
    await user.click(screen.getByText(/Submit university application for Sneha Reddy/i));

    // Modal opens showing audit details
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Task Verified & Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Application verified and submitted via NUS portal/i)).toBeInTheDocument();

    // Click reopen
    const reopenBtn = screen.getByRole('button', { name: /Reopen Task for Re-work/i });
    await user.click(reopenBtn);

    // Modal closes and task is now pending
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const snehaCheckbox = screen.getByRole('checkbox', {
      name: /Verify task for Sneha Reddy/i,
    });
    expect(snehaCheckbox).not.toBeChecked();
  });
});
