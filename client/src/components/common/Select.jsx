import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Global Custom Select & Dropdown Component (Aeterna One Luxury Theme)
 * Reference: D:\devil_code\Management-software\frontend Select.jsx
 *
 * Fully keyboard accessible, click-outside protected, and styled
 * with Aeterna One's Royal Maroon & Imperial Gold design tokens.
 */
export const Select = ({
  label,
  name,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  required = false,
  error = '',
  helperText = '',
  className = '',
  variant = 'default', // 'default' | 'compact' | 'pill'
  align = 'left', // 'left' | 'right'
  placement = 'auto', // 'auto' | 'bottom' | 'top'
  icon = null,
  id,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [actualPlacement, setActualPlacement] = useState(
    placement === 'top' ? 'top' : 'bottom'
  );

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  // Auto-detect optimal placement (top vs bottom) based on viewport clearance
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      if (placement === 'auto') {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setActualPlacement(spaceBelow < 230 ? 'top' : 'bottom');
      } else {
        setActualPlacement(placement);
      }
    }
  }, [isOpen, placement]);

  const inputId = id || name;

  // Normalize options array: supports strings, numbers, or objects { value, label, disabled, icon, badge }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : String(opt.value),
        disabled: Boolean(opt.disabled),
        icon: opt.icon || null,
        badge: opt.badge || null,
      };
    }
    return {
      value: opt,
      label: String(opt),
      disabled: false,
      icon: null,
      badge: null,
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const displayText = selectedOption
    ? selectedOption.label
    : placeholder || 'Select...';

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle option selection
  const handleSelect = useCallback(
    (opt) => {
      if (opt.disabled || disabled) return;

      if (onChange) {
        // Standard synthetic-event shape so it works with all form handlers
        const syntheticEvent = {
          target: {
            name: name || inputId,
            value: opt.value,
          },
        };
        onChange(syntheticEvent, opt);
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, name, inputId, disabled]
  );

  // Full keyboard navigation (ArrowUp, ArrowDown, Enter, Space, Escape, Tab)
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          const initialIndex = selectedOption
            ? normalizedOptions.findIndex((o) => o.value === selectedOption.value)
            : 0;
          setActiveIndex(Math.max(0, initialIndex));
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setActiveIndex((prev) => {
            let next = prev + 1;
            while (next < normalizedOptions.length && normalizedOptions[next].disabled) {
              next++;
            }
            return next < normalizedOptions.length ? next : prev;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setActiveIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && normalizedOptions[next].disabled) {
              next--;
            }
            return next >= 0 ? next : prev;
          });
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < normalizedOptions.length) {
            handleSelect(normalizedOptions[activeIndex]);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        }
        case 'Tab': {
          setIsOpen(false);
          break;
        }
        default:
          break;
      }
    },
    [isOpen, activeIndex, normalizedOptions, selectedOption, handleSelect, disabled]
  );

  // Auto-scroll active option into view when navigating via keyboard
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      if (typeof activeEl?.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  // Variant classes mapping
  const variantClass =
    variant === 'compact'
      ? 'select-compact'
      : variant === 'pill'
      ? 'select-pill'
      : 'select-default';

  return (
    <div
      ref={containerRef}
      className={`select-container ${variantClass} ${
        isOpen ? 'select-container-open' : ''
      } ${className}`.trim()}
    >
      {label && (
        <label htmlFor={inputId} className="field-label select-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div className="select-relative-wrapper">
        <button
          ref={triggerRef}
          id={inputId}
          type="button"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`select-trigger ${isOpen ? 'select-trigger-open' : ''} ${
            error ? 'select-trigger-error' : ''
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${inputId}-label` : undefined}
          aria-label={label || placeholder}
          {...props}
        >
          <div className="select-trigger-left">
            {icon && <span className="select-trigger-icon" aria-hidden="true">{icon}</span>}
            <span
              className={`select-trigger-text ${
                !selectedOption ? 'select-placeholder' : ''
              }`}
            >
              {displayText}
            </span>
          </div>

          <ChevronDown
            size={variant === 'compact' ? 14 : 16}
            strokeWidth={2}
            className={`select-chevron ${
              isOpen
                ? actualPlacement === 'top'
                  ? 'select-chevron-open-top'
                  : 'select-chevron-open'
                : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Hidden input for HTML form submissions */}
        <input type="hidden" name={name || inputId} value={value || ''} />

        {/* Floating Dropdown List */}
        {isOpen && (
          <ul
            ref={listRef}
            className={`select-dropdown-menu ${
              actualPlacement === 'top'
                ? 'select-dropdown-top'
                : 'select-dropdown-bottom'
            } ${
              align === 'right' ? 'select-dropdown-right' : 'select-dropdown-left'
            }`}
            role="listbox"
            aria-label={label || placeholder}
          >
            {normalizedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isActive = idx === activeIndex;

              return (
                <li
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                    disabled={opt.disabled}
                    className={`dropdown-item ${
                      isSelected ? 'dropdown-item-active' : ''
                    } ${isActive ? 'dropdown-item-hovered' : ''} ${
                      opt.disabled ? 'dropdown-item-disabled' : ''
                    }`}
                  >
                    <div className="dropdown-item-left">
                      {opt.icon && (
                        <span className="dropdown-item-icon" aria-hidden="true">
                          {opt.icon}
                        </span>
                      )}
                      <span className="dropdown-item-label">{opt.label}</span>
                      {opt.badge && (
                        <span className="dropdown-item-badge">{opt.badge}</span>
                      )}
                    </div>

                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="dropdown-item-check"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}

            {normalizedOptions.length === 0 && (
              <li className="dropdown-empty-state">No options available</li>
            )}
          </ul>
        )}
      </div>

      {error && <span className="field-error">{error}</span>}
      {helperText && !error && <span className="field-helper">{helperText}</span>}
    </div>
  );
};
