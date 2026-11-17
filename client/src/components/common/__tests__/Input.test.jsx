import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Input } from '../Input';

describe('Input Accessibility & Keyboard Behavior', () => {
  it('correctly associates label with input via htmlFor and id', () => {
    render(<Input label="Staff Email" id="staff-email" name="email" />);
    const input = screen.getByLabelText(/staff email/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'staff-email');
  });

  it('wires aria-describedby for error message and reflects aria-invalid="true"', () => {
    render(
      <Input
        label="Password"
        id="password-field"
        name="password"
        error="Password must be at least 8 characters"
      />
    );
    const input = screen.getByLabelText(/password/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'password-field-error');

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveAttribute('id', 'password-field-error');
    expect(errorMsg).toHaveTextContent(/password must be at least 8 characters/i);
  });

  it('wires aria-describedby for helper text when error is absent', () => {
    render(
      <Input
        label="Username"
        id="username-field"
        helperText="Enter your official organizational username"
      />
    );
    const input = screen.getByLabelText(/username/i);
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'username-field-helper');

    const helper = screen.getByText(/enter your official organizational username/i);
    expect(helper).toHaveAttribute('id', 'username-field-helper');
  });

  it('reflects required state in ARIA and displays required asterisk', () => {
    render(<Input label="Full Name" id="full-name" required />);
    const input = screen.getByLabelText(/full name/i);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('reflects disabled state on input element', () => {
    render(<Input label="Branch" id="branch" disabled />);
    const input = screen.getByLabelText(/branch/i);
    expect(input).toBeDisabled();
  });

  it('accepts keyboard input and updates value via onChange', async () => {
    const user = userEvent.setup();
    const Wrapper = () => {
      const [val, setVal] = useState('');
      return (
        <Input
          label="Search"
          id="search-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      );
    };
    render(<Wrapper />);
    const input = screen.getByLabelText(/search/i);

    await user.type(input, 'Aeterna One');
    expect(input).toHaveValue('Aeterna One');
  });
});
