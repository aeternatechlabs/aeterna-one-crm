import React from 'react';

/**
 * Brand Heritage Lotus Motif
 * Sourced from Karnataka Royal Heritage theme design and auth branding.
 */
export function Lotus({ className = '', style, ...props }) {
  return (
    <svg
      viewBox="0 0 110 86"
      className={className}
      style={style}
      aria-hidden="true"
      fill="none"
      {...props}
    >
      <g stroke="#E7B94A" strokeWidth="2.2" fill="#FFF3CF" fillOpacity="0.55">
        <path d="M55 6 C66 24 66 46 55 68 C44 46 44 24 55 6 Z" />
        <path d="M22 22 C38 30 46 48 46 70 C28 58 20 42 22 22 Z" />
        <path d="M88 22 C72 30 64 48 64 70 C82 58 90 42 88 22 Z" />
        <path d="M6 48 C22 50 34 62 38 78 C20 74 8 64 6 48 Z" />
        <path d="M104 48 C88 50 76 62 72 78 C90 74 102 64 104 48 Z" />
      </g>
    </svg>
  );
}

export default Lotus;
