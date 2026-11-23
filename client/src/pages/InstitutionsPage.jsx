import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  Building,
  Target,
  Plus,
  Search,
  MapPin,
  User,
  Phone,
  Mail,
  ExternalLink,
  Award,
  RefreshCw,
  Building2,
  Trash2,
  Globe,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useInstitutions,
  useInstitutionStats,
  useInstitutionMutations,
} from '../hooks/useInstitutionQueries';
import { AddInstitutionModal } from '../components/institutions/AddInstitutionModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { BRANCHES, ROLES } from '../config/constants';
import '../styles/institutions.css';

const TYPE_CONFIG_MAP = {
  school: {
    label: 'Feeder School',
    icon: School,
    badgeClass: 'school',
    emoji: '🏫',
  },
  college: {
    label: 'Partner College',
    icon: Building,
    badgeClass: 'college',
    emoji: '🏛',
  },
  coaching_institute: {
    label: 'Coaching Institute',
    icon: Target,
    badgeClass: 'coaching_institute',
    emoji: '🎯',
  },
};

export const InstitutionsPage = () => {
  const { user } = useAuth();

  // Filters
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [partnershipFilter, setPartnershipFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // TanStack Query Filters Memoization
  const filters = useMemo(() => {
    const f = { page, limit: 12 };
    if (search.trim()) f.search = search.trim();
    if (activeTypeTab !== 'all') f.type = activeTypeTab;
    if (branchFilter !== 'all') f.branch = branchFilter;
    if (partnershipFilter !== 'all') f.partnership_status = partnershipFilter;
    return f;
  }, [page, search, activeTypeTab, branchFilter, partnershipFilter]);

  // Unified TanStack Query Cache (Zero Redundant Network Requests)
  const {
    institutions,
    pagination,
    isLoading: loading,
    isFetching: refreshing,
    refetch: refetchInstitutions,
  } = useInstitutions(filters);

  const { stats, refetch: refetchStats } = useInstitutionStats();
  const { deleteInstitution, isDeleting } = useInstitutionMutations();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, activeTypeTab, branchFilter, partnershipFilter]);

  // Debounced or direct search trigger on Enter / Reset page
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchInstitutions(), refetchStats()]);
  };

  const handleInstitutionCreated = () => {
    handleRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInstitution(deleteTarget._id);
      toast.success(`${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete institution:', err);
      toast.error('Failed to delete institution.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active MoU':
      case 'Partner':
        return 'active-mou';
      case 'Campus Visited':
        return 'campus-visited';
      case 'Prospective':
      case 'Contacted':
      default:
        return 'prospective';
    }
  };

  return (
    <div className="institutions-container">
      {/* 1. Hero Header Banner */}
      <section className="institutions-hero" aria-label="Institutions Directory Header">
        <div className="institutions-hero-top">
          <div>
            <div className="institutions-badge-tag">
              <School size={13} />
              <span>Karnataka Educational Outreach & Feeder Network</span>
            </div>
            <h1 className="institutions-hero-title">Institutions Master Directory</h1>
            <p className="institutions-hero-subtitle">
              Comprehensive institutional directory of Feeder Schools, Undergraduate Colleges, and Test Prep Coaching Academies across Bengaluru, Mysuru, and Belagavi.
            </p>
          </div>

          <div className="institutions-hero-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh directory"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="institutions-primary-cta"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Institution</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Aggregate Metric Cards */}
      <section className="institutions-stats-grid" aria-label="Directory Statistics">
        <div className="institution-stat-card">
          <div className="stat-icon-wrapper all">
            <Building2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Institutions</span>
          </div>
        </div>

        <div className="institution-stat-card">
          <div className="stat-icon-wrapper school">
            <School size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalSchools}</span>
            <span className="stat-label">Feeder Schools</span>
          </div>
        </div>

        <div className="institution-stat-card">
          <div className="stat-icon-wrapper college">
            <Building size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalColleges}</span>
            <span className="stat-label">Degree Colleges</span>
          </div>
        </div>

        <div className="institution-stat-card">
          <div className="stat-icon-wrapper coaching">
            <Target size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalCoaching}</span>
            <span className="stat-label">Coaching Academies</span>
          </div>
        </div>
      </section>

      {/* 3. Controls & Filter Bar */}
      <section className="institutions-controls" aria-label="Filters and Type Selection">
        {/* Type Tabs */}
        <div className="institutions-type-tabs">
          <button
            type="button"
            className={`type-tab-btn ${activeTypeTab === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveTypeTab('all');
              setPage(1);
            }}
          >
            <span>All Institutions</span>
            <span className="type-tab-count">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`type-tab-btn ${activeTypeTab === 'school' ? 'active' : ''}`}
            onClick={() => {
              setActiveTypeTab('school');
              setPage(1);
            }}
          >
            <span>🏫 Schools</span>
            <span className="type-tab-count">{stats.totalSchools}</span>
          </button>

          <button
            type="button"
            className={`type-tab-btn ${activeTypeTab === 'college' ? 'active' : ''}`}
            onClick={() => {
              setActiveTypeTab('college');
              setPage(1);
            }}
          >
            <span>🏛 Colleges</span>
            <span className="type-tab-count">{stats.totalColleges}</span>
          </button>

          <button
            type="button"
            className={`type-tab-btn ${activeTypeTab === 'coaching_institute' ? 'active' : ''}`}
            onClick={() => {
              setActiveTypeTab('coaching_institute');
              setPage(1);
            }}
          >
            <span>🎯 Coaching Academies</span>
            <span className="type-tab-count">{stats.totalCoaching}</span>
          </button>
        </div>

        {/* Filter Row: Search & Dropdowns */}
        <form onSubmit={handleSearchSubmit} className="institutions-filter-row">
          <div className="institutions-search-wrap">
            <Search size={16} className="institutions-search-icon" />
            <input
              type="text"
              className="institutions-search-input"
              placeholder="Search by institution name, city, contact person, or board..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <div className="institutions-filter-selects">
            <select
              className="institutions-select"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Branches</option>
              <option value={BRANCHES.BENGALURU}>Bengaluru</option>
              <option value={BRANCHES.MYSURU}>Mysuru</option>
              <option value={BRANCHES.BELAGAVI}>Belagavi</option>
            </select>

            <select
              className="institutions-select"
              value={partnershipFilter}
              onChange={(e) => {
                setPartnershipFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Partnerships</option>
              <option value="Active MoU">Active MoU</option>
              <option value="Partner">Partner</option>
              <option value="Campus Visited">Campus Visited</option>
              <option value="Contacted">Contacted</option>
              <option value="Prospective">Prospective</option>
            </select>

            <button type="submit" className="btn btn-secondary btn-sm">
              <Search size={13} />
              <span>Search</span>
            </button>
          </div>
        </form>
      </section>

      {/* 4. Institutions Grid Content */}
      {loading ? (
        <div className="p-16 flex justify-center">
          <LoadingSpinner text="Loading institutions directory..." />
        </div>
      ) : institutions.length === 0 ? (
        <div className="institutions-empty">
          <div className="empty-icon-circle">
            <School size={30} />
          </div>
          <h3 className="empty-title">No Institutions Found</h3>
          <p className="empty-desc">
            No partner schools, colleges, or coaching institutes matched your current filters. Add your first institution or adjust filter parameters.
          </p>
          <button
            type="button"
            className="institutions-primary-cta mt-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add First Institution</span>
          </button>
        </div>
      ) : (
        <div className="institutions-grid">
          {institutions.map((inst) => {
            const config = TYPE_CONFIG_MAP[inst.institution_type] || TYPE_CONFIG_MAP.school;
            const Icon = config.icon;

            return (
              <article key={inst._id} className="institution-card">
                {/* Card Header: Type Badge & Status */}
                <div className="institution-card-header">
                  <span className={`institution-type-badge ${config.badgeClass}`}>
                    <Icon size={13} />
                    <span>{config.label}</span>
                  </span>

                  <span
                    className={`institution-status-badge ${getStatusBadgeClass(
                      inst.partnership_status
                    )}`}
                  >
                    <span>{inst.partnership_status || 'Prospective'}</span>
                  </span>
                </div>

                {/* Institution Identity */}
                <div className="institution-card-body">
                  <h3 className="institution-name">{inst.name}</h3>
                  {inst.category && (
                    <span className="institution-category">{inst.category}</span>
                  )}

                  <div className="institution-meta-row">
                    <span className="institution-pill">
                      <MapPin size={11} />
                      <span>{inst.city || 'Bengaluru'}, {inst.state || 'Karnataka'}</span>
                    </span>

                    {inst.board_or_affiliation && (
                      <span className="institution-pill">
                        <Award size={11} />
                        <span>{inst.board_or_affiliation}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Person Box */}
                {(inst.contact_person?.name || inst.official_email || inst.official_phone) && (
                  <div className="institution-contact-box">
                    {inst.contact_person?.name && (
                      <div className="contact-person-header">
                        <User size={13} className="text-maroon-700" />
                        <span>
                          {inst.contact_person.name}
                          {inst.contact_person.designation && (
                            <span className="text-neutral-500 font-normal">
                              {' '}— {inst.contact_person.designation}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {(inst.contact_person?.phone || inst.official_phone) && (
                      <div className="contact-row">
                        <Phone size={12} />
                        <a href={`tel:${inst.contact_person?.phone || inst.official_phone}`}>
                          {inst.contact_person?.phone || inst.official_phone}
                        </a>
                      </div>
                    )}

                    {(inst.contact_person?.email || inst.official_email) && (
                      <div className="contact-row">
                        <Mail size={12} />
                        <a href={`mailto:${inst.contact_person?.email || inst.official_email}`}>
                          {inst.contact_person?.email || inst.official_email}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Target Destinations */}
                {inst.target_destinations && inst.target_destinations.length > 0 && (
                  <div className="institution-destinations">
                    <span className="destinations-label">Target Destinations</span>
                    <div className="destinations-pills">
                      {inst.target_destinations.slice(0, 4).map((dest) => (
                        <span key={dest} className="destination-chip">
                          {dest}
                        </span>
                      ))}
                      {inst.target_destinations.length > 4 && (
                        <span className="destination-chip font-bold">
                          +{inst.target_destinations.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Footer: Branch & Actions */}
                <div className="institution-card-footer">
                  <span className="institution-branch-tag">
                    Branch: {inst.branch}
                  </span>

                  {user?.role === ROLES.SUPER_ADMIN && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs text-rose-600 hover:text-rose-800"
                      onClick={() => setDeleteTarget(inst)}
                      title="Delete Institution"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Bar */}
      {pagination.totalPages > 1 && (
        <section className="institutions-pagination" aria-label="Pagination">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} institutions
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
        </section>
      )}

      {/* 6. Add Institution Modal */}
      <AddInstitutionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onInstitutionCreated={handleInstitutionCreated}
      />

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Institution?"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from the directory?`}
        confirmText="Remove Institution"
        cancelText="Cancel"
        danger={true}
        loading={isDeleting}
      />
    </div>
  );
};
