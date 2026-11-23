import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordModal } from '../ForgotPasswordModal';
import { authService } from '../../../services/auth.service';

vi.mock('../../../services/auth.service', () => ({
  authService: {
    forgotPassword: vi.fn(),
    verifyResetOTP: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('ForgotPasswordModal Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ForgotPasswordModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Step 1 (email prompt) when opened and handles OTP dispatch', async () => {
    authService.forgotPassword.mockResolvedValueOnce({
      success: true,
      message: 'OTP sent to your email',
      expiresInMinutes: 15,
    });

    render(<ForgotPasswordModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Account Recovery')).toBeInTheDocument();
    const emailInput = screen.getByPlaceholderText(/counsellor\.bengaluru@aeterna\.com/i);
    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'counsellor@aeterna.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send Verification Code/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.forgotPassword).toHaveBeenCalledWith('counsellor@aeterna.com');
    });

    // Should advance to Step 2
    await waitFor(() => {
      expect(screen.getByText(/We sent a 6-digit security code to/i)).toBeInTheDocument();
    });
  });

  it('displays error message when email is invalid or API fails', async () => {
    authService.forgotPassword.mockRejectedValueOnce({
      response: { data: { message: 'No registered personnel account found with this email' } },
    });

    render(<ForgotPasswordModal isOpen={true} onClose={() => {}} />);

    const emailInput = screen.getByPlaceholderText(/counsellor\.bengaluru@aeterna\.com/i);
    fireEvent.change(emailInput, { target: { value: 'notfound@aeterna.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send Verification Code/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/No registered personnel account found/i)).toBeInTheDocument();
    });
  });

  it('advances through Step 2 (OTP) to Step 3 (New Password)', async () => {
    authService.forgotPassword.mockResolvedValueOnce({
      success: true,
      message: 'OTP sent',
      devOtp: '123456',
    });

    authService.verifyResetOTP.mockResolvedValueOnce({
      success: true,
      resetToken: 'mock-crypto-token-12345678',
    });

    render(<ForgotPasswordModal isOpen={true} onClose={() => {}} />);

    // Step 1: Submit email
    fireEvent.change(screen.getByPlaceholderText(/counsellor\.bengaluru@aeterna\.com/i), {
      target: { value: 'admin@aeterna.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    // Step 2: Wait for step 2 to appear
    await waitFor(() => {
      expect(screen.getByText(/We sent a 6-digit security code to/i)).toBeInTheDocument();
    });

    const digitInputs = screen.getAllByRole('textbox');
    expect(digitInputs.length).toBe(6);

    digitInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    const verifyBtn = screen.getByRole('button', { name: /Verify Code/i });
    expect(verifyBtn).not.toBeDisabled();
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(authService.verifyResetOTP).toHaveBeenCalledWith('admin@aeterna.com', '123456');
    });

    // Should advance to Step 3
    await waitFor(() => {
      expect(screen.getByText('Password Requirements:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
    });
  });
});
