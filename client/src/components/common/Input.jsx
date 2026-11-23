import React, { useRef, useState } from 'react';
import { useAnimatedCaret } from '../../hooks/useAnimatedCaret';

export const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  placeholder = '',
  error = '',
  helperText = '',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  caretColor,
  ...props
}) => {
  const inputId = id || name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helperId = helperText && !error && inputId ? `${inputId}-helper` : undefined;
  const describedBy = errorId || helperId || undefined;

  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const inputValue = isControlled ? String(value) : internalValue;

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const measureRef = useRef(null);

  const { caretX, caretOpacity, isTyping, updateCaret, hideCaret } = useAnimatedCaret({
    inputRef,
    containerRef,
    measureRef,
    value: inputValue,
  });

  const handleChange = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
    requestAnimationFrame(() => {
      updateCaret(e.target);
    });
  };

  const handleFocus = (e) => {
    onFocus?.(e);
    requestAnimationFrame(() => {
      updateCaret(e.target);
    });
  };

  const handleBlur = (e) => {
    hideCaret();
    onBlur?.(e);
  };

  const handleKeyUp = (e) => {
    props.onKeyUp?.(e);
    requestAnimationFrame(() => {
      updateCaret(e.target);
    });
  };

  const handleClick = (e) => {
    props.onClick?.(e);
    requestAnimationFrame(() => {
      updateCaret(e.target);
    });
  };

  return (
    <div className={`field-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div ref={containerRef} className="input-wrapper">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type={type}
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-required={required ? 'true' : undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`input-field ${error ? 'input-error' : ''} ${inputClassName}`.trim()}
          {...props}
        />
        <span
          ref={measureRef}
          aria-hidden="true"
          className="input-measure-span"
        />
        {!disabled && (
          <span
            className={`animated-caret ${isTyping ? 'typing' : 'blinking'}`}
            style={{
              transform: `translateX(${caretX}px) translateY(-50%)`,
              opacity: caretOpacity,
              ...(caretColor ? { backgroundColor: caretColor } : {}),
            }}
            aria-hidden="true"
          />
        )}
      </div>
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
