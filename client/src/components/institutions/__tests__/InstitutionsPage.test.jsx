import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InstitutionsPage } from '../../../pages/InstitutionsPage';
import { institutionService } from '../../../services/institution.service';
import * as AuthContext from '../../../context/AuthContext';
import { ROLES } from '../../../config/constants';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

vi.mock('../../../services/institution.service', () => ({
  institutionService: {
    getInstitutions: vi.fn(),
    getInstitutionStats: vi.fn(),
    createInstitution: vi.fn(),
    deleteInstitution: vi.fn(),
  },
}));

const MOCK_INSTITUTIONS = [
  {
    _id: 'inst-1',
    name: 'National Public School, Indiranagar',
    institution_type: 'school',
    category: 'K-12 Senior Secondary & Pre-University',
    board_or_affiliation: 'CBSE / International',
    branch: 'bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    partnership_status: 'Active MoU',
    target_destinations: ['United Kingdom', 'United States', 'Canada'],
    contact_person: {
      name: 'Dr. Asha Raman',
      designation: 'Head of Senior School Guidance',
      phone: '+91 98450 11223',
      email: 'guidance@npsindiranagar.edu',
    },
  },
  {
    _id: 'inst-2',
    name: 'BMS College of Engineering',
    institution_type: 'college',
    category: 'Autonomous Engineering Institution',
    board_or_affiliation: 'VTU / NAAC A++',
    branch: 'bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    partnership_status: 'Partner',
    target_destinations: ['Germany', 'United States', 'Ireland'],
    contact_person: {
      name: 'Prof. S. K. Narayan',
      designation: 'Dean of Higher Studies & Placement',
      phone: '+91 98800 44556',
      email: 'higherstudies@bmsce.ac.in',
    },
  },
  {
    _id: 'inst-3',
    name: 'Inspire IELTS & Study Abroad Hub',
    institution_type: 'coaching_institute',
    category: 'IELTS / GRE Preparation Academy',
    board_or_affiliation: 'Independent Test Prep Center',
    branch: 'mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    partnership_status: 'Prospective',
    target_destinations: ['Australia', 'Canada', 'United Kingdom'],
    contact_person: {
      name: 'Rajesh Varma',
      designation: 'Managing Director',
      phone: '+91 99001 88990',
      email: 'contact@inspiremysuru.com',
    },
  },
];

const MOCK_STATS = {
  total: 3,
  totalSchools: 1,
  totalColleges: 1,
  totalCoaching: 1,
  totalPartnerships: 2,
};

describe('InstitutionsPage Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: ROLES.SUPER_ADMIN, name: 'Admin User' },
    });
    institutionService.getInstitutions.mockResolvedValue({
      institutions: MOCK_INSTITUTIONS,
      pagination: { total: 3, page: 1, limit: 12, totalPages: 1 },
    });
    institutionService.getInstitutionStats.mockResolvedValue({
      stats: MOCK_STATS,
    });
  });

  const renderWithProviders = (ui) => {
    const testQueryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders directory hero title, metric cards, and all institutions', async () => {
    renderWithProviders(<InstitutionsPage />);

    expect(screen.getByText('Institutions Master Directory')).toBeInTheDocument();
    expect(screen.getByText('Total Institutions')).toBeInTheDocument();
    expect(screen.getByText('Feeder Schools')).toBeInTheDocument();
    expect(screen.getByText('Degree Colleges')).toBeInTheDocument();
    expect(screen.getByText('Coaching Academies')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('National Public School, Indiranagar')).toBeInTheDocument();
      expect(screen.getByText('BMS College of Engineering')).toBeInTheDocument();
      expect(screen.getByText('Inspire IELTS & Study Abroad Hub')).toBeInTheDocument();
    });
  });

  it('filters by category tab when clicking Schools', async () => {
    renderWithProviders(<InstitutionsPage />);

    await waitFor(() => {
      expect(screen.getByText('National Public School, Indiranagar')).toBeInTheDocument();
    });

    const schoolTabBtn = screen.getByRole('button', { name: /Schools/i });
    fireEvent.click(schoolTabBtn);

    await waitFor(() => {
      expect(institutionService.getInstitutions).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'school' })
      );
    });
  });

  it('opens Add Institution modal when clicking Add Institution button', async () => {
    renderWithProviders(<InstitutionsPage />);

    const addBtn = screen.getByRole('button', { name: /Add Institution/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Add New Partner Institution')).toBeInTheDocument();
      expect(screen.getByText('High School, K-12, CBSE, ICSE & International feeder schools')).toBeInTheDocument();
    });
  });
});
