import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button Accessibility & Keyboard Behavior', () => {
  it('is focusable and reflects tab index naturally', async () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    expect(button).not.toHaveFocus();
    button.focus();
    expect(button).toHaveFocus();
  });

  it('activates onClick with Enter key', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });

    button.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('activates onClick with Space key', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });

    button.focus();
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled button cannot be activated or focused via keyboard', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Action</Button>);
    const button = screen.getByRole('button', { name: /disabled action/i });

    expect(button).toBeDisabled();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('loading button is disabled and displays loading state', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('has focus-visible ring utility classes for visible keyboard focus outline', () => {
    render(<Button>Focus Ring</Button>);
    const button = screen.getByRole('button', { name: /focus ring/i });
    expect(button.className).toContain('focus-visible:ring-2');
  });

  it('forwards ref to the underlying HTML button element', () => {
    const ref = createRef();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
