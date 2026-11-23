import React from 'react';
import { Building2, CheckCircle2, TrendingUp, Users } from 'lucide-react';

export const ScorecardsTab = ({ scorecards, loading }) => {
  if (loading && !scorecards) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading multi-branch scorecards...
      </div>
    );
  }

  const branches = scorecards?.branches || [];
  const consolidated = scorecards?.consolidated || {
    totalLeads: 0,
    totalApplications: 0,
    totalVisas: 0,
    totalEnrolled: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 3-Branch Scorecard Cards */}
      <div className="scorecards-grid">
        {branches.map((b) => {
          const m = b.metrics;
          return (
            <div key={b.branchId} className="scorecard-card">
              <div className="scorecard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} strokeWidth={2.5} style={{ color: 'var(--color-maroon-800)' }} />
                  <span className="scorecard-branch-name">{b.branchName}</span>
                </div>
                <span className="scorecard-target-pill">
                  {m.targetAchieved}% Target
                </span>
              </div>

              {/* Progress Bar for Target Realization */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  <span>Lead Target Realization</span>
                  <span>{m.totalLeads} / {m.targetLeads}</span>
                </div>
                <div className="scorecard-progress-bar-wrap">
                  <div
                    className="scorecard-progress-bar-fill"
                    style={{ width: `${Math.min(100, m.targetAchieved)}%` }}
                  />
                </div>
              </div>

              {/* Key Branch Data Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="scorecard-row">
                  <span className="scorecard-row-label">Active Students</span>
                  <span className="scorecard-row-value">{m.activeStudents}</span>
                </div>
                <div className="scorecard-row">
                  <span className="scorecard-row-label">Applications Filed</span>
                  <span className="scorecard-row-value">{m.applications}</span>
                </div>
                <div className="scorecard-row">
                  <span className="scorecard-row-label">Enrolled Students</span>
                  <span className="scorecard-row-value" style={{ color: 'var(--color-maroon-800)' }}>
                    {m.enrolled}
                  </span>
                </div>
                <div className="scorecard-row">
                  <span className="scorecard-row-label">Enrolment Conversion</span>
                  <span className="scorecard-row-value" style={{ color: 'var(--color-gold-700)' }}>
                    {m.conversionRate}%
                  </span>
                </div>
                <div className="scorecard-row">
                  <span className="scorecard-row-label">SLA Compliance Rate</span>
                  <span className="scorecard-row-value" style={{ color: '#2e7d32' }}>
                    {m.slaComplianceRate}%
                  </span>
                </div>
                <div className="scorecard-row">
                  <span className="scorecard-row-label">Counsellors</span>
                  <span className="scorecard-row-value">{m.counsellorCount} staff</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessible Comprehensive Comparative Table */}
      <div className="funnel-container">
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-maroon-900)' }}>
          Consolidated Branch Benchmark Table
        </h3>
        <div className="reports-table-wrap">
          <table className="reports-table" aria-label="Consolidated Branch Comparative Table">
            <thead>
              <tr>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>Leads</th>
                <th style={{ textAlign: 'right' }}>Target %</th>
                <th style={{ textAlign: 'right' }}>Applications</th>
                <th style={{ textAlign: 'right' }}>Visas Approved</th>
                <th style={{ textAlign: 'right' }}>Enrolled</th>
                <th style={{ textAlign: 'right' }}>Conversion %</th>
                <th style={{ textAlign: 'right' }}>SLA Compliance</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.branchId}>
                  <td style={{ fontWeight: 800, color: 'var(--color-maroon-900)' }}>{b.branchName}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.metrics.totalLeads}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                    {b.metrics.targetAchieved}%
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.metrics.applications}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.metrics.visasApproved}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-maroon-800)' }}>
                    {b.metrics.enrolled}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-gold-700)' }}>
                    {b.metrics.conversionRate}%
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                    {b.metrics.slaComplianceRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
