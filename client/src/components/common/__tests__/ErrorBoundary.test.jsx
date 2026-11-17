import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowingComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test Component Crashing Error');
  }
  return <div>Component Rendered Successfully</div>;
};

describe('ErrorBoundary Accessibility & Fallback Interface', () => {
  let originalError;

  beforeEach(() => {
    originalError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Component Rendered Successfully')).toBeInTheDocument();
  });

  it('catches render error, renders accessible fallback, and provides keyboard-reachable reload button', async () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { level: 2, name: /application error/i })).toBeInTheDocument();
    expect(screen.getByText(/an unexpected error interrupted the application interface/i)).toBeInTheDocument();

    const reloadBtn = screen.getByRole('button', { name: /reload workspace/i });
    expect(reloadBtn).toBeInTheDocument();

    // Verify keyboard focusability
    reloadBtn.focus();
    expect(reloadBtn).toHaveFocus();
  });
});
