import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Lazy-loaded route components for optimized bundle splitting
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const LeadsPage = lazy(() =>
  import('../pages/LeadsPage').then((m) => ({ default: m.LeadsPage }))
);
const PipelinePage = lazy(() =>
  import('../pages/PipelinePage').then((m) => ({ default: m.PipelinePage }))
);
const Student360Page = lazy(() =>
  import('../pages/Student360Page').then((m) => ({ default: m.Student360Page }))
);
const TasksPage = lazy(() =>
  import('../pages/TasksPage').then((m) => ({ default: m.TasksPage }))
);
const ReportsPage = lazy(() =>
  import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const InstitutionsPage = lazy(() =>
  import('../pages/InstitutionsPage').then((m) => ({ default: m.InstitutionsPage }))
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const EmployeesPage = lazy(() =>
  import('../pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage }))
);
const ArchivedEmployeesPage = lazy(() =>
  import('../pages/ArchivedEmployeesPage').then((m) => ({ default: m.ArchivedEmployeesPage }))
);
const UnauthorizedPage = lazy(() =>
  import('../pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage }))
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading workspace..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes inside Persistent AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/leads"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                    'counsellor',
                    'marketing',
                  ]}
                >
                  <LeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                    'counsellor',
                    'application_officer',
                  ]}
                >
                  <PipelinePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                    'counsellor',
                    'application_officer',
                  ]}
                >
                  <Student360Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                    'counsellor',
                    'application_officer',
                  ]}
                >
                  <Student360Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                    'counsellor',
                    'application_officer',
                  ]}
                >
                  <TasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                  ]}
                >
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/institutions"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                    'branch_manager',
                    'counsellor',
                    'application_officer',
                  ]}
                >
                  <InstitutionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                  ]}
                >
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/employees"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                  ]}
                >
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                  ]}
                >
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees/trash"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                  ]}
                >
                  <ArchivedEmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/employees/trash"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'super_admin',
                  ]}
                >
                  <ArchivedEmployeesPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
