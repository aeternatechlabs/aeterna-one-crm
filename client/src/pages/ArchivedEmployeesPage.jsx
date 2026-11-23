import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  RefreshCw,
  Search,
  Shield,
  Building2,
  Briefcase,
  AlertTriangle,
  Copy,
  Check,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_LABELS, BRANCHES, BRANCH_LABELS } from '../config/constants';
import { useEmployees, useEmployeeMutations } from '../hooks/useEmployeeQueries';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import '../styles/employees.css';

const DEPARTMENTS = [
  'Counselling & Admissions',
  'Branch Management',
  'Application & Visa Processing',
  'Marketing & Lead Generation',
  'Executive & Governance',
  'Student Operations',
  'Human Resources',
];

export const ArchivedEmployeesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [copiedKey, setCopiedKey] = useState(null);

  // Modal actions
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [permanentTarget, setPermanentTarget] = useState(null);

  // TanStack Query for trash view
  const filters = useMemo(() => {
    const f = { page, limit: 10, view: 'trash' };
    if (search.trim()) f.search = search.trim();
    if (branchFilter !== 'all') f.branch = branchFilter;
    if (departmentFilter !== 'all') f.department = departmentFilter;
    return f;
  }, [page, search, branchFilter, departmentFilter]);

  const {
    employees,
    pagination,
    stats,
    isLoading: loading,
    refetch: fetchArchivedStaff,
  } = useEmployees(filters);

  const {
    restoreEmployee: restoreStaffMember,
    permanentDelete: permanentDeleteStaffMember,
    isDeletingPermanently,
  } = useEmployeeMutations();

  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, departmentFilter]);

  // Restore Action
  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreStaffMember(restoreTarget._id);
      toast.success(`${restoreTarget.first_name} ${restoreTarget.last_name} restored to active directory.`);
      setRestoreTarget(null);
    } catch (err) {
      // Error toast is already dispatched by apiErrorHandler
    }
  };

  // Permanent Delete Action
  const handleConfirmPermanentDelete = async () => {
    if (!permanentTarget) return;
    if (permanentTarget.role === ROLES.SUPER_ADMIN || permanentTarget.user_id?.role === ROLES.SUPER_ADMIN) {
      toast.error('Action prohibited: Super Admin cannot be permanently deleted.');
      setPermanentTarget(null);
      return;
    }
    try {
      await permanentDeleteStaffMember(permanentTarget._id);
      toast.success(`Record for ${permanentTarget.first_name} permanently purged from system.`);
      setPermanentTarget(null);
    } catch (err) {
      // Error toast is already dispatched by apiErrorHandler
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0] : '';
    const l = lastName ? lastName[0] : '';
    return `${f}${l}`.toUpperCase() || 'ST';
  };

  return (
    <div className="employees-container">
      {/* 1. Top Navigation & Hero Banner */}
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={() => navigate('/employees')}
          className="btn btn-secondary btn-sm"
          title="Return to Active Staff Directory"
        >
          <ArrowLeft size={14} />
          <span>Back to Staff Directory</span>
        </button>
      </div>

      <section className="employees-hero" aria-label="Archived Staff Header">
        <div className="employees-hero-left">
          <div className="employees-badge-tag" style={{ color: '#b91c1c' }}>
            <Trash2 size={14} strokeWidth={2.5} />
            <span>Super Admin Recovery & Audit Vault</span>
          </div>
          <h1 className="employees-hero-title">Archived & Trashed Staff</h1>
          <p className="employees-hero-subtitle">
            Historical audit log and recovery vault for decommissioned personnel. Restore accounts to reactivate login access or permanently purge records.
          </p>
        </div>

        <div className="employees-hero-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchArchivedStaff}
            title="Refresh archived list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* 2. Controls & Search */}
      <section className="employees-controls" aria-label="Archive Filters">
        <div className="employees-search-row">
          <div className="employees-search-input-wrap">
            <Search size={16} className="employees-search-icon" />
            <input
              type="text"
              className="employees-search-input"
              placeholder="Search archived staff by name, code, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="employees-filter-selects">
            <select
              className="employees-filter-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value={BRANCHES.BENGALURU}>Bengaluru</option>
              <option value={BRANCHES.MYSURU}>Mysuru</option>
              <option value={BRANCHES.BELAGAVI}>Belagavi</option>
            </select>

            <select
              className="employees-filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 3. Archived Staff Table */}
      <section className="employees-table-card" aria-label="Archived Staff Table">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner text="Loading archived records..." />
          </div>
        ) : employees.length === 0 ? (
          <div className="employees-empty-state">
            <div className="employees-empty-icon" style={{ background: '#fef2f2', color: '#b91c1c' }}>
              <Trash2 size={28} />
            </div>
            <h3 className="employees-empty-title">Trash Bin Empty</h3>
            <p className="employees-empty-desc">
              There are currently no archived or decommissioned staff members in the recovery vault.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-2"
              onClick={() => navigate('/employees')}
            >
              <ArrowLeft size={14} />
              <span>Return to Staff Directory</span>
            </button>
          </div>
        ) : (
          <div className="employees-table-responsive">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Decommissioned Staff</th>
                  <th>Employee Code</th>
                  <th>Branch & Role</th>
                  <th>Department</th>
                  <th>Archival Reason</th>
                  <th>Archived On & By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id}>
                    {/* Name & Contacts */}
                    <td>
                      <div className="staff-member-cell">
                        <div
                          className="staff-monogram"
                          style={{
                            background: 'linear-gradient(135deg, #475569, #1e293b)',
                            borderColor: '#94a3b8',
                            color: '#e2e8f0',
                          }}
                        >
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div className="staff-meta">
                          <span className="staff-name line-through text-neutral-500">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="staff-email">{emp.email}</span>
                          {emp.contact_info?.phone && (
                            <span className="staff-phone">{emp.contact_info.phone}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td>
                      <span
                        className="staff-code-pill cursor-pointer"
                        onClick={() => handleCopy(emp.employee_code, `code-${emp._id}`)}
                        title="Click to copy employee code"
                      >
                        <span>{emp.employee_code}</span>
                        {copiedKey === `code-${emp._id}` ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-neutral-400" />
                        )}
                      </span>
                    </td>

                    {/* Branch & Role */}
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`branch-pill branch-${emp.branch || 'bengaluru'}`}>
                          {BRANCH_LABELS[emp.branch] || emp.branch}
                        </span>
                        <span className={`role-pill role-${emp.role || 'counsellor'}`}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </div>
                    </td>

                    {/* Department & Designation */}
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-neutral-800">{emp.designation}</span>
                        <span className="text-[11px] text-neutral-500">{emp.department}</span>
                      </div>
                    </td>

                    {/* Archival Reason */}
                    <td>
                      <span className="text-xs text-neutral-700 italic bg-amber-50 px-2 py-1 rounded border border-amber-200 block max-w-xs truncate">
                        {emp.deleteReason || 'Archived by Administrator'}
                      </span>
                    </td>

                    {/* Deleted Date & Actor */}
                    <td>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-neutral-700 font-medium">
                          {emp.deletedAt ? new Date(emp.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          by {emp.deletedBy?.name || 'Administrator'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="staff-row-actions justify-end">
                        <button
                          type="button"
                          className="staff-action-btn success"
                          onClick={() => setRestoreTarget(emp)}
                          title="Restore account to active directory"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>

                        {emp.role !== ROLES.SUPER_ADMIN && emp.user_id?.role !== ROLES.SUPER_ADMIN && (
                          <button
                            type="button"
                            className="staff-action-btn danger"
                            onClick={() => setPermanentTarget(emp)}
                            title="Permanently remove from database"
                          >
                            <Trash2 size={12} />
                            <span>Permanent</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="employees-pagination">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} archived records
            </span>
            <div className="pagination-pages">
              <button
                type="button"
                className="pagination-btn"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="font-semibold px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Restore Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Staff Member?"
        message={`Are you sure you want to restore ${restoreTarget?.first_name} ${restoreTarget?.last_name}? Their profile will be reactivated in the Active Staff Directory and their user login will be reinstated.`}
        confirmText="Restore Staff"
        cancelText="Cancel"
      />

      {/* 5. Permanent Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(permanentTarget)}
        onClose={() => setPermanentTarget(null)}
        onConfirm={handleConfirmPermanentDelete}
        title="Permanently Delete Staff Record?"
        message={`Warning: This action CANNOT be undone! The record and linked authentication credentials for "${permanentTarget?.first_name} ${permanentTarget?.last_name}" will be completely eradicated from the database.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        danger={true}
        loading={isDeletingPermanently}
      />
    </div>
  );
};
