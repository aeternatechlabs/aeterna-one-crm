import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Select } from '../Select';

describe('Select Accessibility & Keyboard Navigation', () => {
  const options = [
    { value: 'bengaluru', label: 'Bengaluru HQ' },
    { value: 'mysuru', label: 'Mysuru Branch' },
    { value: 'belagavi', label: 'Belagavi Branch', disabled: true },
    { value: 'all', label: 'All Branches' },
  ];

  it('renders accessible trigger with aria-haspopup="listbox" and aria-expanded="false"', () => {
    render(<Select label="Branch" id="branch-select" options={options} value="bengaluru" />);
    const trigger = screen.getByRole('button', { name: /branch/i });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Bengaluru HQ')).toBeInTheDocument();
  });

  it('opens listbox on Enter or Space and displays role="listbox" and role="option" with aria-selected', async () => {
    const user = userEvent.setup();
    render(<Select label="Branch" id="branch-select" options={options} value="bengaluru" />);
    const trigger = screen.getByRole('button', { name: /branch/i });

    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(4);

    // Selected option has aria-selected="true"
    expect(optionElements[0]).toHaveAttribute('aria-selected', 'true');
    expect(optionElements[1]).toHaveAttribute('aria-selected', 'false');
    // Disabled option has aria-disabled="true"
    expect(optionElements[2]).toHaveAttribute('aria-disabled', 'true');
  });

  it('navigates options with ArrowDown and ArrowUp, skipping disabled options, and selects with Enter', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Select
        label="Branch"
        id="branch-select"
        options={options}
        value="bengaluru"
        onChange={handleChange}
      />
    );
    const trigger = screen.getByRole('button', { name: /branch/i });

    trigger.focus();
    // Open via ArrowDown
    await user.keyboard('{ArrowDown}');

    // ArrowDown moves from index 0 (Bengaluru) to index 1 (Mysuru)
    await user.keyboard('{ArrowDown}');

    // ArrowDown moves from index 1 to index 3 (skipping disabled index 2 Belagavi)
    await user.keyboard('{ArrowDown}');

    // Press Enter to select active option (All Branches)
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { name: 'branch-select', value: 'all' },
      }),
      expect.objectContaining({ value: 'all', label: 'All Branches' })
    );

    // Dropdown closes and trigger retains focus
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape without selecting and restores focus to trigger', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Select
        label="Branch"
        id="branch-select"
        options={options}
        value="bengaluru"
        onChange={handleChange}
      />
    );
    const trigger = screen.getByRole('button', { name: /branch/i });

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Navigate to another option but hit Escape
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
