import React from 'react';
import {
  Users,
  GraduationCap,
  FileText,
  Plane,
  TrendingUp,
  Clock,
  Compass,
  Layers,
} from 'lucide-react';

export const OverviewTab = ({ overview, loading }) => {
  if (loading && !overview) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading executive metrics...
      </div>
    );
  }

  const metrics = overview?.metrics || {
    totalLeads: 0,
    activeStudents: 0,
    totalApplications: 0,
    visasApproved: 0,
    enrolledCount: 0,
    overallConversionRate: 0,
    avgTurnaroundDays: 24,
  };

  const destinations = overview?.leadsByDestination || [];
  const sources = overview?.leadsBySource || [];
  const trend = overview?.trendSeries || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 4 Primary KPI Metric Cards */}
      <div className="reports-kpi-grid">
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Total Leads</span>
            <div className="reports-kpi-icon" aria-hidden="true">
              <Users size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="reports-kpi-val">{metrics.totalLeads.toLocaleString()}</div>
          <div className="reports-kpi-subtext">Ingested in reporting period</div>
        </div>

        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Active Students</span>
            <div className="reports-kpi-icon" aria-hidden="true">
              <GraduationCap size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="reports-kpi-val">{metrics.activeStudents.toLocaleString()}</div>
          <div className="reports-kpi-subtext">Registered in Student 360°</div>
        </div>

        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">University Applications</span>
            <div className="reports-kpi-icon" aria-hidden="true">
              <FileText size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="reports-kpi-val">{metrics.totalApplications.toLocaleString()}</div>
          <div className="reports-kpi-subtext">Submitted across partner portals</div>
        </div>

        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Visas & Enrolled</span>
            <div className="reports-kpi-icon" aria-hidden="true">
              <Plane size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="reports-kpi-val">{metrics.visasApproved.toLocaleString()}</div>
          <div className="reports-kpi-subtext">
            {metrics.overallConversionRate}% overall conversion
          </div>
        </div>
      </div>

      {/* Two Column Layout: Study Destinations & Lead Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
        {/* Left Column: Destinations */}
        <div className="funnel-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} strokeWidth={2} style={{ color: 'var(--color-maroon-800)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-maroon-900)' }}>
              Top Study Destinations
            </h3>
          </div>
          <div className="reports-table-wrap">
            <table className="reports-table" aria-label="Top Study Destinations Breakdown">
              <thead>
                <tr>
                  <th>Country</th>
                  <th style={{ textAlign: 'right' }}>Enquiries</th>
                  <th style={{ textAlign: 'right' }}>Share %</th>
                </tr>
              </thead>
              <tbody>
                {destinations.length > 0 ? (
                  destinations.map((d) => (
                    <tr key={d.country}>
                      <td style={{ fontWeight: 700 }}>{d.country}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>{d.count}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-gold-700)', fontWeight: 700 }}>
                        {d.percentage}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                      No destination data in selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Acquisition Sources */}
        <div className="funnel-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} strokeWidth={2} style={{ color: 'var(--color-maroon-800)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-maroon-900)' }}>
              Lead Acquisition Channels
            </h3>
          </div>
          <div className="reports-table-wrap">
            <table className="reports-table" aria-label="Lead Acquisition Channels Breakdown">
              <thead>
                <tr>
                  <th>Channel Source</th>
                  <th style={{ textAlign: 'right' }}>Leads</th>
                  <th style={{ textAlign: 'right' }}>Share %</th>
                </tr>
              </thead>
              <tbody>
                {sources.length > 0 ? (
                  sources.map((s) => (
                    <tr key={s.source}>
                      <td style={{ fontWeight: 700 }}>{s.source}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>{s.count}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-gold-700)', fontWeight: 700 }}>
                        {s.percentage}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                      No acquisition source data in selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
