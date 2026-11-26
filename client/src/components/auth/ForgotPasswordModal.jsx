import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  X,
  KeyRound,
} from 'lucide-react';
import { authService } from '../../services/auth.service';

export const ForgotPasswordModal = ({ isOpen, onClose, onPasswordResetSuccess }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setOtpValues(['', '', '', '', '', '']);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
      setResendCooldown(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Password Policy Checkers
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  // STEP 1: Request 6-digit OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(cleanEmail);
      setSuccessMsg(res.message || 'Verification code dispatched to your email.');
      setStep(2);
      setResendCooldown(60); // 60s cooldown for resend
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Core 6-digit OTP verification executor
  const executeVerifyOtp = async (codeToVerify) => {
    const fullOtp = (codeToVerify || otpValues.join('')).trim();

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }
    if (loading) return;

    setError('');
    setLoading(true);
    try {
      const res = await authService.verifyResetOTP(email.trim().toLowerCase(), fullOtp);
      const token = res.resetToken || res.data?.resetToken;
      setResetToken(token);
      setSuccessMsg('Code verified! Please create your new secure password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify 6-digit OTP (Form submit or manual button click)
  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    executeVerifyOtp();
  };

  // OTP Box inputs handler with auto-advance and automatic 6-digit verification
  const handleOtpChange = (index, value) => {
    setError('');
    // Allow paste of multiple digits via change event
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newOtp = [...otpValues];
        for (let i = 0; i < 6; i++) {
          newOtp[i] = pasted[i] || '';
        }
        setOtpValues(newOtp);
        const nextIndex = Math.min(pasted.length, 5);
        otpInputsRef.current[nextIndex]?.focus();

        if (pasted.length === 6) {
          executeVerifyOtp(pasted);
        }
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    // Auto-advance to next box if digit entered
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Automatically verify code when all 6 digits are filled
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6 && !newOtp.includes('')) {
      executeVerifyOtp(fullOtp);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtpValues(newOtp);
    const nextIdx = Math.min(pastedData.length, 5);
    otpInputsRef.current[nextIdx]?.focus();

    if (pastedData.length === 6) {
      executeVerifyOtp(pastedData);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSuccessMsg('A fresh verification code has been dispatched.');
      setResendCooldown(60);
      setOtpValues(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please wait a moment.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Complete Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password must meet all complexity requirements listed below.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword({
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword,
        confirmPassword,
      });

      setStep(4);
      setSuccessMsg(res.message || 'Password reset successfully!');
      setTimeout(() => {
        onPasswordResetSuccess?.(email.trim().toLowerCase());
        onClose();
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e5dacf] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#5a0c1e] to-[#3e0714] px-6 py-5 border-b border-[#9a6a24]/30 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#9a6a24]/40 flex items-center justify-center text-[#e5dacf]">
              <KeyRound className="w-5 h-5 text-[#f4efe6]" />
            </div>
            <div>
              <h2 id="forgot-password-title" className="text-lg font-bold text-white tracking-wide">
                Account Recovery
              </h2>
              <p className="text-xs text-[#e5dacf] font-medium">3-Step Password Reset & Security Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-[#faf7f2] px-6 py-3 border-b border-[#ebd9c8] flex items-center justify-between">
          {[
            { num: 1, label: 'Email' },
            { num: 2, label: '6-Digit OTP' },
            { num: 3, label: 'New Password' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  step === s.num
                    ? 'bg-[#5a0c1e] text-white ring-2 ring-[#9a6a24]'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#ebd9c8] text-[#8c7e73]'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span
                className={`text-xs font-semibold ${
                  step === s.num ? 'text-[#5a0c1e]' : step > s.num ? 'text-emerald-700' : 'text-[#8c7e73]'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error / Feedback Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {/* STEP 1: Request 6-digit OTP */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5a0c1e] mb-1.5">
                  Official Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. counsellor.bengaluru@aeterna.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e] focus:border-transparent transition-all"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter your Aeterna CRM account email. We will dispatch a 6-digit verification code with a 15-minute validity window.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#5a0c1e] hover:bg-[#4a0817] disabled:opacity-50 text-white text-xs font-bold tracking-wide rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {loading ? 'Dispatching...' : 'Send Verification Code'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify 6-Digit OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center">
                <p className="text-xs text-gray-600">
                  We sent a 6-digit security code to{' '}
                  <span className="font-bold text-[#5a0c1e]">{email}</span>.
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Please enter the code to verify your identity.</p>
              </div>

              {/* 6 Discrete Digit Boxes */}
              <div className="flex justify-center gap-2.5 sm:gap-3">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onPaste={handleOtpPaste}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#faf7f2] border-2 border-[#d9c7b8] rounded-xl text-[#5a0c1e] focus:outline-none focus:border-[#5a0c1e] focus:ring-2 focus:ring-[#9a6a24]/30 transition-all"
                  />
                ))}
              </div>

              {/* Resend & Timer */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500">
                  {resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    'Didn’t receive the code?'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[#9a6a24] font-bold hover:text-[#5a0c1e] disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Resend Code
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  &larr; Change Email
                </button>
                <button
                  type="submit"
                  disabled={loading || otpValues.join('').length !== 6}
                  className="px-5 py-2.5 bg-[#5a0c1e] hover:bg-[#4a0817] disabled:opacity-50 text-white text-xs font-bold tracking-wide rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5a0c1e] mb-1">
                  New Secure Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5a0c1e] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Policy Live Requirements */}
              <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#ebd9c8] space-y-1.5 text-[11px]">
                <div className="font-semibold text-gray-700 mb-1">Password Requirements:</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-600">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : ''}`}>
                    {hasMinLength ? '✓' : '•'} 8+ Characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : ''}`}>
                    {hasUpper ? '✓' : '•'} 1 Uppercase (A-Z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : ''}`}>
                    {hasLower ? '✓' : '•'} 1 Lowercase (a-z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : ''}`}>
                    {hasNumber ? '✓' : '•'} 1 Number (0-9)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-semibold' : ''}`}>
                    {hasSpecial ? '✓' : '•'} 1 Special Char
                  </div>
                  <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-700 font-semibold' : ''}`}>
                    {isMatch ? '✓' : '•'} Passwords Match
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isPasswordValid || !isMatch}
                  className="px-5 py-2.5 bg-[#5a0c1e] hover:bg-[#4a0817] disabled:opacity-50 text-white text-xs font-bold tracking-wide rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {loading ? 'Updating Password...' : 'Reset Password'}
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && (
            <div className="py-6 text-center space-y-4 animate-scaleUp">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Password Reset Completed</h3>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">
                {successMsg || 'Your new password is now active. All prior sessions have been securely invalidated.'}
              </p>
              <p className="text-[11px] text-[#9a6a24] font-semibold animate-pulse">
                Redirecting to login with updated credentials...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
