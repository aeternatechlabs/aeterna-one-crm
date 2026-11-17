import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner Accessibility & ARIA Announcements', () => {
  it('exposes role="status" and aria-live="polite" for screen readers', () => {
    render(<LoadingSpinner text="Loading admissions pipeline..." />);
    const statusContainer = screen.getByRole('status');
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Loading admissions pipeline...')).toBeInTheDocument();
  });

  it('marks internal spinner graphic with aria-hidden="true"', () => {
    const { container } = render(<LoadingSpinner />);
    const spinnerGraphic = container.querySelector('.spinner');
    expect(spinnerGraphic).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses default accessible loading message when text prop is not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading application...')).toBeInTheDocument();
  });
});
