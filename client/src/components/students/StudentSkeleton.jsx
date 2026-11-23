import React from 'react';

export const StudentSkeleton = () => {
  return (
    <div className="student-skeleton-container" aria-label="Loading student profile" role="status">
      {/* Header Skeleton */}
      <div className="skeleton-card skeleton-header-card">
        <div className="skeleton-avatar shimmer" />
        <div className="skeleton-header-info">
          <div className="skeleton-line shimmer title-line" />
          <div className="skeleton-line shimmer subtitle-line" />
          <div className="skeleton-pills-row">
            <div className="skeleton-pill shimmer" />
            <div className="skeleton-pill shimmer" />
            <div className="skeleton-pill shimmer" />
          </div>
        </div>
      </div>

      {/* Key Facts Skeleton */}
      <div className="skeleton-facts-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton-fact-card shimmer">
            <div className="skeleton-line shimmer mini-line" />
            <div className="skeleton-line shimmer bold-line" />
          </div>
        ))}
      </div>

      {/* Tabs & Content Skeleton */}
      <div className="skeleton-card skeleton-tabs-card">
        <div className="skeleton-tabs-bar">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-tab-item shimmer" />
          ))}
        </div>
        <div className="skeleton-tab-content">
          <div className="skeleton-line shimmer full-line" />
          <div className="skeleton-line shimmer full-line" />
          <div className="skeleton-line shimmer half-line" />
        </div>
      </div>
    </div>
  );
};
