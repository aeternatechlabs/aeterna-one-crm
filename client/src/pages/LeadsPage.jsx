import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  UserPlus,
  RefreshCw,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  LayoutList,
  Edit2,
  Trash2,
  Building2,
  Globe,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ROLES, BRANCHES, BRANCH_LABELS } from '../config/constants';
import { useLeads, useLeadMutations } from '../hooks/useLeadQueries';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import '../styles/leads.css';

const DEFAULT_LEAD_FORM = {
  name: '',
  phone_number: '',
  email: '',
  branch: BRANCHES.BENGALURU,
  destination_country: 'United Kingdom',
  study_level: "Master's",
  intake_target: 'Fall 2026',
  priority: 'medium',
  notes: '',
  follow_up_date: '',
  follow_up_time: '11:00',
};

const LEAD_STATUSES = [
  'New',
  'Assigned',
  'No Answer',
  'Only WhatsApp',
  'Interested',
  'Not Interested',
  'Follow Up',
  'Visited',
  'Deal Closed',
  'Confirm Visitor',
];

const DESTINATIONS = [
  'United Kingdom',
  'Canada',
  'United States',
  'Australia',
  'Ireland',
  'Germany',
  'New Zealand',
  'Singapore',
  'France',
];

const STUDY_LEVELS = [
  "Master's",
  "Bachelor's",
  'MBA',
  'Diploma',
  'PhD',
  'Other',
];

export const LeadsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [followUpQuickFilter, setFollowUpQuickFilter] = useState('all'); // 'all' | 'today' | 'overdue' | 'new'
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Memoized query filter
  const filters = useMemo(() => {
    const f = { page, limit: 20 };
    if (search.trim()) f.search = search.trim();
    if (statusFilter !== 'all') f.status = statusFilter;
    if (priorityFilter !== 'all') f.priority = priorityFilter;
    if (branchFilter !== 'all') f.branch = branchFilter;
    if (followUpQuickFilter !== 'all') f.follow_up_view = followUpQuickFilter;
    return f;
  }, [page, search, statusFilter, priorityFilter, branchFilter, followUpQuickFilter]);

  const { leads, pagination, stats, isLoading: loading, refetch: fetchLeads } = useLeads(filters);
  const {
    createLead,
    updateLead,
    updateLeadStatus,
    convertToStudent,
    deleteLead,
    isCreating,
    isUpdating,
    isConverting,
  } = useLeadMutations();

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(DEFAULT_LEAD_FORM);

  // Status Change Modal
  const [statusModalLead, setStatusModalLead] = useState(null);
  const [newStatus, setNewStatus] = useState('Interested');
  const [statusNote, setStatusNote] = useState('');
  const [statusFollowUpDate, setStatusFollowUpDate] = useState('');
  const [statusFollowUpTime, setStatusFollowUpTime] = useState('11:00');

  // Convert to Pipeline Modal
  const [convertTarget, setConvertTarget] = useState(null);

  // Delete Lead Confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, branchFilter, followUpQuickFilter]);

  const handleOpenCreate = () => {
    setEditingLead(null);
    setForm({
      ...DEFAULT_LEAD_FORM,
      branch: user?.branch && user.branch !== BRANCHES.ALL ? user.branch : BRANCHES.BENGALURU,
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      phone_number: lead.phone_number || '',
      email: lead.email || '',
      branch: lead.branch || BRANCHES.BENGALURU,
      destination_country: lead.destination_country || 'United Kingdom',
      study_level: lead.study_level || "Master's",
      intake_target: lead.intake_target || 'Fall 2026',
      priority: lead.priority || 'medium',
      notes: lead.notes || '',
      follow_up_date: lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().split('T')[0] : '',
      follow_up_time: lead.follow_up_time || '11:00',
    });
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await updateLead({ id: editingLead._id, data: form });
        toast.success(`Inquiry for ${form.name} updated successfully!`);
      } else {
        await createLead(form);
        toast.success(`New lead ${form.name} created successfully!`);
      }
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err.friendlyMessage || err.message || 'Operation failed');
    }
  };

  const handleOpenStatusModal = (lead) => {
    setStatusModalLead(lead);
    setNewStatus(lead.current_status || 'Interested');
    setStatusNote('');
    setStatusFollowUpDate(lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().split('T')[0] : '');
    setStatusFollowUpTime(lead.follow_up_time || '11:00');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusModalLead) return;
    try {
      await updateLeadStatus({
        id: statusModalLead._id,
        data: {
          status: newStatus,
          notes: statusNote.trim() || undefined,
          follow_up_date: statusFollowUpDate || undefined,
          follow_up_time: statusFollowUpTime || undefined,
        },
      });
      toast.success(`Status updated to "${newStatus}" for ${statusModalLead.name}`);
      setStatusModalLead(null);
    } catch (err) {
      toast.error(err.friendlyMessage || err.message || 'Failed to update status');
    }
  };

  const handleConfirmConvert = async () => {
    if (!convertTarget) return;
    try {
      await convertToStudent(convertTarget._id);
      toast.success(`${convertTarget.name} converted to Admissions Pipeline candidate!`);
      setConvertTarget(null);
    } catch (err) {
      toast.error(err.friendlyMessage || err.message || 'Failed to convert lead');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead(deleteTarget._id);
      toast.success(`Lead ${deleteTarget.name} moved to trash`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to delete lead');
    }
  };

  return (
    <div className="leads-container">
      {/* 1. Header Hero Banner */}
      <section className="leads-hero" aria-label="Lead Management Hero">
        <div className="leads-hero-backdrop">
          <img
            src="/leads/leads-hero-banner.jpg"
            alt="Study Abroad Advisory & Lead Hub"
            className="leads-hero-bg-img"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="leads-hero-overlay" />
        </div>

        <div className="leads-hero-left">
          <div className="leads-badge-tag">
            <Target size={14} strokeWidth={2.5} />
            <span>Admissions Intake & Inquiries</span>
          </div>
          <h1 className="leads-hero-title">Lead Management & Student Inquiries</h1>
          <p className="leads-hero-subtitle">
            Capture, qualify, and convert prospective study abroad inquiries across Karnataka branches into admissions pipeline candidates.
          </p>

          <div className="leads-team-pulse-strip">
            <div className="pulse-item">
              <span className="pulse-indicator" />
              <span className="pulse-text">Active Pipeline: <strong>{stats.total} Inquiries</strong></span>
            </div>
            <div className="pulse-separator">•</div>
            <div className="pulse-item">
              <Sparkles size={12} className="text-emerald-700" />
              <span className="pulse-text">Interested: <strong>{stats.interested} Qualified</strong></span>
            </div>
            <div className="pulse-separator">•</div>
            <div className="pulse-item">
              <Building2 size={12} className="text-amber-800" />
              <span className="pulse-text">Hubs: Bengaluru • Mysuru • Belagavi</span>
            </div>
          </div>
        </div>

        <div className="leads-hero-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchLeads}
            title="Refresh Inquiries"
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
            <span>New Lead Inquiry</span>
          </button>
        </div>
      </section>

      {/* 2. KPI Metrics Grid */}
      <section className="leads-kpi-grid" aria-label="Lead Metrics">
        <div className="leads-kpi-card">
          <div className="leads-kpi-info">
            <span className="leads-kpi-label">Total Inquiries</span>
            <span className="leads-kpi-val">{stats.total}</span>
          </div>
          <div className="leads-kpi-icon-wrap">
            <Target size={22} />
          </div>
        </div>

        <div className="leads-kpi-card">
          <div className="leads-kpi-info">
            <span className="leads-kpi-label">New & Unassigned</span>
            <span className="leads-kpi-val">{stats.new}</span>
          </div>
          <div className="leads-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
            <Sparkles size={22} />
          </div>
        </div>

        <div className="leads-kpi-card">
          <div className="leads-kpi-info">
            <span className="leads-kpi-label">Interested / Qualified</span>
            <span className="leads-kpi-val">{stats.interested}</span>
          </div>
          <div className="leads-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="leads-kpi-card">
          <div className="leads-kpi-info">
            <span className="leads-kpi-label">Enrolled / Converted</span>
            <span className="leads-kpi-val">{stats.deal_closed}</span>
          </div>
          <div className="leads-kpi-icon-wrap" style={{ background: '#fdf4ff', color: '#9333ea', borderColor: '#f0abfc' }}>
            <GraduationCap size={22} />
          </div>
        </div>
      </section>

      {/* 3. Controls & Filter Bar */}
      <section className="leads-controls" aria-label="Inquiry Filters">
        <div className="leads-search-row">
          <div className="leads-search-input-wrap">
            <Search size={16} className="leads-search-icon" />
            <input
              type="text"
              className="leads-search-input"
              placeholder="Search by student name, phone (+91), email, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="leads-filter-selects">
            {/* Branch Filter */}
            <select
              className="leads-filter-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value={BRANCHES.BENGALURU}>Bengaluru Hub</option>
              <option value={BRANCHES.MYSURU}>Mysuru Branch</option>
              <option value={BRANCHES.BELAGAVI}>Belagavi Campus</option>
            </select>

            {/* Status Filter */}
            <select
              className="leads-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {LEAD_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              className="leads-filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Quick Follow-up View Tabs (Matching Reference Project) */}
        <div className="leads-quick-tabs">
          {[
            { id: 'all', label: 'All Inquiries' },
            { id: 'today', label: "Today's Follow-ups" },
            { id: 'overdue', label: 'Overdue Follow-ups' },
            { id: 'new', label: 'New / Fresh Leads' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`leads-quick-tab ${followUpQuickFilter === tab.id ? 'active' : ''}`}
              onClick={() => setFollowUpQuickFilter(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* View Mode Bar */}
      <div className="leads-view-mode-bar">
        <div className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
          <Target size={14} style={{ color: 'var(--color-maroon-800)' }} />
          <span>Showing {leads.length} inquiries in {viewMode === 'cards' ? 'Inquiry Cards' : 'Directory Table'} view</span>
        </div>

        <div className="view-mode-toggles" role="group" aria-label="View format toggle">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <LayoutList size={13} />
            <span>Directory Table</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid size={13} />
            <span>Inquiry Cards</span>
          </button>
        </div>
      </div>

      {/* 4. Leads Main Data Table / Cards Grid */}
      <section className="leads-table-card" aria-label="Leads Data View">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner text="Loading student inquiries..." />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Target size={28} />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No Student Inquiries Found</h3>
            <p className="text-xs text-neutral-500 max-w-md">
              No prospective leads matched your active search or filter criteria. Create a new lead or adjust your filters.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-2"
              onClick={handleOpenCreate}
            >
              <UserPlus size={14} />
              <span>Create First Inquiry</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="leads-table-responsive">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Student Candidate</th>
                  <th>Direct Reach-out</th>
                  <th>Country & Level</th>
                  <th>Branch</th>
                  <th>Priority</th>
                  <th>Status & Call Outcome</th>
                  <th>Follow-up Schedule</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const rawPhone = lead.phone_number ? lead.phone_number.replace(/\D/g, '') : '';
                  const statusClass = `status-${(lead.current_status || 'New').replace(/\s+/g, '-')}`;

                  return (
                    <tr key={lead._id}>
                      {/* Name & Contact */}
                      <td>
                        <div className="lead-name-cell">
                          <span className="lead-name">{lead.name}</span>
                          <span className="lead-subtext">{lead.email || 'No email provided'}</span>
                        </div>
                      </td>

                      {/* Reach-out buttons */}
                      <td>
                        <div className="reach-actions">
                          {rawPhone && (
                            <a
                              href={`https://wa.me/${rawPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="reach-btn whatsapp"
                              title="Message via WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                          {lead.phone_number && (
                            <a
                              href={`tel:${lead.phone_number}`}
                              className="reach-btn phone"
                              title={`Call ${lead.phone_number}`}
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="reach-btn email"
                              title={`Email ${lead.email}`}
                            >
                              <Mail size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Destination Country & Level */}
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs text-neutral-800 flex items-center gap-1">
                            <Globe size={11} className="text-amber-800" />
                            <span>{lead.destination_country || 'United Kingdom'}</span>
                          </span>
                          <span className="text-[11px] text-neutral-500">{lead.study_level} • {lead.intake_target}</span>
                        </div>
                      </td>

                      {/* Branch Pill */}
                      <td>
                        <span className={`branch-pill branch-${lead.branch || 'bengaluru'}`}>
                          {BRANCH_LABELS[lead.branch] || lead.branch || 'Bengaluru'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td>
                        <span className={`priority-pill priority-${lead.priority || 'medium'}`}>
                          {lead.priority || 'medium'}
                        </span>
                      </td>

                      {/* Status (Clickable to change) */}
                      <td>
                        <span
                          className={`lead-status-badge ${statusClass}`}
                          onClick={() => handleOpenStatusModal(lead)}
                          title="Click to update status and follow-up outcome"
                        >
                          <span>{lead.current_status || 'New'}</span>
                        </span>
                      </td>

                      {/* Follow-up date / time */}
                      <td>
                        <div className="flex flex-col gap-0.5 text-xs text-neutral-700">
                          {lead.follow_up_date ? (
                            <span className="font-medium flex items-center gap-1">
                              <Calendar size={11} className="text-neutral-400" />
                              <span>{new Date(lead.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              {lead.follow_up_time && <span className="text-[10px] text-neutral-400">({lead.follow_up_time})</span>}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[11px] italic">Not scheduled</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.converted_to_student ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Enrolled
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              onClick={() => setConvertTarget(lead)}
                              title="Convert lead to Admissions Pipeline candidate"
                            >
                              <ArrowRight size={11} />
                              <span>Convert</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="p-1 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-100"
                            onClick={() => handleOpenEdit(lead)}
                            title="Edit Inquiry Details"
                          >
                            <Edit2 size={13} />
                          </button>

                          {user?.role === ROLES.SUPER_ADMIN && (
                            <button
                              type="button"
                              className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                              onClick={() => setDeleteTarget(lead)}
                              title="Delete Lead"
                            >
                              <Trash2 size={13} />
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
            <div className="leads-cards-grid" aria-label="Inquiry Cards View">
              {leads.map((lead) => {
                const rawPhone = lead.phone_number ? lead.phone_number.replace(/\D/g, '') : '';
                const statusClass = `status-${(lead.current_status || 'New').replace(/\s+/g, '-')}`;

                return (
                  <div className="lead-profile-card" key={lead._id}>
                    <div className="lead-card-banner">
                      <span className={`lead-status-badge ${statusClass}`} onClick={() => handleOpenStatusModal(lead)}>
                        {lead.current_status || 'New'}
                      </span>
                      <span className={`priority-pill priority-${lead.priority || 'medium'}`}>
                        {lead.priority || 'medium'}
                      </span>
                    </div>

                    <div className="lead-card-body">
                      <div className="lead-card-identity">
                        <span className="lead-card-name">{lead.name}</span>
                        <span className="text-[11px] text-neutral-500">{lead.destination_country} • {lead.study_level}</span>
                      </div>

                      <div className="lead-card-details">
                        <div className="lead-card-row">
                          <Phone size={12} className="text-amber-800 shrink-0" />
                          <span>{lead.phone_number}</span>
                        </div>
                        {lead.email && (
                          <div className="lead-card-row">
                            <Mail size={12} className="text-amber-800 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        <div className="lead-card-row text-[10px] text-neutral-500">
                          <Calendar size={11} className="text-amber-800 shrink-0" />
                          <span>Follow-up: {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-IN') : 'None'}</span>
                        </div>
                      </div>

                      {/* Reachout Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {rawPhone && (
                          <a
                            href={`https://wa.me/${rawPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-xs flex-1 text-emerald-700"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        {lead.phone_number && (
                          <a
                            href={`tel:${lead.phone_number}`}
                            className="btn btn-secondary btn-xs flex-1 text-sky-700"
                          >
                            <Phone size={12} />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="lead-card-footer">
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleOpenEdit(lead)}
                      >
                        <Edit2 size={11} />
                        <span>Edit</span>
                      </button>

                      {lead.converted_to_student ? (
                        <span className="text-[11px] font-bold text-emerald-700">Enrolled Candidate</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => setConvertTarget(lead)}
                        >
                          <ArrowRight size={11} />
                          <span>Convert to Student</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Pagination Bar (Exact Reference Project Contract) */}
        {pagination.totalPages > 1 && (
          <div className="leads-pagination">
            <span>
              Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total inquiries
            </span>

            <div className="pagination-pages">
              <button
                type="button"
                className="pagination-btn"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              <span className="font-semibold px-2 text-xs text-neutral-700">
                {pagination.page} / {pagination.totalPages}
              </span>

              <button
                type="button"
                className="pagination-btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 6. CREATE / EDIT INQUIRY MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingLead ? `Edit Inquiry — ${editingLead.name}` : 'New Student Lead Inquiry'}
        maxWidth="640px"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-field-label">
                <span>Student Full Name</span>
                <span className="form-field-required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-input-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh Hegde"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">
                <span>Phone Number</span>
                <span className="form-field-required">*</span>
              </label>
              <input
                type="tel"
                required
                className="form-input-control"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+91 98450 12345"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-field-label">
                <span>Email Address</span>
              </label>
              <input
                type="email"
                className="form-input-control"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="student@example.com"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">
                <span>Target Study Level</span>
              </label>
              <select
                className="form-select-control"
                value={form.study_level}
                onChange={(e) => setForm({ ...form, study_level: e.target.value })}
              >
                {STUDY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-field-label">
                <span>Destination Country</span>
              </label>
              <select
                className="form-select-control"
                value={form.destination_country}
                onChange={(e) => setForm({ ...form, destination_country: e.target.value })}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">
                <span>Allocated Branch</span>
              </label>
              <select
                className="form-select-control"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              >
                <option value={BRANCHES.BENGALURU}>Bengaluru Hub</option>
                <option value={BRANCHES.MYSURU}>Mysuru Branch</option>
                <option value={BRANCHES.BELAGAVI}>Belagavi Campus</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-field-label">
                <span>Priority Level</span>
              </label>
              <select
                className="form-select-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">
                <span>Follow-up Date</span>
              </label>
              <input
                type="date"
                className="form-input-control"
                value={form.follow_up_date}
                onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">
              <span>Counseling Notes & Candidate Preferences</span>
            </label>
            <textarea
              rows={3}
              className="form-input-control"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Candidate background, budget preferences, IELTS score, intake..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : editingLead ? 'Update Inquiry' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. UPDATE STATUS & FOLLOW-UP MODAL */}
      <Modal
        isOpen={!!statusModalLead}
        onClose={() => setStatusModalLead(null)}
        title={`Update Status — ${statusModalLead?.name || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div className="form-field-group">
            <label className="form-field-label">
              <span>Inquiry Call / Visit Outcome</span>
              <span className="form-field-required">*</span>
            </label>
            <select
              className="form-select-control"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {LEAD_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-field-label">Next Follow-up Date</label>
              <input
                type="date"
                className="form-input-control"
                value={statusFollowUpDate}
                onChange={(e) => setStatusFollowUpDate(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="form-field-label">Scheduled Time</label>
              <input
                type="time"
                className="form-input-control"
                value={statusFollowUpTime}
                onChange={(e) => setStatusFollowUpTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Call Discussion Remarks</label>
            <textarea
              rows={2}
              className="form-input-control"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. Student interested in UK September intake, will visit branch tomorrow..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStatusModalLead(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Outcome
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. 1-CLICK CONVERT TO PIPELINE CONFIRM */}
      <ConfirmDialog
        isOpen={!!convertTarget}
        title="Convert Lead to Admissions Pipeline?"
        message={`This will convert ${convertTarget?.name} into an official Admissions Pipeline student. Their target country (${convertTarget?.destination_country || 'United Kingdom'}) and study level will be provisioned into Stage 1 (New).`}
        confirmText="Convert to Pipeline Candidate"
        loading={isConverting}
        onConfirm={handleConfirmConvert}
        onClose={() => setConvertTarget(null)}
      />

      {/* 9. DELETE LEAD CONFIRM */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Move Lead to Trash?"
        message={`Are you sure you want to move inquiry ${deleteTarget?.name} to trash?`}
        confirmText="Move to Trash"
        danger={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
