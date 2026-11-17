import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = 'blue',
  className = '',
}) => {
  const isNumeric = typeof value === 'number';
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (!isNumeric) return;

    const start = 0;
    const end = value;
    const duration = 750;
    const startTime = Date.now();
    let rafId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [value, isNumeric]);

  const displayValue = isNumeric ? animatedValue.toLocaleString() : value;

  return (
    <div className={`stat-card stat-${color} ${className}`.trim()}>
      <div className="stat-card-top">
        <span className="stat-title">{title}</span>
        {icon && <span className="stat-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="stat-value">{displayValue}</div>
      {trendValue && (
        <div className="stat-trend">
          <span
            className={`trend-indicator trend-${
              trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'neutral'
            }`}
          >
            {trend === 'up' && <TrendingUp size={11} strokeWidth={2.5} className="inline mr-1" aria-hidden="true" />}
            {trend === 'down' && <TrendingDown size={11} strokeWidth={2.5} className="inline mr-1" aria-hidden="true" />}
            {trend !== 'up' && trend !== 'down' && <Minus size={11} strokeWidth={2.5} className="inline mr-1" aria-hidden="true" />}
            <span>{trendValue}</span>
          </span>
        </div>
      )}
    </div>
  );
};
