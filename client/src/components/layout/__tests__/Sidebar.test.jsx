import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import * as AuthContext from '../../../context/AuthContext';
import { ROLES } from '../../../config/constants';

describe('Sidebar Component Navigation Suite', () => {
  it('renders "Archived Staff Vault" for Super Admin user', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: ROLES.SUPER_ADMIN, name: 'Admin User' },
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={true} />
      </MemoryRouter>
    );

    expect(screen.getByText('Archived Staff Vault')).toBeInTheDocument();
    expect(screen.getByText('Employee Management')).toBeInTheDocument();
    expect(screen.getByText('Lead Management')).toBeInTheDocument();
  });

  it('strictly conceals "Archived Staff Vault" and "Employee Management" from Counsellor role', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: ROLES.COUNSELLOR, name: 'Counsellor User' },
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={true} />
      </MemoryRouter>
    );

    expect(screen.queryByText('Archived Staff Vault')).not.toBeInTheDocument();
    expect(screen.queryByText('Employee Management')).not.toBeInTheDocument();
    expect(screen.getByText('Lead Management')).toBeInTheDocument();
  });

  it('only highlights "Archived Staff Vault" when on /employees/trash, not "Employee Management"', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: ROLES.SUPER_ADMIN, name: 'Admin User' },
    });

    render(
      <MemoryRouter initialEntries={['/employees/trash']}>
        <Sidebar isOpen={true} />
      </MemoryRouter>
    );

    const trashLink = screen.getByText('Archived Staff Vault').closest('a');
    const employeeLink = screen.getByText('Employee Management').closest('a');

    expect(trashLink).toHaveClass('nav-link-active');
    expect(employeeLink).not.toHaveClass('nav-link-active');
  });

  it('only highlights "Employee Management" when on /employees, not "Archived Staff Vault"', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: ROLES.SUPER_ADMIN, name: 'Admin User' },
    });

    render(
      <MemoryRouter initialEntries={['/employees']}>
        <Sidebar isOpen={true} />
      </MemoryRouter>
    );

    const employeeLink = screen.getByText('Employee Management').closest('a');
    const trashLink = screen.getByText('Archived Staff Vault').closest('a');

    expect(employeeLink).toHaveClass('nav-link-active');
    expect(trashLink).not.toHaveClass('nav-link-active');
  });
});
