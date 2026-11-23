import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../../../pages/SettingsPage';
import {
  ROLES,
  hasPermission,
  can,
  getRolePermissions,
} from '../../../config/roles';
import { authService } from '../../../services/auth.service';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'admin_1', name: 'Super Admin User', role: 'super_admin', branch: 'all' },
  }),
}));

vi.mock('../../../services/auth.service', () => ({
  authService: {
    checkPermission: vi.fn(),
    getPermissionsMatrix: vi.fn(),
  },
}));

describe('Role-Based Access Control (RBAC) Client Suite & SettingsPage Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.checkPermission.mockResolvedValue({
      allowed: true,
      role: 'super_admin',
      resource: 'students',
      action: 'verifyDocs',
      message: 'Access GRANTED: Role [super_admin] is authorized to perform [verifyDocs] on [students].',
    });
  });

  describe('1. Client-Side Role Permissions Matrix (client/src/config/roles.js)', () => {
    it('Super admin has permission for all operations', () => {
      expect(hasPermission(ROLES.SUPER_ADMIN, 'pipeline', 'view')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'pipeline', 'moveStage')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'students', 'verifyDocs')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'reports', 'export')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'settings', 'manageStaff')).toBe(true);
    });

    it('Branch manager has operational access but cannot delete docs or manage staff', () => {
      expect(hasPermission(ROLES.BRANCH_MANAGER, 'pipeline', 'view')).toBe(true);
      expect(hasPermission(ROLES.BRANCH_MANAGER, 'pipeline', 'moveStage')).toBe(true);
      expect(hasPermission(ROLES.BRANCH_MANAGER, 'students', 'verifyDocs')).toBe(true);
      expect(hasPermission(ROLES.BRANCH_MANAGER, 'students', 'deleteDocs')).toBe(false);
      expect(hasPermission(ROLES.BRANCH_MANAGER, 'settings', 'manageStaff')).toBe(false);
    });

    it('Application Officer can verify docs but cannot move pipeline stage', () => {
      expect(hasPermission(ROLES.APPLICATION_OFFICER, 'students', 'verifyDocs')).toBe(true);
      expect(hasPermission(ROLES.APPLICATION_OFFICER, 'pipeline', 'moveStage')).toBe(false);
      expect(can(ROLES.APPLICATION_OFFICER, 'reports', 'export')).toBe(false);
    });

    it('Marketing role is limited to leads and blocked from pipeline/students/tasks', () => {
      expect(hasPermission(ROLES.MARKETING, 'leads', 'view')).toBe(true);
      expect(hasPermission(ROLES.MARKETING, 'pipeline', 'view')).toBe(false);
      expect(hasPermission(ROLES.MARKETING, 'students', 'view')).toBe(false);
      expect(hasPermission(ROLES.MARKETING, 'tasks', 'view')).toBe(false);
    });

    it('getRolePermissions returns granular action mappings', () => {
      const perms = getRolePermissions(ROLES.COUNSELLOR);
      expect(perms.pipeline).toContain('view');
      expect(perms.pipeline).toContain('moveStage');
      expect(perms.students).not.toContain('verifyDocs');
      expect(perms.reports.length).toBe(0);
    });
  });

  describe('2. SettingsPage Inspector & Test Form UI', () => {
    it('renders hero title and active role pill', () => {
      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Settings & Access Control')).toBeInTheDocument();
      expect(screen.getByText(/Active Role:/)).toBeInTheDocument();
      expect(screen.getByText('Access Inspector & Test Form')).toBeInTheDocument();
    });

    it('displays dual-guard panel reflecting frontend and backend roles', async () => {
      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      expect(
        screen.getByText(/Frontend Guard \(client\/src\/config\/roles\.js\)/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Backend Guard \(server\/src\/config\/roles\.js\)/)
      ).toBeInTheDocument();
    });

    it('submitting test form calls authService.checkPermission and updates backend guard card', async () => {
      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      const submitBtn = screen.getByRole('button', { name: /Verify Access Control/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.checkPermission).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: 'students',
            action: 'verifyDocs',
            simulatedRole: 'super_admin',
          })
        );
      });
    });

    it('switches to Action Guard Simulator tab and executes mock action', async () => {
      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      const simTab = screen.getByRole('button', { name: /Action Guard Simulator/i });
      fireEvent.click(simTab);

      expect(
        screen.getByText(/Interactive Action Guard Simulator/i)
      ).toBeInTheDocument();

      const actionButtons = screen.getAllByRole('button', { name: /Execute Action/i });
      expect(actionButtons.length).toBeGreaterThan(0);

      // Click first allowed action
      fireEvent.click(actionButtons[0]);

      expect(screen.getByText(/Simulation Execution History/i)).toBeInTheDocument();
      expect(screen.getAllByText('ALLOWED').length).toBeGreaterThan(0);
    });

    it('switches to Canonical Role Permission Matrix tab and displays table', async () => {
      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      const matrixTab = screen.getByRole('button', { name: /Complete System Matrix/i });
      fireEvent.click(matrixTab);

      expect(
        screen.getByText('Canonical Role Permission Matrix')
      ).toBeInTheDocument();
      expect(screen.getByRole('table', { name: /Role Permission Matrix/i })).toBeInTheDocument();
    });
  });
});
