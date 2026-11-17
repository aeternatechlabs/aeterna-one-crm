import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Badge } from '../Badge';

describe('Badge Accessibility & Visual Semantics', () => {
  it('renders badge text content clearly', () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('badge-success');
    expect(badge.className).toContain('badge-md');
  });

  it('does not create an unexpected keyboard focus trap', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Before</button>
        <Badge variant="warning">Notice</Badge>
        <button type="button">After</button>
      </div>
    );

    const beforeBtn = screen.getByRole('button', { name: /before/i });
    const afterBtn = screen.getByRole('button', { name: /after/i });

    beforeBtn.focus();
    expect(beforeBtn).toHaveFocus();

    // Tab should naturally skip non-interactive Badge and land on After button
    await user.tab();
    expect(afterBtn).toHaveFocus();
  });

  it('supports custom size and custom className without breaking styling', () => {
    render(
      <Badge variant="danger" size="sm" className="custom-indicator">
        Critical
      </Badge>
    );
    const badge = screen.getByText('Critical');
    expect(badge.className).toContain('badge-danger');
    expect(badge.className).toContain('badge-sm');
    expect(badge.className).toContain('custom-indicator');
  });
});
