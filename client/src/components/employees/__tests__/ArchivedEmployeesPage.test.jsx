import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArchivedEmployeesPage } from '../../../pages/ArchivedEmployeesPage';
import { employeeService } from '../../../services/employee.service';

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

vi.mock('../../../services/employee.service', () => ({
  employeeService: {
    getEmployees: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    toggleStatus: vi.fn(),
    moveToTrash: vi.fn(),
    restoreEmployee: vi.fn(),
    permanentDelete: vi.fn(),
  },
}));

const MOCK_TRASH_RESPONSE = {
  employees: [
    {
      _id: 'emp_trash_1',
      first_name: 'Vikram',
      last_name: 'Shetty',
      employee_code: 'AET-109',
      email: 'vikram.shetty@aeterna.com',
      branch: 'mysuru',
      role: 'counsellor',
      department: 'Counselling & Admissions',
      designation: 'Education Counsellor',
      employment_status: 'Terminated',
      deletionStage: 'TRASH',
      deleteReason: 'Resigned to pursue higher education',
      deletedAt: '2026-11-20T10:00:00.000Z',
      deletedBy: { name: 'Super Admin User', email: 'admin@aeterna.com' },
      contact_info: { phone: '+91 99000 88776' },
      user_id: { _id: 'user_trash_1', role: 'counsellor', isActive: false },
    },
  ],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  stats: { totalActive: 5, totalTrash: 1, totalCount: 6 },
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

describe('ArchivedEmployeesPage Component Suite (Dedicated Trash Vault)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    employeeService.getEmployees.mockResolvedValue(MOCK_TRASH_RESPONSE);
  });

  it('renders archived staff title and back navigation button', async () => {
    renderWithProviders(<ArchivedEmployeesPage />);

    expect(await screen.findByText('Archived & Trashed Staff')).toBeInTheDocument();
    expect(screen.getByText(/Super Admin Recovery & Audit Vault/i)).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Back to Staff Directory/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  it('renders trashed staff record with reason and deletion details', async () => {
    renderWithProviders(<ArchivedEmployeesPage />);

    expect(await screen.findByText('Vikram Shetty')).toBeInTheDocument();
    expect(screen.getByText('AET-109')).toBeInTheDocument();
    expect(screen.getByText('Resigned to pursue higher education')).toBeInTheDocument();
    expect(screen.getByText(/by Super Admin User/i)).toBeInTheDocument();
  });

  it('opens restore confirm dialog when clicking Restore button', async () => {
    renderWithProviders(<ArchivedEmployeesPage />);

    const restoreBtn = await screen.findByRole('button', { name: /Restore/i });
    fireEvent.click(restoreBtn);

    expect(screen.getByText('Restore Staff Member?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to restore Vikram Shetty/i)).toBeInTheDocument();
  });

  it('opens permanent delete confirm dialog when clicking Permanent button', async () => {
    renderWithProviders(<ArchivedEmployeesPage />);

    const permBtn = await screen.findByRole('button', { name: /Permanent/i });
    fireEvent.click(permBtn);

    expect(screen.getByText('Permanently Delete Staff Record?')).toBeInTheDocument();
    expect(screen.getByText(/Warning: This action CANNOT be undone!/i)).toBeInTheDocument();
  });
});
