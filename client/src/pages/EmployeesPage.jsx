import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Building2,
  Shield,
  Trash2,
  Edit2,
  Copy,
  Check,
  CheckCircle2,
  Briefcase,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  HeartPulse,
  KeyRound,
  LayoutGrid,
  LayoutList,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_LABELS, BRANCHES, BRANCH_LABELS } from '../config/constants';
import { useEmployees, useEmployeeMutations } from '../hooks/useEmployeeQueries';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import '../styles/employees.css';

export const AVATAR_OPTIONS = [
  { id: 'counsellor_f1', url: '/staff/avatar-counsellor-f1.jpg', label: 'Senior Counsellor' },
  { id: 'manager_m1', url: '/staff/avatar-manager-m1.jpg', label: 'Branch Director' },
  { id: 'admissions_f2', url: '/staff/avatar-admissions-f2.jpg', label: 'Admissions Officer' },
  { id: 'visa_m2', url: '/staff/avatar-visa-m2.jpg', label: 'Visa Specialist' },
];

export const getStaffAvatar = (emp) => {
  if (emp?.profile_photo) return emp.profile_photo;
  const role = emp?.role || '';
  const code = emp?.employee_code || '';
  if (role === ROLES.BRANCH_MANAGER || role.includes('manager')) return '/staff/avatar-manager-m1.jpg';
  if (role === ROLES.COUNSELLOR || role.includes('counsellor')) return '/staff/avatar-counsellor-f1.jpg';
  if (role === ROLES.APPLICATION_OFFICER || role.includes('application') || role.includes('admission')) return '/staff/avatar-admissions-f2.jpg';
  if (role === ROLES.MARKETING || role.includes('marketing') || role.includes('visa')) return '/staff/avatar-visa-m2.jpg';

  const charSum = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const defaultList = [
    '/staff/avatar-counsellor-f1.jpg',
    '/staff/avatar-manager-m1.jpg',
    '/staff/avatar-admissions-f2.jpg',
    '/staff/avatar-visa-m2.jpg',
  ];
  return defaultList[charSum % defaultList.length];
};

const DEFAULT_FORM = {
  first_name: '',
  last_name: '',
  employee_code: '',
  email: '',
  phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  joining_date: new Date().toISOString().split('T')[0],
  branch: BRANCHES.BENGALURU,
  role: ROLES.COUNSELLOR,
  department: 'Counselling & Admissions',
  designation: 'Education Counsellor',
  employment_status: 'Active',
  password: 'Password@123',
  profile_photo: '/staff/avatar-counsellor-f1.jpg',
};

const DEPARTMENTS = [
  'Counselling & Admissions',
  'Branch Management',
  'Application & Visa Processing',
  'Marketing & Lead Generation',
  'Student Operations',
  'Human Resources',
];

const DESIGNATIONS = [
  'Senior Education Counsellor',
  'Education Counsellor',
  'Branch Manager',
  'Admissions Officer',
  'Visa Documentation Specialist',
  'Marketing Lead',
  'Telecaller & Lead Qualifier',
  'Operations Executive',
];

// Permitted staff roles (Super Admin is strictly prohibited from staff creation)
const PERMITTED_STAFF_ROLES = [
  { value: ROLES.COUNSELLOR, label: ROLE_LABELS[ROLES.COUNSELLOR] || 'Education Counsellor' },
  { value: ROLES.BRANCH_MANAGER, label: ROLE_LABELS[ROLES.BRANCH_MANAGER] || 'Branch Manager' },
  { value: ROLES.APPLICATION_OFFICER, label: ROLE_LABELS[ROLES.APPLICATION_OFFICER] || 'Application Officer' },
  { value: ROLES.MARKETING, label: ROLE_LABELS[ROLES.MARKETING] || 'Marketing Lead' },
];

export const EmployeesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Filter memoization for TanStack Query (Rule 12 & Rule 16)
  const filters = useMemo(() => {
    const f = { page, limit: 10, view: 'active' };
    if (search.trim()) f.search = search.trim();
    if (branchFilter !== 'all') f.branch = branchFilter;
    if (roleFilter !== 'all') f.role = roleFilter;
    if (statusFilter !== 'all') f.employment_status = statusFilter;
    if (departmentFilter !== 'all') f.department = departmentFilter;
    return f;
  }, [page, search, branchFilter, roleFilter, statusFilter, departmentFilter]);

  // Hook-driven query & mutation architecture (Rules 11, 12, 13, 14, 16)
  const {
    employees,
    pagination,
    stats,
    isLoading: loading,
    refetch: fetchEmployees,
  } = useEmployees(filters);

  const {
    createEmployee: createStaffMember,
    updateEmployee: updateStaffMember,
    moveToTrash: trashStaffMember,
    isCreating,
    isUpdating,
    isTrashing,
  } = useEmployeeMutations();

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showPassword, setShowPassword] = useState(false);

  // Created credentials modal box
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Trash states
  const [trashTarget, setTrashTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('Archived by Administrator');

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, roleFilter, statusFilter, departmentFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEmployee(null);
    const randomCode = `AET-${Math.floor(100 + Math.random() * 900)}`;
    setForm({
      ...DEFAULT_FORM,
      employee_code: randomCode,
      joining_date: new Date().toISOString().split('T')[0],
      profile_photo: '/staff/avatar-counsellor-f1.jpg',
    });
    setCreatedCredentials(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    const joiningDateStr = emp.joining_date
      ? new Date(emp.joining_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      employee_code: emp.employee_code || '',
      email: emp.email || '',
      phone: emp.contact_info?.phone || '',
      address: emp.contact_info?.address || '',
      emergency_contact_name: emp.contact_info?.emergency_contact_name || '',
      emergency_contact_phone: emp.contact_info?.emergency_contact_phone || '',
      joining_date: joiningDateStr,
      branch: emp.branch || BRANCHES.BENGALURU,
      role: emp.role || ROLES.COUNSELLOR,
      department: emp.department || 'Counselling & Admissions',
      designation: emp.designation || 'Education Counsellor',
      employment_status: emp.employment_status || 'Active',
      profile_photo: emp.profile_photo || getStaffAvatar(emp),
      password: '',
    });
    setCreatedCredentials(null);
    setShowModal(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        employee_code: form.employee_code.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        branch: form.branch,
        role: form.role,
        department: form.department,
        designation: form.designation,
        employment_status: form.employment_status,
        profile_photo: form.profile_photo || undefined,
        joining_date: form.joining_date ? form.joining_date : undefined,
        contact_info: {
          phone: form.phone.trim(),
          address: form.address.trim(),
          emergency_contact_name: form.emergency_contact_name.trim(),
          emergency_contact_phone: form.emergency_contact_phone.trim(),
        },
      };

      if (!editingEmployee && form.password) {
        payload.password = form.password;
      }

      if (editingEmployee) {
        await updateStaffMember({ id: editingEmployee._id, data: payload });
        toast.success(`Staff record for ${payload.first_name} ${payload.last_name} updated successfully!`);
        setShowModal(false);
      } else {
        const res = await createStaffMember(payload);
        // Rule 11 Dual Access Pattern: res?.data?.credentials || res?.credentials || res?.data?.data?.credentials
        const creds = res?.data?.credentials || res?.credentials || res?.data?.data?.credentials;
        toast.success(`Staff member ${payload.first_name} created successfully!`);

        if (creds) {
          setCreatedCredentials(creds);
        } else {
          setShowModal(false);
        }
      }
    } catch (err) {
      toast.error(err.friendlyMessage || err.message || 'Failed to save staff record');
    }
  };

  // Move to Trash
  const handleConfirmMoveToTrash = async () => {
    if (!trashTarget) return;
    if (trashTarget.role === ROLES.SUPER_ADMIN || trashTarget.user_id?.role === ROLES.SUPER_ADMIN) {
      toast.error('Action prohibited: Super Admin cannot be deleted or moved to trash.');
      setTrashTarget(null);
      return;
    }
    try {
      await trashStaffMember({ id: trashTarget._id, reason: deleteReason });
      toast.success(`${trashTarget.first_name} moved to trash vault`);
      setTrashTarget(null);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to move to trash');
    }
  };

  // Clipboard Helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied to clipboard: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Staff Initials Generator
  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0] : '';
    const l = lastName ? lastName[0] : '';
    return `${f}${l}`.toUpperCase() || 'ST';
  };

  return (
    <div className="employees-container">
      {/* 1. Header Hero Banner */}
      <section className="employees-hero" aria-label="Employee Management Hero">
        {/* Panoramic Team Heritage Visual Backdrop */}
        <div className="employees-hero-backdrop">
          <img
            src="/staff/staff-team-banner.jpg"
            alt="Aeterna Faculty & Counseling Team"
            className="employees-hero-bg-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="employees-hero-overlay" />
        </div>

        <div className="employees-hero-left">
          <div className="employees-badge-tag">
            <Shield size={14} strokeWidth={2.5} />
            <span>Super Admin Staff Governance</span>
          </div>
          <h1 className="employees-hero-title">Employee Management & Staff Roster</h1>
          <p className="employees-hero-subtitle">
            Authoritative directory for Karnataka branch allocation, role provisioning, security credentials, and lifecycle controls.
          </p>

          {/* Humanized Live Team Pulse Strip */}
          <div className="employees-team-pulse-strip">
            <div className="pulse-item">
              <span className="pulse-indicator" />
              <span className="pulse-text">Faculty Roster: <strong>{stats.totalActive} Active</strong></span>
            </div>
            <div className="pulse-separator">•</div>
            <div className="pulse-item">
              <MapPin size={12} className="text-amber-700" />
              <span className="pulse-text">Karnataka Hubs: Bengaluru • Mysuru • Belagavi</span>
            </div>
            <div className="pulse-separator">•</div>
            <div className="pulse-item">
              <Sparkles size={12} className="text-emerald-700" />
              <span className="pulse-text">Directory: 100% Verified</span>
            </div>
          </div>
        </div>

        <div className="employees-hero-actions">
          {/* Navigate to Dedicated Trash Vault */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/employees/trash')}
            title="View Decommissioned & Archived Staff"
          >
            <Trash2 size={14} className="text-red-500" />
            <span>Trash & Archive ({stats.totalTrash})</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchEmployees}
            title="Refresh directory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
          >
            <UserPlus size={15} />
            <span>Add New Staff</span>
          </button>
        </div>
      </section>

      {/* 2. KPI Summary Cards */}
      <section className="employees-kpi-grid" aria-label="Staff Metrics">
        <div className="employees-kpi-card">
          <div className="employees-kpi-info">
            <span className="employees-kpi-label">Active Staff</span>
            <span className="employees-kpi-val">{stats.totalActive}</span>
          </div>
          <div className="employees-kpi-icon-wrap">
            <Users size={22} />
          </div>
        </div>

        <div className="employees-kpi-card">
          <div className="employees-kpi-info">
            <span className="employees-kpi-label">Bengaluru Hub</span>
            <span className="employees-kpi-val">
              {employees.filter((e) => e.branch === BRANCHES.BENGALURU && e.deletionStage === 'ACTIVE').length}
            </span>
          </div>
          <div className="employees-kpi-icon-wrap">
            <Building2 size={22} />
          </div>
        </div>

        <div className="employees-kpi-card">
          <div className="employees-kpi-info">
            <span className="employees-kpi-label">Mysuru & Belagavi</span>
            <span className="employees-kpi-val">
              {employees.filter((e) => (e.branch === BRANCHES.MYSURU || e.branch === BRANCHES.BELAGAVI) && e.deletionStage === 'ACTIVE').length}
            </span>
          </div>
          <div className="employees-kpi-icon-wrap">
            <Briefcase size={22} />
          </div>
        </div>

        {/* Clickable Trash Vault KPI Card */}
        <div
          className="employees-kpi-card cursor-pointer hover:border-red-300 transition-colors"
          onClick={() => navigate('/employees/trash')}
          title="Click to view Archived & Trashed Staff"
        >
          <div className="employees-kpi-info">
            <span className="employees-kpi-label">Archived / Trash</span>
            <span className="employees-kpi-val">{stats.totalTrash}</span>
          </div>
          <div className="employees-kpi-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
            <Trash2 size={22} />
          </div>
        </div>
      </section>

      {/* 3. Filter Controls & Search */}
      <section className="employees-controls" aria-label="Directory Filters">
        <div className="employees-search-row">
          <div className="employees-search-input-wrap">
            <Search size={16} className="employees-search-icon" />
            <input
              type="text"
              className="employees-search-input"
              placeholder="Search by name, code, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="employees-filter-selects">
            {/* Branch Filter */}
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

            {/* Role Filter (Operational roles + Super Admin filter for existing records) */}
            <select
              className="employees-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All System Roles</option>
              {PERMITTED_STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="employees-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>

            {/* Department Filter */}
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

      {/* View Mode Switcher Bar */}
      <div className="employees-view-mode-bar">
        <div className="view-mode-summary">
          <Users size={14} style={{ color: 'var(--color-maroon-800)' }} />
          <span>Showing {employees.length} personnel in {viewMode === 'cards' ? 'Team Roster Cards' : 'Directory Table'} view</span>
        </div>

        <div className="view-mode-toggles" role="group" aria-label="View format toggle">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table Directory View"
          >
            <LayoutList size={13} />
            <span>Table Directory</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Team Roster Cards View"
          >
            <LayoutGrid size={13} />
            <span>Team Roster</span>
          </button>
        </div>
      </div>

      {/* 4. Staff Data Table / Cards Grid (Active Directory) */}
      <section className="employees-table-card" aria-label="Staff Table">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner text="Loading staff records..." />
          </div>
        ) : employees.length === 0 ? (
          <div className="employees-empty-state">
            <div className="employees-empty-icon">
              <Users size={28} />
            </div>
            <h3 className="employees-empty-title">No Staff Members Found</h3>
            <p className="employees-empty-desc">
              No employees matched the active filter criteria. Try adjusting your search term or add a new staff member.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-2"
              onClick={handleOpenCreate}
            >
              <UserPlus size={14} />
              <span>Add First Employee</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="employees-table-responsive">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Employee Code</th>
                  <th>Branch</th>
                  <th>System Role</th>
                  <th>Department & Designation</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isSuperAdminEmp = emp.role === ROLES.SUPER_ADMIN || emp.user_id?.role === ROLES.SUPER_ADMIN;
                  const isCurrentLoggedUser = emp.user_id?._id === user?._id || emp.email === user?.email;

                  return (
                    <tr key={emp._id}>
                      {/* Name & Contact */}
                      <td>
                        <div className="staff-member-cell">
                          <div className="staff-avatar-wrap">
                            <img
                              src={getStaffAvatar(emp)}
                              alt={`${emp.first_name} ${emp.last_name}`}
                              className="staff-avatar-img"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="staff-monogram" style={{ display: 'none' }}>
                              {getInitials(emp.first_name, emp.last_name)}
                            </div>
                            <span
                              className={`staff-presence-dot ${
                                emp.employment_status === 'Active'
                                  ? 'active'
                                  : emp.employment_status === 'Probation'
                                  ? 'probation'
                                  : emp.employment_status === 'On Leave'
                                  ? 'on-leave'
                                  : 'terminated'
                              }`}
                              title={`Presence: ${emp.employment_status || 'Active'}`}
                            />
                          </div>
                          <div className="staff-meta">
                            <span className="staff-name">
                              <span>{emp.first_name} {emp.last_name}</span>
                              {isCurrentLoggedUser && <span className="staff-you-pill">You</span>}
                            </span>
                            <a href={`mailto:${emp.email}`} className="staff-email" title="Send official email">
                              <Mail size={11} className="text-neutral-400" />
                              <span>{emp.email}</span>
                            </a>
                            {emp.contact_info?.phone && (
                              <a href={`tel:${emp.contact_info.phone}`} className="staff-phone" title="Call staff contact">
                                <Phone size={11} className="text-neutral-400" />
                                <span>{emp.contact_info.phone}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code Pill */}
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

                      {/* Branch Pill */}
                      <td>
                        <span className={`branch-pill branch-${emp.branch || 'bengaluru'}`}>
                          {BRANCH_LABELS[emp.branch] || emp.branch || 'Bengaluru'}
                        </span>
                      </td>

                      {/* Role Pill */}
                      <td>
                        <span className={`role-pill role-${emp.role || 'counsellor'}`}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </td>

                      {/* Dept & Designation */}
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs text-neutral-800">{emp.designation}</span>
                          <span className="text-[11px] text-neutral-500">{emp.department}</span>
                        </div>
                      </td>

                      {/* Employment Status Badge */}
                      <td>
                        <span className={`status-pill status-${emp.employment_status || 'Active'}`}>
                          <span className="status-dot" />
                          <span>{emp.employment_status || 'Active'}</span>
                        </span>
                      </td>

                      {/* Actions: Edit and Move to Trash */}
                      <td>
                        <div className="staff-row-actions justify-end">
                          <button
                            type="button"
                            className="staff-action-btn"
                            onClick={() => handleOpenEdit(emp)}
                            title="Edit staff details"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          {!isSuperAdminEmp && !isCurrentLoggedUser && (
                            <button
                              type="button"
                              className="staff-action-btn danger"
                              onClick={() => {
                                setTrashTarget(emp);
                                setDeleteReason('Archived by Administrator');
                              }}
                              title="Move to trash vault"
                            >
                              <Trash2 size={12} />
                              <span>Trash</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="p-5">
            <div className="staff-cards-grid" aria-label="Staff Roster Cards">
              {employees.map((emp) => {
                const isSuperAdminEmp = emp.role === ROLES.SUPER_ADMIN || emp.user_id?.role === ROLES.SUPER_ADMIN;
                const isCurrentLoggedUser = emp.user_id?._id === user?._id || emp.email === user?.email;
                const avatarUrl = getStaffAvatar(emp);

                return (
                  <div className="staff-profile-card" key={emp._id}>
                    <div className="staff-card-banner">
                      <div className="staff-card-banner-pattern" />
                      <span className={`status-pill status-${emp.employment_status || 'Active'}`}>
                        <span className="status-dot" />
                        <span>{emp.employment_status || 'Active'}</span>
                      </span>
                      <span className={`branch-pill branch-${emp.branch || 'bengaluru'}`}>
                        {BRANCH_LABELS[emp.branch] || emp.branch || 'Bengaluru'}
                      </span>
                    </div>

                    <div className="staff-card-header">
                      <div className="staff-card-avatar-wrap">
                        <img
                          src={avatarUrl}
                          alt={`${emp.first_name} ${emp.last_name}`}
                          className="staff-card-avatar-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="staff-monogram" style={{ display: 'none', width: '100%', height: '100%' }}>
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <span
                          className={`staff-presence-dot ${
                            emp.employment_status === 'Active'
                              ? 'active'
                              : emp.employment_status === 'Probation'
                              ? 'probation'
                              : 'on-leave'
                          }`}
                        />
                      </div>

                      <span
                        className="staff-code-pill cursor-pointer"
                        onClick={() => handleCopy(emp.employee_code, `code-card-${emp._id}`)}
                        title="Click to copy employee code"
                      >
                        <span>{emp.employee_code}</span>
                        {copiedKey === `code-card-${emp._id}` ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-neutral-400" />
                        )}
                      </span>
                    </div>

                    <div className="staff-card-body">
                      <div className="staff-card-identity">
                        <div className="staff-card-name">
                          <span>{emp.first_name} {emp.last_name}</span>
                          {isCurrentLoggedUser && <span className="staff-you-pill">You</span>}
                        </div>
                        <div className="staff-card-designation">{emp.designation}</div>
                        <div className="staff-card-dept">{emp.department}</div>
                      </div>

                      <div className="staff-card-pills">
                        <span className={`role-pill role-${emp.role || 'counsellor'}`}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </div>

                      <div className="staff-card-contacts">
                        <div className="staff-card-contact-row">
                          <Mail size={12} className="text-amber-800 shrink-0" />
                          <a href={`mailto:${emp.email}`} className="staff-card-contact-link truncate">
                            {emp.email}
                          </a>
                        </div>
                        {emp.contact_info?.phone && (
                          <div className="staff-card-contact-row">
                            <Phone size={12} className="text-amber-800 shrink-0" />
                            <a href={`tel:${emp.contact_info.phone}`} className="staff-card-contact-link">
                              {emp.contact_info.phone}
                            </a>
                          </div>
                        )}
                        {emp.contact_info?.emergency_contact_name && (
                          <div className="staff-card-contact-row text-[10px] text-neutral-500 pt-1 border-t border-amber-100">
                            <HeartPulse size={11} className="text-red-500 shrink-0" />
                            <span>ICE: {emp.contact_info.emergency_contact_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="staff-card-footer">
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <Calendar size={11} />
                        <span>Joined {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="staff-action-btn"
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit staff details"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        {!isSuperAdminEmp && !isCurrentLoggedUser && (
                          <button
                            type="button"
                            className="staff-action-btn danger"
                            onClick={() => {
                              setTrashTarget(emp);
                              setDeleteReason('Archived by Administrator');
                            }}
                            title="Move to trash vault"
                          >
                            <Trash2 size={12} />
                            <span>Trash</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="employees-pagination">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} active staff members
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

      {/* 5. ADD / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setCreatedCredentials(null);
        }}
        title={
          createdCredentials
            ? 'Login Credentials Provisioned'
            : editingEmployee
            ? `Edit Staff — ${editingEmployee.first_name} ${editingEmployee.last_name}`
            : 'Add New Staff Member'
        }
        maxWidth="680px"
      >
        {createdCredentials ? (
          /* Credentials Showcase Box (Replicated from reference project) */
          <div className="space-y-4">
            <div className="credentials-box">
              <div className="credentials-box-header">
                <CheckCircle2 size={24} className="text-emerald-600" />
                <div>
                  <h4 className="credentials-box-title">Staff Account & Credentials Generated</h4>
                  <p className="credentials-box-subtitle">
                    Share these login credentials securely with the employee. Sessions can be signed into immediately.
                  </p>
                </div>
              </div>

              <div className="credentials-rows">
                <div className="credential-row">
                  <span className="credential-label">Employee Code</span>
                  <span className="credential-value">{createdCredentials.employee_code}</span>
                </div>
                <div className="credential-row">
                  <span className="credential-label">Official Email</span>
                  <span className="credential-value">{createdCredentials.email}</span>
                </div>
                <div className="credential-row">
                  <span className="credential-label">Initial Password</span>
                  <span className="credential-value">{createdCredentials.password}</span>
                </div>
                <div className="credential-row">
                  <span className="credential-label">Assigned Role</span>
                  <span className="credential-value">
                    {ROLE_LABELS[createdCredentials.role] || createdCredentials.role}
                  </span>
                </div>
                <div className="credential-row">
                  <span className="credential-label">Assigned Branch</span>
                  <span className="credential-value">
                    {BRANCH_LABELS[createdCredentials.branch] || createdCredentials.branch}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const summary = `Aeterna One Staff Credentials:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nBranch: ${createdCredentials.branch}\nEmployee Code: ${createdCredentials.employee_code}`;
                  handleCopy(summary, 'all-creds');
                }}
              >
                <Copy size={14} />
                <span>Copy All Details</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowModal(false);
                  setCreatedCredentials(null);
                }}
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmitForm} className="employees-modal-form">
            {/* Section 1: Personal & Contact Information Card */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-title">
                  <Users size={15} style={{ color: 'var(--color-maroon-800)' }} />
                  <span>Personal & Contact Information</span>
                </div>
                <span className="form-section-badge">Identity & Bio</span>
              </div>

              {/* Advisor Profile Avatar Selector */}
              <div className="avatar-selector-section">
                <div className="avatar-selector-header">
                  <div className="avatar-selector-label">
                    <Sparkles size={13} style={{ color: 'var(--color-maroon-800)' }} />
                    <span>Select Advisor Profile Photo</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Karnataka Faculty Avatars</span>
                </div>

                <div className="avatar-picker-chips">
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected = form.profile_photo === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        className={`avatar-chip-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setForm({ ...form, profile_photo: av.url })}
                        title={`Select ${av.label}`}
                      >
                        <div className="avatar-chip-img-wrap">
                          <img src={av.url} alt={av.label} className="avatar-chip-img" />
                          {isSelected && (
                            <span className="avatar-chip-check">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span className="avatar-chip-title">{av.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>First Name</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input-control"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="e.g. Ramesh"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Last Name</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input-control"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="e.g. Hegde"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Official Email</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@aeterna.com"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98450 12345"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Employee Code</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input-control font-mono font-bold"
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
                    placeholder="AET-101"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <Calendar size={13} style={{ color: 'var(--color-gold-700)' }} />
                    <span>Joining Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input-control"
                    value={form.joining_date}
                    onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Branch & Governance Placement Card */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-title">
                  <Briefcase size={15} style={{ color: 'var(--color-maroon-800)' }} />
                  <span>Governance & Branch Placement</span>
                </div>
                <span className="form-section-badge">Role & Branch</span>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Allocated Branch</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <select
                    className="form-select-control"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  >
                    <option value={BRANCHES.BENGALURU}>Bengaluru Hub</option>
                    <option value={BRANCHES.MYSURU}>Mysuru Branch</option>
                    <option value={BRANCHES.BELAGAVI}>Belagavi Branch</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>System Role</span>
                    <span className="form-field-required">*</span>
                  </label>
                  {/* Super Admin is STRICTLY EXCLUDED from staff creation dropdown */}
                  <select
                    className="form-select-control"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {PERMITTED_STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Department</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <select
                    className="form-select-control"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Designation</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <select
                    className="form-select-control"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  >
                    {DESIGNATIONS.map((des) => (
                      <option key={des} value={des}>
                        {des}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Employment Status</span>
                  <span className="form-field-required">*</span>
                </label>
                <select
                  className="form-select-control"
                  value={form.employment_status}
                  onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>

            {/* Section 3: Address & Emergency Contacts Card */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-title">
                  <MapPin size={15} style={{ color: 'var(--color-maroon-800)' }} />
                  <span>Address & Emergency Contact</span>
                </div>
                <span className="form-section-badge">Reachability</span>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Residential / Office Address</span>
                </label>
                <input
                  type="text"
                  className="form-input-control"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. #42, 100ft Road, Indiranagar, Bengaluru - 560038"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <HeartPulse size={13} style={{ color: '#e11d48' }} />
                    <span>Emergency Contact Name</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-control"
                    value={form.emergency_contact_name}
                    onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                    placeholder="e.g. Anita Hegde (Spouse)"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Emergency Contact Phone</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input-control"
                    value={form.emergency_contact_phone}
                    onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                    placeholder="+91 98451 99999"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Initial Password Card (only when creating new staff) */}
            {!editingEmployee && (
              <div className="form-section-card">
                <div className="form-section-header">
                  <div className="form-section-title">
                    <KeyRound size={15} style={{ color: 'var(--color-maroon-800)' }} />
                    <span>Initial Login Credentials</span>
                  </div>
                  <span className="form-section-badge">Security Access</span>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Temporary Password</span>
                    <span className="form-field-required">*</span>
                  </label>
                  <div className="form-password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input-control font-mono"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Password@123"
                    />
                    <button
                      type="button"
                      className="form-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="form-field-hint">
                    Min 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
                  </span>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="form-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving Staff...' : editingEmployee ? 'Update Record' : 'Create & Provision'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 6. MOVE TO TRASH CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(trashTarget)}
        onClose={() => setTrashTarget(null)}
        onConfirm={handleConfirmMoveToTrash}
        title="Move Staff Member to Trash?"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to archive <strong>{trashTarget?.first_name} {trashTarget?.last_name}</strong>?
            </p>
            <p className="text-xs text-neutral-500 mb-3">
              This will immediately revoke their system access and terminate active login sessions. The record can be restored anytime from the Trash & Archive Vault.
            </p>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Reason for archiving:</label>
            <input
              type="text"
              className="form-select-control text-xs w-full"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Left organization / seasonal sabbatical"
            />
          </div>
        }
        confirmText="Move to Trash"
        cancelText="Keep Active"
        danger={true}
        loading={isTrashing}
      />
    </div>
  );
};
