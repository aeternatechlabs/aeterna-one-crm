import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Card } from '../Card';

describe('Card Accessibility & Structure', () => {
  it('renders card title, subtitle, tag, actions, and body content', () => {
    render(
      <Card
        title="Candidate Profile"
        subtitle="Admissions Intake 2026"
        tag="Verified"
        actions={<button type="button">Edit</button>}
      >
        <p>Student application details</p>
      </Card>
    );

    expect(screen.getByRole('heading', { level: 3, name: /candidate profile/i })).toBeInTheDocument();
    expect(screen.getByText(/admissions intake 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByText(/student application details/i)).toBeInTheDocument();
  });

  it('does not create an unexpected keyboard trap for interactive children', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outer Before</button>
        <Card title="Nested Actions">
          <button type="button">Inside Action 1</button>
          <button type="button">Inside Action 2</button>
        </Card>
        <button type="button">Outer After</button>
      </div>
    );

    const outerBefore = screen.getByRole('button', { name: /outer before/i });
    const inside1 = screen.getByRole('button', { name: /inside action 1/i });
    const inside2 = screen.getByRole('button', { name: /inside action 2/i });
    const outerAfter = screen.getByRole('button', { name: /outer after/i });

    outerBefore.focus();
    await user.tab();
    expect(inside1).toHaveFocus();
    await user.tab();
    expect(inside2).toHaveFocus();
    await user.tab();
    expect(outerAfter).toHaveFocus();
  });
});
