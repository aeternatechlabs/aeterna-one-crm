import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import aeternaLogo from '../assets/brand/logo.webp';
import landmarkSvg from '../assets/heritage/landmark.svg';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryEmail = searchParams.get('email') || '';
  const queryToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(queryEmail);
  const [resetToken, setResetToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet all required complexity standards.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        resetToken: resetToken.trim(),
        newPassword,
        confirmPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. The authorization code may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#faf7f2] relative overflow-hidden font-sans">
      {/* Background Decor */}
      <img
        src={landmarkSvg}
        alt=""
        aria-hidden="true"
        className="absolute -right-16 -bottom-16 w-96 h-96 opacity-10 pointer-events-none"
      />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#ebd9c8] p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <img src={aeternaLogo} alt="Aeterna" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-xl font-extrabold text-[#5a0c1e] tracking-tight">Create New Password</h1>
          <p className="text-xs text-[#8c7e73] mt-1">Set a new secure password for your workspace account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Password Reset Completed</h2>
            <p className="text-xs text-gray-600">Your account credentials have been updated securely.</p>
            <p className="text-xs font-semibold text-[#9a6a24] animate-pulse">Redirecting to login in 3 seconds...</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5a0c1e] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#4a0817] transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Login Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5a0c1e] mb-1">
                Account Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@aeterna.com"
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5a0c1e] mb-1">
                Security Token / Code
              </label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                placeholder="Paste your reset token or code"
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5a0c1e] mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#ebd9c8] text-[11px] text-gray-600 grid grid-cols-2 gap-1.5">
              <span className={hasMinLength ? 'text-emerald-700 font-bold' : ''}>• 8+ Chars</span>
              <span className={hasUpper ? 'text-emerald-700 font-bold' : ''}>• 1 Uppercase</span>
              <span className={hasLower ? 'text-emerald-700 font-bold' : ''}>• 1 Lowercase</span>
              <span className={hasNumber ? 'text-emerald-700 font-bold' : ''}>• 1 Number</span>
              <span className={hasSpecial ? 'text-emerald-700 font-bold' : ''}>• 1 Special Char</span>
              <span className={isMatch ? 'text-emerald-700 font-bold' : ''}>• Passwords Match</span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Link to="/login" className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !isMatch}
                className="px-5 py-2.5 bg-[#5a0c1e] hover:bg-[#4a0817] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {loading ? 'Updating...' : 'Set Password'}
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
