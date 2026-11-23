import React from 'react';
import { Award, Zap, CheckCircle2 } from 'lucide-react';

export const CounsellorsTab = ({ performance, loading }) => {
  if (loading && !performance) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading counsellor productivity metrics...
      </div>
    );
  }

  const counsellors = performance?.counsellors || [];
  const period = performance?.period || { workingDays: 26 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="funnel-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} strokeWidth={2.5} style={{ color: 'var(--color-maroon-800)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--color-maroon-900)' }}>
              Counsellor Productivity & Reach-Out Velocity Leaderboard
            </h3>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            Working Days in Period: <strong style={{ color: 'var(--color-maroon-850)' }}>{period.workingDays} Days</strong> (Excl. Sundays)
          </span>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table" aria-label="Counsellor Productivity Leaderboard">
            <thead>
              <tr>
                <th>Counsellor</th>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>Tasks Done</th>
                <th style={{ textAlign: 'right' }}>Total Reach-outs</th>
                <th style={{ textAlign: 'right' }}>Daily Velocity</th>
                <th style={{ textAlign: 'right' }}>Target (25/day)</th>
                <th style={{ textAlign: 'right' }}>SLA Compliance</th>
                <th style={{ textAlign: 'right' }}>Active Caseload</th>
              </tr>
            </thead>
            <tbody>
              {counsellors.length > 0 ? (
                counsellors.map((c) => (
                  <tr key={c.counsellorId}>
                    <td style={{ fontWeight: 800, color: 'var(--color-maroon-900)' }}>
                      {c.counsellorName}
                    </td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{c.branch}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.tasksCompleted}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.reachoutsCompleted}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-maroon-850)' }}>
                      {c.dailyVelocity} / day
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: c.velocityEfficiency >= 80 ? '#e8f5e9' : '#fff3e0',
                          color: c.velocityEfficiency >= 80 ? '#2e7d32' : '#e65100',
                          border: `1px solid ${c.velocityEfficiency >= 80 ? '#c8e6c9' : '#ffe0b2'}`,
                        }}
                      >
                        {c.velocityEfficiency}% Target
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                      {c.slaComplianceRate}%
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {c.activeCaseload} candidates
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    No outreach activities logged in this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
