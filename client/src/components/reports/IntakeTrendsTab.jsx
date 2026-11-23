import React from 'react';
import { Calendar, Globe2 } from 'lucide-react';

export const IntakeTrendsTab = ({ intakeTrends, loading }) => {
  if (loading && !intakeTrends) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading intake forecasting trends...
      </div>
    );
  }

  const trends = intakeTrends?.trends || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="funnel-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} strokeWidth={2.5} style={{ color: 'var(--color-maroon-800)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--color-maroon-900)' }}>
              Intake Season & Study Destination Forecasting
            </h3>
          </div>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table" aria-label="Intake Season Forecast Table">
            <thead>
              <tr>
                <th>Destination Country</th>
                <th>Target Intake Term</th>
                <th style={{ textAlign: 'right' }}>Active Inquiries</th>
                <th style={{ textAlign: 'right' }}>Projected Enrolments (18%)</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {trends.length > 0 ? (
                trends.map((t, idx) => (
                  <tr key={`${t.destination}-${t.intake}-${idx}`}>
                    <td style={{ fontWeight: 800, color: 'var(--color-maroon-900)' }}>
                      {t.destination}
                    </td>
                    <td style={{ fontWeight: 700 }}>{t.intake}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.enquiries}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-gold-700)' }}>
                      ~{t.forecastEnrolled} students
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#e8f5e9',
                          color: '#2e7d32',
                          border: '1px solid #c8e6c9',
                        }}
                      >
                        Active Campaign
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    No intake forecast trends available
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
