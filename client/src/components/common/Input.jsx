import React from 'react';

export const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  helperText = '',
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const inputId = id || name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helperId = helperText && !error && inputId ? `${inputId}-helper` : undefined;
  const describedBy = errorId || helperId || undefined;

  return (
    <div className={`field-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={`input-field ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span id={helperId} className="field-helper">
          {helperText}
        </span>
      )}
    </div>
  );
};
