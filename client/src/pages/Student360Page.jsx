import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudents, useStudent, useAddStudentNote } from '../hooks/useStudentQueries';
import { StudentHeader } from '../components/students/StudentHeader';
import { StudentKeyFacts } from '../components/students/StudentKeyFacts';
import { StudentTabs } from '../components/students/StudentTabs';
import { AddNoteModal } from '../components/students/AddNoteModal';
import { StudentSkeleton } from '../components/students/StudentSkeleton';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { BRANCHES, ROLES } from '../config/constants';
import toast from 'react-hot-toast';

export const Student360Page = () => {
  const { id: routeStudentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Selected student state for split or detailed view
  const [selectedStudentId, setSelectedStudentId] = useState(routeStudentId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(
    user?.role === ROLES.SUPER_ADMIN ? 'all' : user?.branch || 'bengaluru'
  );
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Sync URL params with local state
  useEffect(() => {
    if (routeStudentId) {
      setSelectedStudentId(routeStudentId);
    }
  }, [routeStudentId]);

  // Query directory list
  const listFilters = {
    branch: selectedBranch,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    search: searchTerm || undefined,
    page,
    limit: 12,
  };

  const {
    students,
    pagination,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useStudents(listFilters, {
    enabled: !selectedStudentId,
  });

  // Query individual student details
  const {
    student: activeStudent,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useStudent(selectedStudentId, {
    enabled: Boolean(selectedStudentId),
  });

  // Note mutation
  const addNoteMutation = useAddStudentNote();

  const handleSelectStudent = (studentId) => {
    setSelectedStudentId(studentId);
    navigate(`/students/${studentId}`);
  };

  const handleBackToDirectory = () => {
    setSelectedStudentId(null);
    navigate('/students');
  };

  const handleNoteSubmit = async (noteData) => {
    if (!selectedStudentId) return;
    try {
      await addNoteMutation.mutateAsync({
        id: selectedStudentId,
        noteData,
      });
      toast.success('Consultation note added successfully');
      setIsNoteModalOpen(false);
      refetchDetail();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to add note');
    }
  };

  const branchOptions = [
    ...(user?.role === ROLES.SUPER_ADMIN ? [{ value: 'all', label: 'All Branches' }] : []),
    { value: BRANCHES.BENGALURU, label: 'Bengaluru HQ' },
    { value: BRANCHES.MYSURU, label: 'Mysuru Branch' },
    { value: BRANCHES.BELAGAVI, label: 'Belagavi Branch' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active Students' },
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'archived', label: 'Archived' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ];

  return (
    <div className="student-360-page-container">
      {/* ── View Mode A: Individual Student 360° Profile ── */}
      {selectedStudentId ? (
        <div className="student-profile-view">
          {isDetailLoading ? (
            <StudentSkeleton />
          ) : isDetailError || !activeStudent ? (
            <div className="error-state-card text-center p-8">
              <h2 className="text-xl font-bold text-danger mb-2">Student Profile Not Available</h2>
              <p className="text-muted mb-4">
                The requested student record could not be loaded or belongs to another branch.
              </p>
              <Button variant="primary" onClick={handleBackToDirectory}>
                ← Return to Student Directory
              </Button>
            </div>
          ) : (
            <>
              <StudentHeader
                student={activeStudent}
                onAddNote={() => setIsNoteModalOpen(true)}
                onBack={handleBackToDirectory}
              />

              <StudentKeyFacts
                student={activeStudent}
                userRole={user?.role}
              />

              <StudentTabs
                student={activeStudent}
                userRole={user?.role}
                onAddNote={() => setIsNoteModalOpen(true)}
              />

              <AddNoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                onSubmit={handleNoteSubmit}
                isSubmitting={addNoteMutation.isPending}
              />
            </>
          )}
        </div>
      ) : (
        /* ── View Mode B: Student Directory ── */
        <div className="student-directory-view">
          <header className="directory-header mb-6">
            <div className="directory-header-title-row flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-maroon-900 tracking-tight">Student 360° Directory</h1>
                <p className="text-sm text-secondary">
                  Complete candidate dossiers, academic histories, document vaults, and consultation tracking.
                </p>
              </div>
              <div className="directory-stats-badge">
                <Badge variant="primary" size="lg">
                  {pagination?.total || 0} Total Profiles
                </Badge>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="directory-filter-bar flex flex-wrap gap-3 items-center">
              <div className="search-input-wrap flex-1 min-w-[240px]">
                <Input
                  type="search"
                  placeholder="Search by student name, email, or student ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Search student profiles"
                />
              </div>

              {user?.role === ROLES.SUPER_ADMIN && (
                <div className="branch-filter-wrap w-48">
                  <Select
                    value={selectedBranch}
                    onChange={(val) => {
                      setSelectedBranch(val);
                      setPage(1);
                    }}
                    options={branchOptions}
                    aria-label="Filter by branch"
                  />
                </div>
              )}

              <div className="status-filter-wrap w-44">
                <Select
                  value={selectedStatus}
                  onChange={(val) => {
                    setSelectedStatus(val);
                    setPage(1);
                  }}
                  options={statusOptions}
                  aria-label="Filter by status"
                />
              </div>
            </div>
          </header>

          {/* Directory Content List */}
          {isListLoading ? (
            <StudentSkeleton />
          ) : isListError ? (
            <div className="error-card p-6 text-center border rounded-lg bg-surface">
              <p className="text-danger font-semibold mb-2">Unable to load student directory</p>
              <Button variant="secondary" size="sm" onClick={() => refetchList()}>
                Retry
              </Button>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-directory-card p-12 text-center border rounded-xl bg-surface">
              <div className="empty-icon text-4xl mb-3">♙</div>
              <h3 className="text-lg font-bold text-primary mb-1">No Students Found</h3>
              <p className="text-sm text-muted max-w-md mx-auto mb-4">
                {searchTerm
                  ? `No profiles match "${searchTerm}". Check the spelling or try searching by Student ID.`
                  : 'No student profiles registered under this branch yet.'}
              </p>
              {searchTerm && (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  Clear Search Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="student-cards-grid">
              {students.map((st) => (
                <div
                  key={st._id}
                  className="student-directory-card"
                  onClick={() => handleSelectStudent(st._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectStudent(st._id);
                    }
                  }}
                  aria-label={`View profile for ${st.studentName}`}
                >
                  <div className="card-top-row">
                    <span className="student-card-id">{st.studentId}</span>
                    <Badge variant={st.status === 'active' ? 'success' : 'default'} size="sm">
                      {st.status?.toUpperCase()}
                    </Badge>
                  </div>

                  <h3 className="student-card-name">{st.studentName}</h3>
                  <p className="student-card-email text-xs text-muted mb-3 truncate">{st.email}</p>

                  <div className="card-meta-chips">
                    <span className="meta-chip branch-chip">
                      📍 {st.branch?.toUpperCase()}
                    </span>
                    {st.preferences?.destinationCountries?.length > 0 && (
                      <span className="meta-chip dest-chip">
                        ✈ {st.preferences.destinationCountries[0]}
                      </span>
                    )}
                  </div>

                  <div className="card-bottom-row mt-4 pt-3 border-t border-subtle flex justify-between items-center text-xs text-muted">
                    <span>{st.assignedCounsellorName || 'Assigned Staff'}</span>
                    <span className="view-link text-gold font-semibold">View 360° Profile →</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="directory-pagination flex justify-between items-center mt-6 pt-4 border-t border-subtle">
              <span className="text-xs text-muted">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
              </span>
              <div className="pagination-buttons flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
