import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { StatCard } from '../StatCard';

describe('StatCard Accessibility & Text Presentation', () => {
  it('renders title and string value clearly readable as text', () => {
    render(<StatCard title="Active Pipeline" value="48 Applications" color="blue" />);
    expect(screen.getByText('Active Pipeline')).toBeInTheDocument();
    expect(screen.getByText('48 Applications')).toBeInTheDocument();
  });

  it('renders decorative trend icon and stat icon with aria-hidden="true"', () => {
    const { container } = render(
      <StatCard
        title="Visa Conversion"
        value="94%"
        icon={<span data-testid="custom-icon">🎓</span>}
        trend="up"
        trendValue="+12% from last month"
      />
    );

    const iconSpan = screen.getByTestId('custom-icon').parentElement;
    expect(iconSpan).toHaveAttribute('aria-hidden', 'true');

    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toHaveAttribute('aria-hidden', 'true');

    expect(screen.getByText('+12% from last month')).toBeInTheDocument();
  });

  it('does not create an unexpected keyboard trap', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Focus Start</button>
        <StatCard title="Total Enquiries" value="1,240" />
        <button type="button">Focus End</button>
      </div>
    );

    const start = screen.getByRole('button', { name: /focus start/i });
    const end = screen.getByRole('button', { name: /focus end/i });

    start.focus();
    await user.tab();
    expect(end).toHaveFocus();
  });
});
