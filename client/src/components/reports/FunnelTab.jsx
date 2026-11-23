import React from 'react';
import { GitBranch, ArrowDownRight } from 'lucide-react';

export const FunnelTab = ({ funnel, loading }) => {
  if (loading && !funnel) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading 16-stage conversion funnel...
      </div>
    );
  }

  const steps = funnel?.funnelSteps || [];
  const totalCohort = funnel?.totalCohortLeads || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="funnel-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={20} strokeWidth={2.5} style={{ color: 'var(--color-maroon-800)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--color-maroon-900)' }}>
              16-Stage Admissions Conversion Waterfall
            </h3>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            Cohort Base: <strong style={{ color: 'var(--color-maroon-850)' }}>{totalCohort} Leads</strong>
          </span>
        </div>

        {/* 16-Stage Visual Waterfall */}
        <div className="funnel-list">
          {steps.map((s) => (
            <div key={s.stageKey} className="funnel-stage-row">
              <div className="funnel-stage-index">{s.stageIndex}</div>
              <div className="funnel-stage-title">{s.stageLabel}</div>
              <div className="funnel-bar-track" aria-hidden="true">
                <div
                  className="funnel-bar-fill"
                  style={{ width: `${Math.max(4, s.conversionRate)}%` }}
                />
              </div>
              <div className="funnel-stage-count">{s.count}</div>
              <div className="funnel-stage-rate">{s.conversionRate}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Accessible Tabular Alternative */}
      <div className="funnel-container">
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-maroon-900)' }}>
          Funnel Stage Progression & Drop-off Rates
        </h4>
        <div className="reports-table-wrap">
          <table className="reports-table" aria-label="16-Stage Admissions Funnel Progression Table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Stage #</th>
                <th>Stage Name</th>
                <th style={{ textAlign: 'right' }}>Active Count</th>
                <th style={{ textAlign: 'right' }}>Progression %</th>
                <th style={{ textAlign: 'right' }}>Stage Drop-off %</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.stageKey}>
                  <td style={{ fontWeight: 800 }}>{s.stageIndex}</td>
                  <td style={{ fontWeight: 700 }}>{s.stageLabel}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{s.count}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-maroon-800)', fontWeight: 700 }}>
                    {s.conversionRate}%
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {s.dropoffRate}%
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
