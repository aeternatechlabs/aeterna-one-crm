import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeesPage } from '../../../pages/EmployeesPage';
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

const MOCK_EMPLOYEES_RESPONSE = {
  employees: [
    {
      _id: 'emp_1',
      first_name: 'Priya',
      last_name: 'Nair',
      employee_code: 'AET-101',
      email: 'priya.nair@aeterna.com',
      branch: 'bengaluru',
      role: 'counsellor',
      department: 'Counselling & Admissions',
      designation: 'Senior Education Counsellor',
      employment_status: 'Active',
      deletionStage: 'ACTIVE',
      contact_info: { phone: '+91 98860 11223' },
      user_id: { _id: 'user_1', role: 'counsellor', isActive: true },
    },
    {
      _id: 'emp_2',
      first_name: 'Rajesh',
      last_name: 'Varma',
      employee_code: 'AET-102',
      email: 'rajesh.varma@aeterna.com',
      branch: 'bengaluru',
      role: 'branch_manager',
      department: 'Branch Management',
      designation: 'Branch Manager',
      employment_status: 'Active',
      deletionStage: 'ACTIVE',
      contact_info: { phone: '+91 98450 33445' },
      user_id: { _id: 'user_2', role: 'branch_manager', isActive: true },
    },
  ],
  pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
  stats: { totalActive: 2, totalTrash: 1, totalCount: 3 },
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

describe('EmployeesPage Component Suite (Super Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    employeeService.getEmployees.mockResolvedValue(MOCK_EMPLOYEES_RESPONSE);
  });

  it('renders employee management title and hero header', async () => {
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('Employee Management & Staff Roster')).toBeInTheDocument();
    expect(screen.getByText(/Super Admin Staff Governance/i)).toBeInTheDocument();
  });

  it('renders staff list from employeeService and displays employee details', async () => {
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('AET-101')).toBeInTheDocument();
    expect(screen.getByText('Rajesh Varma')).toBeInTheDocument();
    expect(screen.getByText('AET-102')).toBeInTheDocument();
  });

  it('displays search input and filter dropdowns', async () => {
    renderWithProviders(<EmployeesPage />);

    expect(screen.getByPlaceholderText(/Search by name, code, email, or phone/i)).toBeInTheDocument();
    expect(screen.getByText('All Branches')).toBeInTheDocument();
    expect(screen.getByText('All System Roles')).toBeInTheDocument();
  });

  it('navigates to /employees/trash when Trash & Archive button is clicked', async () => {
    renderWithProviders(<EmployeesPage />);

    const trashBtn = await screen.findByRole('button', { name: /Trash & Archive/i });
    expect(trashBtn).toBeInTheDocument();
    fireEvent.click(trashBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/employees/trash');
  });

  it('clicking "Add New Staff" button opens modal dialog with enhanced fields and NEVER contains Super Admin role', async () => {
    renderWithProviders(<EmployeesPage />);

    const addBtn = await screen.findByRole('button', { name: /Add New Staff/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Personal & Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Governance & Branch Placement')).toBeInTheDocument();
    expect(screen.getByText('Address & Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText(/Joining Date \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Contact Name/i)).toBeInTheDocument();

    // Verify Super Admin is NOT an option in the role select
    const roleOptions = screen.getAllByRole('option');
    const optionTexts = roleOptions.map((opt) => opt.textContent);
    expect(optionTexts).not.toContain('Founder / Super Admin');
    expect(optionTexts).not.toContain('super_admin');
  });

  it('strictly prevents deletion of Super Admin account from frontend by not rendering Trash button', async () => {
    employeeService.getEmployees.mockResolvedValueOnce({
      employees: [
        {
          _id: 'emp_super',
          first_name: 'Founder',
          last_name: 'Admin',
          employee_code: 'AET-001',
          email: 'founder@aeterna.com',
          branch: 'all',
          role: 'super_admin',
          department: 'Executive',
          designation: 'Founder & Super Admin',
          employment_status: 'Active',
          deletionStage: 'ACTIVE',
          user_id: { _id: 'user_super', role: 'super_admin', isActive: true },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      stats: { totalActive: 1, totalTrash: 0, totalCount: 1 },
    });

    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('Founder Admin')).toBeInTheDocument();
    // The table row Trash button must NOT exist for Super Admin
    expect(screen.queryByRole('button', { name: /^Trash$/i })).not.toBeInTheDocument();
  });
});
