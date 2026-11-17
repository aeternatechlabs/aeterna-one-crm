import React, { forwardRef } from 'react';

export const Button = forwardRef(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#e5a93c]';
  const variantClass = variant ? `btn-${variant}` : '';
  const sizeClass = size ? `btn-${size}` : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span className="btn-loading">
          <span className="spinner-sm" />
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';
