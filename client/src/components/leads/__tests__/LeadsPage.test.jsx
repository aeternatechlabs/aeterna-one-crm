import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadsPage } from '../../../pages/LeadsPage';
import { leadService } from '../../../services/lead.service';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'admin_1', name: 'Super Admin User', role: 'super_admin', email: 'admin@aeterna.com', branch: 'all' },
  }),
}));

vi.mock('../../../services/lead.service', () => ({
  leadService: {
    getLeads: vi.fn(),
    getLeadStats: vi.fn(),
    getLead: vi.fn(),
    createLead: vi.fn(),
    updateLead: vi.fn(),
    updateLeadStatus: vi.fn(),
    convertToStudent: vi.fn(),
    deleteLead: vi.fn(),
  },
}));

const MOCK_LEADS_RESPONSE = {
  leads: [
    {
      _id: 'lead_1',
      name: 'Aditi Deshmukh',
      phone_number: '+91 98450 12345',
      email: 'aditi.deshmukh@gmail.com',
      destination_country: 'United Kingdom',
      study_level: "Master's",
      intake_target: 'Fall 2026',
      branch: 'bengaluru',
      current_status: 'Interested',
      priority: 'high',
      notes: 'Interested in Imperial College MSc Computing',
      follow_up_date: new Date().toISOString(),
      follow_up_time: '14:30',
      converted_to_student: null,
    },
    {
      _id: 'lead_2',
      name: 'Karan Sharma',
      phone_number: '+91 98860 99887',
      email: 'karan.sharma@gmail.com',
      destination_country: 'Canada',
      study_level: "Bachelor's",
      intake_target: 'Fall 2026',
      branch: 'bengaluru',
      current_status: 'New',
      priority: 'medium',
      notes: 'University of British Columbia inquiry',
      follow_up_date: null,
      follow_up_time: '',
      converted_to_student: null,
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  stats: { total: 2, new: 1, interested: 1, follow_up: 0, deal_closed: 0 },
};

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('LeadsPage Component Suite (Milestone M2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadService.getLeads.mockResolvedValue(MOCK_LEADS_RESPONSE);
  });

  it('renders lead management hero title, stats, and search bar', async () => {
    renderWithProviders(<LeadsPage />);

    expect(await screen.findByText('Lead Management & Student Inquiries')).toBeInTheDocument();
    expect(screen.getByText(/Admissions Intake & Inquiries/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by student name, phone/i)).toBeInTheDocument();
    expect(screen.getByText('All Inquiries')).toBeInTheDocument();
    expect(screen.getByText("Today's Follow-ups")).toBeInTheDocument();
  });

  it('displays lead records from leadService in table view', async () => {
    renderWithProviders(<LeadsPage />);

    expect(await screen.findByText('Aditi Deshmukh')).toBeInTheDocument();
    expect(screen.getByText('aditi.deshmukh@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Karan Sharma')).toBeInTheDocument();
    expect(screen.getByText('karan.sharma@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  it('switches between Directory Table and Inquiry Cards views', async () => {
    renderWithProviders(<LeadsPage />);

    expect(await screen.findByText('Aditi Deshmukh')).toBeInTheDocument();

    const cardsBtn = screen.getByRole('button', { name: /Inquiry Cards/i });
    fireEvent.click(cardsBtn);

    expect(screen.getByLabelText(/Inquiry Cards View/i)).toBeInTheDocument();
  });

  it('clicking "New Lead Inquiry" button opens creation modal with destination & study fields', async () => {
    renderWithProviders(<LeadsPage />);

    const newBtn = await screen.findByRole('button', { name: /New Lead Inquiry/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Student Full Name')).toBeInTheDocument();
    expect(screen.getByText('Destination Country')).toBeInTheDocument();
    expect(screen.getByText('Target Study Level')).toBeInTheDocument();
    expect(screen.getByText('Allocated Branch')).toBeInTheDocument();
  });

  it('clicking Convert button triggers convert confirmation and invokes leadService.convertToStudent', async () => {
    leadService.convertToStudent.mockResolvedValue({
      success: true,
      data: { message: 'Converted' },
    });

    renderWithProviders(<LeadsPage />);

    const convertBtns = await screen.findAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertBtns[0]);

    expect(screen.getByText(/Convert Lead to Admissions Pipeline\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Convert to Pipeline Candidate/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(leadService.convertToStudent).toHaveBeenCalledWith('lead_1');
    });
  });
});
