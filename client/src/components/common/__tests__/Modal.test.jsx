import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal Accessibility, Focus Trap & Keyboard Behavior', () => {
  it('renders role="dialog", aria-modal="true", and wires aria-labelledby to modal title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Add New Candidate">
        <p>Candidate form fields</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-dialog-title');

    const titleHeading = screen.getByRole('heading', { level: 3, name: /add new candidate/i });
    expect(titleHeading).toHaveAttribute('id', 'modal-dialog-title');
  });

  it('closes dialog when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <button type="button">Action</button>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('lands initial focus inside dialog and traps focus with Tab and Shift+Tab', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Focus Trap Modal">
        <input data-testid="modal-input" placeholder="Name" />
        <button type="button" data-testid="modal-save">Save</button>
      </Modal>
    );

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    const input = screen.getByTestId('modal-input');
    const saveBtn = screen.getByTestId('modal-save');

    // Initial focus lands inside the dialog (close button is first focusable element)
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Tab moves to input
    await user.tab();
    expect(document.activeElement).toBe(input);

    // Tab moves to saveBtn (last element)
    await user.tab();
    expect(document.activeElement).toBe(saveBtn);

    // Tab from last element wraps back to first element (closeBtn)
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first element wraps to last element (saveBtn)
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(saveBtn);
  });

  it('restores focus to trigger element when dialog closes', async () => {
    const user = userEvent.setup();

    const TestHarness = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button
            type="button"
            data-testid="open-trigger"
            onClick={() => setIsOpen(true)}
          >
            Open Modal
          </button>
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Focus Restore Test"
          >
            <button
              type="button"
              data-testid="modal-close-action"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </Modal>
        </div>
      );
    };

    render(<TestHarness />);
    const trigger = screen.getByTestId('open-trigger');

    trigger.focus();
    expect(trigger).toHaveFocus();

    // Open modal via click
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Close modal via Escape
    await user.keyboard('{Escape}');

    // Dialog unmounts and focus returns to the original trigger button
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden Modal">
        Content
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
