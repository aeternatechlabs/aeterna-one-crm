import React from 'react';

export const Card = ({
  title,
  subtitle,
  tag,
  actions,
  children,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div className={`card ${className}`.trim()}>
      {(title || subtitle || tag || actions) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          <div className="card-header-right">
            {tag && <span className="card-tag">{tag}</span>}
            {actions}
          </div>
        </div>
      )}
      <div className={`card-body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
};
