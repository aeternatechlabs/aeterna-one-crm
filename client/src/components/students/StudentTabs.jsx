import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { DocumentVault } from './DocumentVault';
import { ROLES } from '../../config/constants';

export const StudentTabs = ({ student, userRole, onAddNote }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!student) return null;

  const tabs = [
    { id: 'overview', label: 'Overview & Identity', icon: '👤' },
    { id: 'academics', label: 'Academic History', icon: '🎓' },
    { id: 'testScores', label: 'Test Scores', icon: '📝' },
    { id: 'preferences', label: 'Preferences', icon: '🌍' },
    { id: 'shortlist', label: `Shortlist (${student.shortlist?.length || 0})`, icon: '🏛' },
    { id: 'applications', label: `Applications (${student.applications?.length || 0})`, icon: '📄' },
    { id: 'documents', label: 'Document Vault', icon: '📁' },
    { id: 'financial', label: 'Financial & Budget', icon: '💰' },
    { id: 'notes', label: `Timeline & Notes (${student.notes?.length || 0})`, icon: '💬' },
  ];

  const isCounsellor = userRole === ROLES.COUNSELLOR;

  return (
    <div className="student-profile-tabs-wrapper">
      {/* Tab Navigation Header */}
      <nav className="student-tabs-nav" role="tablist" aria-label="Student profile sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`student-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      <div className="student-tab-panels">
        {/* 1. Overview & Identity Panel */}
        {activeTab === 'overview' && (
          <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="tab-panel">
            <div className="panel-grid">
              <div className="panel-card">
                <h3 className="panel-card-title">Identity & Contact Details</h3>
                <dl className="details-list">
                  <div className="detail-item">
                    <dt>Full Legal Name</dt>
                    <dd>{student.studentName}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Email Address</dt>
                    <dd>{student.email}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Phone (Direct)</dt>
                    <dd>{student.phone || 'Not Provided'}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Date of Birth</dt>
                    <dd>{student.identity?.dob ? new Date(student.identity.dob).toLocaleDateString() : 'Not Provided'}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Passport Number</dt>
                    <dd>
                      {student.identity?.passport?.passportNumber ? (
                        <span className="font-mono">
                          {student.identity.passport.passportNumber}
                          {isCounsellor && <span className="masked-indicator"> (Masked PII)</span>}
                        </span>
                      ) : (
                        'Not On File'
                      )}
                    </dd>
                  </div>
                  <div className="detail-item">
                    <dt>Residential Address</dt>
                    <dd>
                      {student.identity?.address?.city
                        ? `${student.identity.address.city}, ${student.identity.address.country || 'India'}`
                        : 'Not Provided'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="panel-card">
                <h3 className="panel-card-title">Conversion & Attribution Metadata</h3>
                <dl className="details-list">
                  <div className="detail-item">
                    <dt>Attribution Source</dt>
                    <dd>{student.conversionSource?.originalSource || 'Admissions Pipeline'}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Converted Date</dt>
                    <dd>
                      {student.conversionSource?.convertedAt
                        ? new Date(student.conversionSource.convertedAt).toLocaleString()
                        : 'Direct Registration'}
                    </dd>
                  </div>
                  <div className="detail-item">
                    <dt>Converted By</dt>
                    <dd>{student.conversionSource?.convertedByName || 'Admissions Staff'}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Initial Pipeline Stage</dt>
                    <dd>{student.conversionSource?.initialStageAtConversion || 'New Enquiry'}</dd>
                  </div>
                  {student.conversionSource?.conversionNotes && (
                    <div className="detail-item full-width">
                      <dt>Conversion Notes</dt>
                      <dd className="conversion-notes-text">{student.conversionSource.conversionNotes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* 2. Academic History Panel */}
        {activeTab === 'academics' && (
          <div role="tabpanel" id="panel-academics" aria-labelledby="tab-academics" className="tab-panel">
            <div className="panel-card">
              <h3 className="panel-card-title">Academic Qualifications</h3>
              {student.academics?.records?.length > 0 ? (
                <div className="records-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Institution</th>
                        <th>Board / University</th>
                        <th>Passing Year</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.academics.records.map((rec, i) => (
                        <tr key={i}>
                          <td className="font-semibold capitalize">{rec.level}</td>
                          <td>{rec.institution || '—'}</td>
                          <td>{rec.boardOrUniversity || '—'}</td>
                          <td>{rec.yearOfPassing || '—'}</td>
                          <td><Badge variant="primary">{rec.score || '—'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-section-placeholder">
                  <p>No formal academic degree records added yet.</p>
                  <span className="placeholder-subtext">Summary CGPA: {student.academics?.undergradCgpa || 'Not recorded'} • Backlogs: {student.academics?.activeBacklogs || 0}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Standardized Test Scores Panel */}
        {activeTab === 'testScores' && (
          <div role="tabpanel" id="panel-testScores" aria-labelledby="tab-testScores" className="tab-panel">
            <div className="panel-card">
              <h3 className="panel-card-title">Standardized Test Scorecards</h3>
              {student.testScores?.records?.length > 0 ? (
                <div className="test-cards-grid">
                  {student.testScores.records.map((test, i) => (
                    <div key={i} className="test-score-card">
                      <div className="test-card-header">
                        <span className="test-name">{test.testType?.toUpperCase()}</span>
                        <Badge variant={test.isVerified ? 'success' : 'default'}>
                          {test.isVerified ? '✓ Verified' : 'Self-Reported'}
                        </Badge>
                      </div>
                      <div className="test-overall-score">
                        <span className="score-num">{test.overallScore || '—'}</span>
                        <span className="score-label">Overall Score</span>
                      </div>
                      {test.trfNumber && (
                        <div className="test-trf">TRF / Report: <code>{test.trfNumber}</code></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section-placeholder">
                  <p>No standardized test records registered.</p>
                  <span className="placeholder-subtext">Supports IELTS, TOEFL, PTE, Duolingo, GRE, and GMAT.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Preferences Panel */}
        {activeTab === 'preferences' && (
          <div role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences" className="tab-panel">
            <div className="panel-card">
              <h3 className="panel-card-title">Study Abroad Preferences</h3>
              <dl className="details-list">
                <div className="detail-item">
                  <dt>Target Countries</dt>
                  <dd>
                    {student.preferences?.destinationCountries?.map((c, i) => (
                      <Badge key={i} variant="primary" className="mr-1">{c}</Badge>
                    )) || 'Not specified'}
                  </dd>
                </div>
                <div className="detail-item">
                  <dt>Degree Level</dt>
                  <dd className="capitalize">{student.preferences?.targetDegreeLevel || 'Masters'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Target Intakes</dt>
                  <dd>{student.preferences?.targetIntakes?.join(', ') || 'Upcoming'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Fields of Study</dt>
                  <dd>{student.preferences?.targetFieldsOfStudy?.join(', ') || 'Undecided'}</dd>
                </div>
                <div className="detail-item full-width">
                  <dt>Prior Visa Refusal History</dt>
                  <dd>
                    {student.preferences?.visaRefusalHistory?.hasRefusal ? (
                      <span className="text-danger font-semibold">
                        ⚠ Declared Visa Refusal: {student.preferences.visaRefusalHistory.details || 'Details in file'}
                      </span>
                    ) : (
                      <span className="text-success font-semibold">✓ Zero Prior Visa Refusals Declared</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* 5. Shortlist Panel */}
        {activeTab === 'shortlist' && (
          <div role="tabpanel" id="panel-shortlist" aria-labelledby="tab-shortlist" className="tab-panel">
            <div className="panel-card">
              <h3 className="panel-card-title">University Shortlist</h3>
              {student.shortlist?.length > 0 ? (
                <div className="shortlist-grid">
                  {student.shortlist.map((item, i) => (
                    <div key={i} className="shortlist-card">
                      <div className="shortlist-header">
                        <span className="shortlist-uni">{item.universityName}</span>
                        <Badge variant={item.category === 'dream' ? 'warning' : item.category === 'safe' ? 'success' : 'primary'}>
                          {item.category?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="shortlist-prog">{item.programme} ({item.country})</p>
                      <div className="shortlist-meta">
                        <span>Status: <strong className="capitalize">{item.status}</strong></span>
                        {item.tuitionFeeEstimated && (
                          <span>Est. Tuition: <strong>INR {Number(item.tuitionFeeEstimated).toLocaleString('en-IN')}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section-placeholder">
                  <p>No universities currently shortlisted.</p>
                  <span className="placeholder-subtext">Add dream, target, and safe universities to guide student applications.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Active Applications Panel */}
        {activeTab === 'applications' && (
          <div role="tabpanel" id="panel-applications" aria-labelledby="tab-applications" className="tab-panel">
            <div className="panel-card">
              <h3 className="panel-card-title">University Applications</h3>
              {student.applications?.length > 0 ? (
                <div className="applications-list">
                  {student.applications.map((app, i) => (
                    <div key={i} className="app-card">
                      <div className="app-header">
                        <h4>{app.universityName}</h4>
                        <Badge variant={app.status === 'enrolled' ? 'success' : app.status === 'rejected' ? 'danger' : 'primary'}>
                          {app.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="app-programme">{app.programme} — {app.country}</p>
                      {app.portalApplicationId && (
                        <div className="app-id">Portal ID: <code>{app.portalApplicationId}</code></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section-placeholder">
                  <p>No active university applications filed yet.</p>
                  <span className="placeholder-subtext">Track portal submission IDs, offer letters, CAS/I-20, and visa filings here.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. Financial & Budget Panel */}
        {activeTab === 'financial' && (
          <div role="tabpanel" id="panel-financial" aria-labelledby="tab-financial" className="tab-panel">
            <div className="panel-card">
              <h3 className="panel-card-title">Financial Capability & Budget Overview</h3>
              <dl className="details-list">
                <div className="detail-item">
                  <dt>Annual Budget</dt>
                  <dd>
                    {student.financial?.annualBudget > 0
                      ? `${student.financial.budgetCurrency || 'INR'} ${Number(student.financial.annualBudget).toLocaleString('en-IN')}`
                      : 'Pending Assessment'}
                  </dd>
                </div>
                <div className="detail-item">
                  <dt>Primary Funding Source</dt>
                  <dd className="capitalize">{student.financial?.fundingSource?.replace('_', ' ') || 'Undecided'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Education Loan Status</dt>
                  <dd className="capitalize">{student.financial?.loanStatus?.replace('_', ' ') || 'Not Required'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Loan Sanction Amount</dt>
                  <dd>
                    {student.financial?.loanSanctionAmount > 0
                      ? `INR ${Number(student.financial.loanSanctionAmount).toLocaleString('en-IN')}`
                      : 'N/A'}
                  </dd>
                </div>
                <div className="detail-item full-width">
                  <dt>Financial Sponsor</dt>
                  <dd>
                    {student.financial?.sponsorDetails?.name
                      ? `${student.financial.sponsorDetails.name} (${student.financial.sponsorDetails.relationship || 'Sponsor'})`
                      : 'Self / Family Sponsored'}
                    {student.financial?.sponsorDetails?.annualIncome && (
                      <span className="sponsor-income"> • Declared Annual: INR {Number(student.financial.sponsorDetails.annualIncome).toLocaleString('en-IN')}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* 8. Notes & Activity Timeline Panel */}
        {activeTab === 'notes' && (
          <div role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" className="tab-panel">
            <div className="panel-card">
              <div className="panel-card-header-row">
                <h3 className="panel-card-title">Counsellor & Branch Notes</h3>
                {onAddNote && (
                  <Button variant="primary" size="sm" onClick={onAddNote}>
                    + Add New Note
                  </Button>
                )}
              </div>

              {student.notes?.length > 0 ? (
                <div className="notes-timeline">
                  {student.notes.map((note, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-badge-marker" />
                      <div className="timeline-body">
                        <div className="timeline-meta">
                          <span className="author-name">{note.authorName || 'Staff'}</span>
                          <Badge variant="outline" size="sm" className="note-category-badge">
                            {note.category?.toUpperCase() || 'GENERAL'}
                          </Badge>
                          <span className="note-time">
                            {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Recent'}
                          </span>
                        </div>
                        <p className="note-content">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section-placeholder">
                  <p>No notes logged yet for this student.</p>
                  <span className="placeholder-subtext">Click "Add New Note" to record counselling advice or updates.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 9. Document Vault Panel (Day 41) */}
        {activeTab === 'documents' && (
          <div role="tabpanel" id="panel-documents" aria-labelledby="tab-documents" className="tab-panel">
            <DocumentVault student={student} userRole={userRole} />
          </div>
        )}
      </div>
    </div>
  );
};
