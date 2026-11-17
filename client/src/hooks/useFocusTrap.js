import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * useFocusTrap Hook
 * Traps keyboard focus within containerRef while isOpen is true,
 * and restores focus to the previously active element upon close.
 */
export function useFocusTrap({ isOpen, containerRef, initialFocusRef }) {
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture the trigger element that had focus before the modal opened
    if (document.activeElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    const container = containerRef?.current;
    if (container) {
      // 2. Initial focus: land on initialFocusRef if provided, else first focusable element
      const setInitialFocus = () => {
        if (initialFocusRef?.current && typeof initialFocusRef.current.focus === 'function') {
          initialFocusRef.current.focus();
        } else {
          const focusables = Array.from(
            container.querySelectorAll(FOCUSABLE_SELECTORS)
          ).filter((el) => el.getAttribute('aria-hidden') !== 'true');

          if (focusables.length > 0) {
            focusables[0].focus();
          } else if (typeof container.focus === 'function') {
            container.focus();
          }
        }
      };

      // Execute on next frame to ensure child elements are mounted
      const frameId = requestAnimationFrame(setInitialFocus);
      return () => cancelAnimationFrame(frameId);
    }
  }, [isOpen, containerRef, initialFocusRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const container = containerRef?.current;
      if (!container) return;

      const focusables = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTORS)
      ).filter((el) => el.getAttribute('aria-hidden') !== 'true');

      if (focusables.length === 0) {
        e.preventDefault();
        container.focus?.();
        return;
      }

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element or outside container, wrap to last
        if (document.activeElement === firstEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: if on last element or outside container, wrap to first
        if (document.activeElement === lastEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger element on close / unmount
      const prevEl = previousActiveElementRef.current;
      if (prevEl && typeof prevEl.focus === 'function') {
        prevEl.focus();
      }
    };
  }, [isOpen, containerRef]);
}
