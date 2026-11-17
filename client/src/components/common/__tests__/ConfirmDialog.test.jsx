import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog Accessibility, Focus Trap & Keyboard Behavior', () => {
  it('renders role="alertdialog", aria-modal="true", and wires aria-labelledby to dialog title', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Candidate"
        message="Are you sure you want to permanently remove this student?"
        danger={true}
      />
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');

    const titleHeading = screen.getByRole('heading', { level: 3, name: /delete candidate/i });
    expect(titleHeading).toHaveAttribute('id', 'confirm-dialog-title');
    expect(screen.getByText(/permanently remove this student/i)).toBeInTheDocument();
  });

  it('sets initial focus specifically on Cancel button via cancelBtnRef', async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Please confirm your selection"
        cancelText="Abort"
        confirmText="Proceed"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /abort/i });

    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });
  });

  it('closes / cancels when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Escape Test"
        message="Test message"
      />
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus inside alertdialog with Tab and Shift+Tab cycling', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Trap Test"
        message="Test trap"
        cancelText="Cancel Action"
        confirmText="Confirm Action"
      />
    );

    const closeIconBtn = screen.getByRole('button', { name: /close dialog/i });
    const cancelBtn = screen.getByRole('button', { name: /cancel action/i });
    const confirmBtn = screen.getByRole('button', { name: /confirm action/i });

    // Initial focus on Cancel button
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });

    // Tab from Cancel moves to Confirm (last element)
    await user.tab();
    expect(document.activeElement).toBe(confirmBtn);

    // Tab from Confirm wraps back to Close icon button (first element)
    await user.tab();
    expect(document.activeElement).toBe(closeIconBtn);

    // Shift+Tab from Close icon button wraps back to Confirm button
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirmBtn);
  });

  it('restores focus to trigger button upon dismissal', async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button
            type="button"
            data-testid="confirm-trigger"
            onClick={() => setIsOpen(true)}
          >
            Trigger Dialog
          </button>
          <ConfirmDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onConfirm={() => setIsOpen(false)}
            title="Restore Test"
            message="Restore message"
          />
        </div>
      );
    };

    render(<Harness />);
    const trigger = screen.getByTestId('confirm-trigger');

    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Press Escape to cancel
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('executes onConfirm when Confirm button is activated via keyboard', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        confirmText="Execute"
        cancelText="Cancel"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const confirmBtn = screen.getByRole('button', { name: /execute/i });

    // Initial focus on Cancel button
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });

    // Keyboard user tabs to Confirm button
    await user.tab();
    expect(document.activeElement).toBe(confirmBtn);

    // Activate Confirm via Enter
    await user.keyboard('{Enter}');
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
