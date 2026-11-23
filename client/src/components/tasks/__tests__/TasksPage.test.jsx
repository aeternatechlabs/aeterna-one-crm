import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TasksPage } from '../../../pages/TasksPage';
import { taskService } from '../../../services/task.service';
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
} from '../../../config/constants';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: '673a11112222333344445555', name: 'Anita Rao', role: 'counsellor', branch: 'bengaluru' },
  }),
}));

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({
    selectedBranch: 'bengaluru',
    setSelectedBranch: vi.fn(),
    isBranchSwitchable: false,
  }),
}));

const { mockTask1, mockTask2 } = vi.hoisted(() => {
  const task1 = {
    _id: '673a11112222333344445551',
    title: 'Call regarding CAS document submission',
    description: 'Urgent CAS verification for UK September intake',
    taskType: 'call_followup',
    priority: 'urgent',
    status: 'pending',
    dueDate: new Date(Date.now() + 1800000).toISOString(),
    assignedTo: '673a11112222333344445555',
    assignedToName: 'Anita Rao',
    branch: 'bengaluru',
    candidateName: 'Rohan Sharma',
    candidatePhone: '+91 98451 12345',
    candidateEmail: 'rohan.sharma@example.com',
    candidateProgram: 'MSc Advanced Computer Science — Imperial College',
    smartReachout: {
      preferredChannel: 'whatsapp',
      reachoutCount: 1,
      lastChannelUsed: 'whatsapp',
      latestOutcome: 'no_answer',
    },
  };

  const task2 = {
    _id: '673a11112222333344445552',
    title: 'SOP Review & Feedback',
    description: 'First structural feedback for Rotman MBA',
    taskType: 'doc_collection',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() - 3600000).toISOString(),
    assignedTo: '673a11112222333344445555',
    assignedToName: 'Anita Rao',
    branch: 'bengaluru',
    candidateName: 'Ananya Patel',
    candidatePhone: '+91 98452 23456',
    candidateEmail: 'ananya.patel@example.com',
    candidateProgram: 'Full-time MBA — Rotman',
    smartReachout: {
      preferredChannel: 'call',
      reachoutCount: 0,
    },
  };

  return { mockTask1: task1, mockTask2: task2 };
});

vi.mock('../../../services/task.service', () => ({
  taskService: {
    getDailyQueue: vi.fn().mockResolvedValue({
      queue: {
        overdue: [mockTask2],
        dueToday: [mockTask1],
        upcoming: [],
      },
      stats: {
        totalActive: 2,
        overdueCount: 1,
        dueTodayCount: 1,
        upcomingCount: 0,
        completedTodayCount: 7,
        dailyTarget: 25,
      },
    }),
    getTasks: vi.fn().mockResolvedValue({
      tasks: [mockTask1, mockTask2],
      pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
    }),
    logReachout: vi.fn().mockResolvedValue({ success: true }),
    completeTask: vi.fn().mockResolvedValue({ success: true }),
    createTask: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('Day 48: Counsellor Task Queue UI & 1-Click Smart Reach-Out Action Engine', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TasksPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders daily velocity stats and progress indicator', async () => {
    renderPage();

    expect(await screen.findByText(/Daily Reach-Out & Follow-up Velocity/i)).toBeInTheDocument();
    expect(await screen.findByText(/7 \/ 25 Daily Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Due Today/i)).toBeInTheDocument();
  });

  it('renders task card with candidate program, 1-click reach-out buttons, and priority badge', async () => {
    renderPage();

    // Rohan Sharma is in dueToday
    expect(await screen.findByText('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByText(/Call regarding CAS document submission/i)).toBeInTheDocument();
    expect(screen.getByText(/MSc Advanced Computer Science/i)).toBeInTheDocument();

    // 1-Click buttons must exist
    expect(screen.getByRole('button', { name: /WhatsApp Rohan Sharma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Call Rohan Sharma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Email Rohan Sharma/i })).toBeInTheDocument();
  });

  it('clicking WhatsApp action triggers window.open and displays 1-Tap disposition modal', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderPage();

    const waBtn = await screen.findByRole('button', { name: /WhatsApp Rohan Sharma/i });
    await user.click(waBtn);

    // Verify WhatsApp deep link opened with pre-encoded template
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain('wa.me/919845112345');

    // 1-Tap disposition modal must be displayed
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('1-Click Reach-Out Disposition')).toBeInTheDocument();
    expect(screen.getByText('Connected — Interested')).toBeInTheDocument();
    expect(screen.getByText('Ringing / No Answer')).toBeInTheDocument();
    expect(screen.getByText('Callback Requested')).toBeInTheDocument();

    openSpy.mockRestore();
  });

  it('enforces at least 5 characters of notes when marking complete via disposition', async () => {
    const user = userEvent.setup();
    renderPage();

    const waBtn = await screen.findByRole('button', { name: /WhatsApp Rohan Sharma/i });
    await user.click(waBtn);

    const submitBtn = screen.getByRole('button', { name: /Save Disposition & Next Action/i });
    // Connected - Interested requires notes
    expect(submitBtn).toBeDisabled();

    const notesArea = screen.getByPlaceholderText(/Spoke with candidate/i);
    fireEvent.change(notesArea, { target: { value: 'Spoke with Rohan, confirmed CAS tracking' } });

    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(taskService.logReachout).toHaveBeenCalledWith(
        mockTask1._id,
        expect.objectContaining({
          channel: 'whatsapp',
          outcomeCode: 'connected_interested',
          markComplete: true,
        })
      );
    });
  });

  it('switching to Overdue tab displays overdue tasks', async () => {
    const user = userEvent.setup();
    renderPage();

    const overdueTab = await screen.findByRole('tab', { name: /Overdue/i });
    await user.click(overdueTab);

    // Ananya Patel is in overdue
    expect(await screen.findByText('Ananya Patel')).toBeInTheDocument();
    expect(screen.getByText(/SOP Review & Feedback/i)).toBeInTheDocument();
  });
});
