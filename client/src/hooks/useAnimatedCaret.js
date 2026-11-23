import { useEffect, useRef, useState, useCallback } from 'react';

const PASSWORD_CHAR =
  typeof navigator !== 'undefined' && navigator.userAgent.match(/firefox|fxios/i)
    ? '\u25CF'
    : '\u2022';

/**
 * useAnimatedCaret
 * Gliding animated typing cursor hook with spring-damped motion and measurement.
 * Replicates the precision caret engine from Management-software.
 */
export function useAnimatedCaret({ inputRef, containerRef, measureRef, value }) {
  const [caretX, setCaretX] = useState(0);
  const [caretOpacity, setCaretOpacity] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const idleTimerRef = useRef(null);

  const syncMeasureSpan = useCallback(() => {
    const input = inputRef.current;
    const measureSpan = measureRef.current;
    if (!input || !measureSpan) return;

    const styles = window.getComputedStyle(input);
    const isPassword = input.type === 'password';

    let fontSize = styles.fontSize;
    if (
      PASSWORD_CHAR === '\u2022' &&
      isPassword &&
      typeof navigator !== 'undefined' &&
      !navigator.userAgent.match(/chrome|chromium|crios/i)
    ) {
      fontSize = `${parseFloat(fontSize) + 6.25}px`;
    }

    measureSpan.style.fontSize = fontSize;
    measureSpan.style.fontFamily = styles.fontFamily;
    measureSpan.style.fontWeight = styles.fontWeight;
    measureSpan.style.fontStyle = styles.fontStyle;
    measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`;
    measureSpan.style.letterSpacing = styles.letterSpacing;
    measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
    measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
  }, [inputRef, measureRef]);

  const measurePrefixWidth = useCallback(
    (text) => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return null;

      syncMeasureSpan();
      measureSpan.textContent = text;

      const paddingLeft = parseFloat(window.getComputedStyle(input).paddingLeft) || 0;

      return text.length > 0 ? measureSpan.offsetWidth + paddingLeft : paddingLeft - 1;
    },
    [inputRef, measureRef, syncMeasureSpan]
  );

  const scrollCaretIntoView = useCallback((target, absoluteWidth) => {
    const styles = window.getComputedStyle(target);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
    const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
    const visibleLeft = target.scrollLeft + paddingLeft;

    if (absoluteWidth > visibleRight) {
      target.scrollLeft = Math.min(absoluteWidth - target.clientWidth + paddingRight, maxScroll);
      return;
    }

    if (absoluteWidth < visibleLeft) {
      target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
    }
  }, []);

  const getCaretIndex = useCallback((target) => {
    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;

    if (selectionStart === null || selectionEnd === null) {
      return target.value.length;
    }

    if (selectionStart === selectionEnd) {
      return selectionStart;
    }

    return target.selectionDirection === 'backward' ? selectionStart : selectionEnd;
  }, []);

  const updateCaretFromInput = useCallback(
    (target) => {
      if (!target) return;
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      const hasSelection =
        selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const isPassword = target.type === 'password';
      const textBeforeCaret = isPassword
        ? PASSWORD_CHAR.repeat(caretIndex)
        : target.value.slice(0, caretIndex);

      const absoluteWidth = measurePrefixWidth(textBeforeCaret);
      if (absoluteWidth === null) return;

      scrollCaretIntoView(target, absoluteWidth);

      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const caretPosition = absoluteWidth - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1;

      setCaretX(Math.min(caretPosition, maxX));

      if (!isCaretVisible || hasSelection) {
        setCaretOpacity(0);
        return;
      }

      setCaretOpacity(1);

      // Trigger active typing state (keeps solid while typing)
      setIsTyping(true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 450);
    },
    [getCaretIndex, measurePrefixWidth, scrollCaretIntoView]
  );

  const updateCaretRef = useRef(updateCaretFromInput);
  updateCaretRef.current = updateCaretFromInput;

  // React to value changes when focused
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) {
      updateCaretRef.current(input);
    }
  }, [value, inputRef]);

  // Window/document event listeners for selection, fonts, resize
  useEffect(() => {
    const input = inputRef.current;
    const container = containerRef.current;
    if (!input || !container) return;

    const updateCaretIfFocused = () => {
      if (document.activeElement === input) {
        updateCaretRef.current(input);
      }
    };

    const handleSelectionChange = () => {
      if (document.activeElement !== input) return;
      requestAnimationFrame(() => {
        if (document.activeElement === input) {
          updateCaretRef.current(input);
        }
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    input.addEventListener('scroll', updateCaretIfFocused);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);
    }

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.addEventListener('loadingdone', updateCaretIfFocused);
      void document.fonts.ready.then(updateCaretIfFocused);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      input.removeEventListener('scroll', updateCaretIfFocused);
      if (resizeObserver) resizeObserver.disconnect();
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.removeEventListener('loadingdone', updateCaretIfFocused);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [inputRef, containerRef]);

  return {
    caretX,
    caretOpacity,
    isTyping,
    updateCaret: updateCaretFromInput,
    hideCaret: () => setCaretOpacity(0),
  };
}
