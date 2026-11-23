import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Crown, Building2, GraduationCap, Building, ClipboardCheck, MapPin,
  Lock, ArrowRight, Mail, Eye, EyeOff, AlertCircle, Zap, Users,
  BarChart3, GitFork,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAnimatedCaret } from '../hooks/useAnimatedCaret';
import { DEMO_CREDENTIALS } from '../config/constants';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import aeternaLogo from '../assets/brand/logo.webp';
import landmarkSvg from '../assets/heritage/landmark.svg';
import bottomLeftPattern from '../assets/heritage/bottom-left-pattern.svg';
import topRightPattern from '../assets/heritage/top-right-pattern.svg';
import bengaluruHeritage from '../assets/heritage/bengaluru-heritage.jpg';
import '../styles/auth.css';

const CURRENT_YEAR = new Date().getFullYear();
const DEMO_ICON_MAP = { Crown, Building2, GraduationCap, Building, ClipboardCheck };

export function Lotus({ className = '' }) {
  return (
    <svg viewBox="0 0 110 86" className={className} aria-hidden="true" fill="none">
      <g stroke="#E7B94A" strokeWidth="2.2" fill="#FFF3CF" fillOpacity="0.55">
        <path d="M55 6 C66 24 66 46 55 68 C44 46 44 24 55 6 Z" />
        <path d="M22 22 C38 30 46 48 46 70 C28 58 20 42 22 22 Z" />
        <path d="M88 22 C72 30 64 48 64 70 C82 58 90 42 88 22 Z" />
        <path d="M6 48 C22 50 34 62 38 78 C20 74 8 64 6 48 Z" />
        <path d="M104 48 C88 50 76 62 72 78 C90 74 102 64 104 48 Z" />
      </g>
    </svg>
  );
}

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDev = import.meta.env.DEV;
  const redirectPath = location.state?.from?.pathname || '/dashboard';

  const emailInputRef = useRef(null);
  const emailContainerRef = useRef(null);
  const emailMeasureRef = useRef(null);
  const emailCaret = useAnimatedCaret({
    inputRef: emailInputRef,
    containerRef: emailContainerRef,
    measureRef: emailMeasureRef,
    value: email,
  });

  const passwordInputRef = useRef(null);
  const passwordContainerRef = useRef(null);
  const passwordMeasureRef = useRef(null);
  const passwordCaret = useAnimatedCaret({
    inputRef: passwordInputRef,
    containerRef: passwordContainerRef,
    measureRef: passwordMeasureRef,
    value: password,
  });

  React.useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please provide both staff email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify your staff credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError('');
    setSubmitting(true);
    try {
      await login({ email: demo.email, password: demo.password });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aeterna-login h-screen max-h-screen min-h-screen w-full overflow-hidden overscroll-none isolate relative text-[#35101a] bg-[#fbf5eb] font-sans grid grid-cols-1 md:grid-cols-[minmax(440px,1.05fr)_minmax(440px,0.95fr)]">
      {/* Left Heritage Showcase Panel */}
      <aside className="login-hero hidden md:flex flex-col justify-between relative h-screen max-h-screen overflow-hidden text-[#fffaf0] px-2 lg:px-2 py-2 lg:py-2 select-none bg-[radial-gradient(ellipse_at_74%_14%,rgba(153,31,57,0.42),transparent_36%),radial-gradient(ellipse_at_18%_82%,rgba(135,17,44,0.42),transparent_42%),linear-gradient(142deg,#500719_0%,#390511_54%,#27030c_100%)]" aria-label="Aeterna One CRM introduction">
        {/* Bengaluru Vidhana Soudha Heritage Visual Backdrop */}
        <div className="hero-bengaluru-backdrop absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <img
            src={bengaluruHeritage}
            alt="Bengaluru Vidhana Soudha Heritage Illustration"
            className="w-full h-full object-cover object-center opacity-65 mix-blend-screen scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#27030c] via-transparent to-[#500719]/70 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#27030c]/70 via-transparent to-[#27030c]/70 pointer-events-none" />
        </div>

        {/* Ambient Glows */}
        <div className="hero-glow hero-glow--top absolute z-0 w-[520px] h-[520px] -top-[260px] right-[16%] rounded-full pointer-events-none filter blur-[2px] bg-[radial-gradient(circle,rgba(230,170,50,0.14),transparent_68%)] animate-ambient" />
        <div className="hero-glow hero-glow--bottom absolute z-0 w-[440px] h-[440px] -bottom-[260px] left-[35%] rounded-full pointer-events-none filter blur-[2px] bg-[radial-gradient(circle,rgba(141,23,50,0.1),transparent_70%)] animate-ambient-reverse" />

        {/* Traditional Cloud-Wave Patterns */}
        <img className="hero-pattern hero-pattern--top absolute z-[1] pointer-events-none w-[min(300px,40%)] opacity-100 top-0 right-0 [filter:sepia(1)_saturate(3)_hue-rotate(315deg)] animate-cloud" src={topRightPattern} alt="" />
        <img className="hero-pattern hero-pattern--bottom absolute z-[1] pointer-events-none w-[min(300px,40%)] opacity-100 bottom-0 left-0 [filter:sepia(1)_saturate(3)_hue-rotate(315deg)] animate-cloud-reverse" src={bottomLeftPattern} alt="" />

        {/* Top-Left Gold Corner Swoosh */}
        <div className="hero-gold-swoosh absolute z-[2] pointer-events-none -top-[85px] -left-[95px] w-[230px] h-[230px] border-t-8 border-transparent border-l-8 border-[#ffc94f] rounded-bl-full -rotate-1 [filter:drop-shadow(0_0_8px_rgba(255,198,65,0.38))]" aria-hidden="true" />

        {/* Top Brand Mark */}
        <div className="hero-brand relative z-[3] flex items-center gap-3">
          <div className="brand-emblem w-12 h-12 flex-none grid place-items-center rounded-2xl border border-[#f6c55b]/50 bg-gradient-to-br from-white/12 to-white/[0.025] shadow-[inset_0_1px_rgba(255,255,255,0.14),0_8px_20px_rgba(0,0,0,0.15)]">
            <img src={aeternaLogo} alt="Aeterna emblem" className="w-[34px] h-[34px] object-contain" />
          </div>
          <div>
            <div className="brand-name text-[#fff9eb] text-lg font-extrabold tracking-[0.12em] leading-tight">AETERNA ONE</div>
            <div className="brand-tagline text-[#f4c76c] text-[8.5px] font-extrabold tracking-[0.2em] uppercase">STUDY ABROAD CRM</div>
          </div>
        </div>

        {/* Hero Narrative Content */}
        <div className="hero-content relative z-[3] my-auto max-w-[600px] pt-2 lg:pt-4">
          <div className="hero-eyebrow flex items-center gap-2 mb-1.5 text-[#f2c56c] text-[9.5px] font-extrabold tracking-[0.18em]">
            <span className="w-6 h-[1px] bg-[#e6aa32] inline-block" /> YOUR GLOBAL EDUCATION WORKSPACE
          </div>
          <h1 className="mb-2 text-[#fffaf0] font-sans text-2xl lg:text-[34px] xl:text-[38px] font-extrabold tracking-tight leading-[1.15]">
            One platform.<br />
            <span className="text-[#ffc94f] not-italic [text-shadow:0_4px_20px_rgba(255,190,56,0.2)]">Every possibility.</span>
          </h1>
          <p className="hero-description max-w-[440px] mb-3 lg:mb-4 text-[#fff8eb]/80 text-xs lg:text-[13.5px] leading-relaxed">
            Complete student and application management for global education. Bring every conversation, application and branch together.
          </p>
          <div className="feature-grid grid grid-cols-2 gap-2 lg:gap-2.5 max-w-[540px]">
            <div className="feature-item flex items-center gap-2.5 min-h-[46px] lg:min-h-[50px] px-3 py-1.5 rounded-xl border border-[#ffe9bc]/15 bg-gradient-to-r from-white/[0.075] to-white/[0.025] shadow-[inset_0_1px_rgba(255,255,255,0.06)] backdrop-blur-md text-[#fff8e9] text-[11px] lg:text-[11.5px] font-semibold leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffcb59]/50 hover:bg-white/10">
              <span className="feature-icon w-8 h-8 flex-none grid place-items-center rounded-lg text-[#7c1029] bg-gradient-to-br from-[#fff9e9] to-[#f4d99e] shadow-[0_4px_12px_rgba(0,0,0,0.16),inset_0_1px_rgba(255,255,255,0.9)]">
                <Users size={16} />
              </span>
              <span>Lead &amp; Enquiry<br />Management</span>
            </div>
            <div className="feature-item flex items-center gap-2.5 min-h-[46px] lg:min-h-[50px] px-3 py-1.5 rounded-xl border border-[#ffe9bc]/15 bg-gradient-to-r from-white/[0.075] to-white/[0.025] shadow-[inset_0_1px_rgba(255,255,255,0.06)] backdrop-blur-md text-[#fff8e9] text-[11px] lg:text-[11.5px] font-semibold leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffcb59]/50 hover:bg-white/10">
              <span className="feature-icon w-8 h-8 flex-none grid place-items-center rounded-lg text-[#7c1029] bg-gradient-to-br from-[#fff9e9] to-[#f4d99e] shadow-[0_4px_12px_rgba(0,0,0,0.16),inset_0_1px_rgba(255,255,255,0.9)]">
                <GraduationCap size={16} />
              </span>
              <span>Application &amp; Visa<br />Tracking</span>
            </div>
            <div className="feature-item flex items-center gap-2.5 min-h-[46px] lg:min-h-[50px] px-3 py-1.5 rounded-xl border border-[#ffe9bc]/15 bg-gradient-to-r from-white/[0.075] to-white/[0.025] shadow-[inset_0_1px_rgba(255,255,255,0.06)] backdrop-blur-md text-[#fff8e9] text-[11px] lg:text-[11.5px] font-semibold leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffcb59]/50 hover:bg-white/10">
              <span className="feature-icon w-8 h-8 flex-none grid place-items-center rounded-lg text-[#7c1029] bg-gradient-to-br from-[#fff9e9] to-[#f4d99e] shadow-[0_4px_12px_rgba(0,0,0,0.16),inset_0_1px_rgba(255,255,255,0.9)]">
                <BarChart3 size={16} />
              </span>
              <span>Counselling &amp;<br />Shortlisting</span>
            </div>
            <div className="feature-item flex items-center gap-2.5 min-h-[46px] lg:min-h-[50px] px-3 py-1.5 rounded-xl border border-[#ffe9bc]/15 bg-gradient-to-r from-white/[0.075] to-white/[0.025] shadow-[inset_0_1px_rgba(255,255,255,0.06)] backdrop-blur-md text-[#fff8e9] text-[11px] lg:text-[11.5px] font-semibold leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffcb59]/50 hover:bg-white/10">
              <span className="feature-icon w-8 h-8 flex-none grid place-items-center rounded-lg text-[#7c1029] bg-gradient-to-br from-[#fff9e9] to-[#f4d99e] shadow-[0_4px_12px_rgba(0,0,0,0.16),inset_0_1px_rgba(255,255,255,0.9)]">
                <GitFork size={16} />
              </span>
              <span>Multi-Branch<br />Operations</span>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="hero-footer relative z-[3] mt-auto flex flex-col items-center gap-2 pt-2">
          <img className="w-full max-w-[380px] max-h-[64px] lg:max-h-[74px] object-contain object-bottom [filter:sepia(0.25)_saturate(1.5)_drop-shadow(0_6px_12px_rgba(0,0,0,0.25))] animate-landmark" src={landmarkSvg} alt="Bengaluru Vidhana Soudha heritage illustration" />
          <div className="branch-list flex items-center justify-center gap-3 lg:gap-4 px-4 py-1 rounded-full border border-[#f4c35e]/40 bg-[#23030c]/30 shadow-[inset_0_1px_rgba(255,255,255,0.06)] text-[10.5px] font-bold text-[#fff7e9] whitespace-nowrap">
            {['Bengaluru', 'Mysuru', 'Belagavi'].map((branch) => (
              <span key={branch} className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-[#ffc94f]" />
                {branch}
              </span>
            ))}
          </div>
          <div className="hero-bottom-note relative z-[3] text-center text-[#f4c35e]/55 text-[8px] font-extrabold tracking-[0.16em] mt-1">
            BUILT FOR CONNECTIONS THAT MOVE YOU FORWARD
          </div>
        </div>
      </aside>

      {/* Right Authentication Workstation Panel */}
      <main className="login-workspace h-screen max-h-screen relative flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 py-4 lg:py-6 overflow-hidden overscroll-none bg-[radial-gradient(ellipse_at_50%_45%,#fffdf8_0%,#fbf5eb_60%,#f4e9dc_100%)]">
        <div className="workspace-topline absolute top-3.5 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[#a68b78] text-[8.5px] font-extrabold tracking-[0.2em] whitespace-nowrap">

        </div>
        <Lotus className="lotus lotus--bottom-left absolute z-10 -bottom-0 sm:-bottom-0 -left-0 sm:-left-0 w-20 sm:w-24 aspect-[110/86] -rotate-[-46deg] pointer-events-none drop-shadow-[0_2px_8px_rgba(231,185,74,0.25)]" />
        <Lotus className="lotus lotus--bottom-right absolute z-10 -bottom-0 sm:-bottom-0 -right-0 sm:-right-0 w-20 sm:w-24 aspect-[110/86] -scale-x-100 -rotate-[46deg] pointer-events-none drop-shadow-[0_2px_8px_rgba(231,185,74,0.25)]" />
        <div className="login-card-wrap relative w-full max-w-[440px] my-auto z-[2]">
          {/* Mobile Only Brand Header */}
          <div className="mobile-brand flex md:hidden flex-col items-center mb-3 text-center">
            <div className="brand-emblem w-11 h-11 mb-1 grid place-items-center rounded-xl border border-[#d9a441]/40 bg-white shadow-sm">
              <img src={aeternaLogo} alt="Aeterna emblem" className="w-7 h-7 object-contain" />
            </div>
            <div className="brand-name text-[#5b0b1d] text-base font-extrabold tracking-wider">AETERNA ONE</div>
            <div className="brand-tagline text-[#a36a1c] text-[8px] font-extrabold tracking-widest uppercase">STUDY ABROAD CRM</div>
          </div>
          {/* Elevated Luxury Auth Card */}
          <section className="login-card relative overflow-visible rounded-3xl border border-[#be8b41]/50 bg-gradient-to-br from-white/[0.98] to-[#fff9ef]/[0.98] shadow-[0_20px_50px_rgba(68,20,26,0.1),0_6px_16px_rgba(119,76,40,0.06),inset_0_1px_rgba(255,255,255,0.95)] px-6 sm:px-8 py-5 sm:py-6">
            <div className="card-ornament absolute top-1.5 left-1/2 -translate-x-1/2 text-[#d89b2c] text-xs opacity-85 select-none" aria-hidden="true">✦</div>

            <div className="card-brand hidden md:flex flex-col items-center mb-2 text-center">
              <img src={aeternaLogo} alt="Aeterna One logo" className="w-11 h-11 object-contain mb-1 drop-shadow-[0_2px_6px_rgba(74,7,23,0.15)]" />
              <span className="text-[#5b0b1d] text-base font-extrabold tracking-[0.12em] leading-tight">AETERNA ONE</span>
              <small className="text-[#a36a1c] text-[8px] tracking-[0.18em] font-extrabold uppercase">STUDY ABROAD CRM</small>
            </div>

            <div className="card-heading text-center mb-3 sm:mb-4">
              <div className="section-kicker inline-flex items-center gap-1.5 mb-1 text-[#ae7c2b] text-[8.5px] font-extrabold tracking-[0.18em]">
                <span className="w-3.5 h-[1px] bg-[#d9b36e] inline-block" />
                WELCOME BACK
                <span className="w-3.5 h-[1px] bg-[#d9b36e] inline-block" />
              </div>
              <h2 className="text-[#3b1019] text-xl sm:text-2xl font-extrabold tracking-tight leading-tight m-0">
                Sign in to <span className="text-[#b27a20]">Aeterna One</span>
              </h2>
              <p className="max-w-[320px] mx-auto mt-1 text-[#927e77] text-xs leading-normal">
                Access your workspace to manage students, applications and branch operations.
              </p>
            </div>

            {resetSuccessMessage && (
              <div className="login-success flex items-start gap-2 -mt-1 mb-3 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs leading-snug" role="status" aria-live="polite">
                <span className="font-bold">✓</span>
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {error && (
              <div className="login-error flex items-start gap-2 -mt-1 mb-3 p-2.5 rounded-xl border border-[#f0c3c1] bg-[#fff1ef] text-[#9f2929] text-xs leading-snug" role="alert" aria-live="polite">
                <AlertCircle size={16} className="flex-none mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form className="login-form flex flex-col gap-2.5 sm:gap-3" onSubmit={handleSubmit} noValidate>
              <div className="field-group flex flex-col gap-1">
                <label className="text-[#745037] text-[9.5px] font-extrabold tracking-[0.14em] uppercase" htmlFor="staff-email">EMAIL OR USERNAME</label>
                <div className="input-shell flex items-center gap-2.5 h-11 sm:h-[46px] px-3.5 rounded-xl border border-[#decbb7] bg-[#fbf8f3] text-[#34111a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 focus-within:border-[#caa050] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#e8b549]/20">
                  <Mail size={16} className="text-[#9c8272] flex-none" />
                  <div ref={emailContainerRef} className="relative flex-1 flex items-center min-w-0">
                    <input
                      ref={emailInputRef}
                      id="staff-email"
                      name="email"
                      type="email"
                      placeholder="Enter your staff email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        requestAnimationFrame(() => emailCaret.updateCaret(event.target));
                      }}
                      onFocus={(event) => {
                        requestAnimationFrame(() => emailCaret.updateCaret(event.target));
                      }}
                      onBlur={() => emailCaret.hideCaret()}
                      onKeyUp={(event) => {
                        requestAnimationFrame(() => emailCaret.updateCaret(event.target));
                      }}
                      onClick={(event) => {
                        requestAnimationFrame(() => emailCaret.updateCaret(event.target));
                      }}
                      required
                      autoComplete="username"
                      className="w-full bg-transparent border-none outline-none text-[#2b0c14] text-[13px] font-medium placeholder:text-[#ab978b]"
                      style={{ caretColor: 'transparent' }}
                    />
                    <span ref={emailMeasureRef} aria-hidden="true" className="input-measure-span" />
                    <span
                      className={`animated-caret ${emailCaret.isTyping ? 'typing' : 'blinking'}`}
                      style={{
                        transform: `translateX(${emailCaret.caretX}px) translateY(-50%)`,
                        opacity: emailCaret.caretOpacity,
                        backgroundColor: '#caa050',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
              <div className="field-group flex flex-col gap-1">
                <label className="text-[#745037] text-[9.5px] font-extrabold tracking-[0.14em] uppercase" htmlFor="staff-password">PASSWORD</label>
                <div className="input-shell flex items-center gap-2.5 h-11 sm:h-[46px] px-3.5 rounded-xl border border-[#decbb7] bg-[#fbf8f3] text-[#34111a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 focus-within:border-[#caa050] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#e8b549]/20">
                  <Lock size={16} className="text-[#9c8272] flex-none" />
                  <div ref={passwordContainerRef} className="relative flex-1 flex items-center min-w-0">
                    <input
                      ref={passwordInputRef}
                      id="staff-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        requestAnimationFrame(() => passwordCaret.updateCaret(event.target));
                      }}
                      onFocus={(event) => {
                        requestAnimationFrame(() => passwordCaret.updateCaret(event.target));
                      }}
                      onBlur={() => passwordCaret.hideCaret()}
                      onKeyUp={(event) => {
                        requestAnimationFrame(() => passwordCaret.updateCaret(event.target));
                      }}
                      onClick={(event) => {
                        requestAnimationFrame(() => passwordCaret.updateCaret(event.target));
                      }}
                      required
                      autoComplete="current-password"
                      className="w-full bg-transparent border-none outline-none text-[#2b0c14] text-[13px] font-medium placeholder:text-[#ab978b]"
                      style={{ caretColor: 'transparent' }}
                    />
                    <span ref={passwordMeasureRef} aria-hidden="true" className="input-measure-span" />
                    <span
                      className={`animated-caret ${passwordCaret.isTyping ? 'typing' : 'blinking'}`}
                      style={{
                        transform: `translateX(${passwordCaret.caretX}px) translateY(-50%)`,
                        opacity: passwordCaret.caretOpacity,
                        backgroundColor: '#caa050',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <button className="password-toggle p-1 text-[#9c8272] hover:text-[#5a0c1e] transition-colors" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-options flex justify-end text-xs -mt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[#9a6a24] font-bold hover:text-[#5a0c1e] transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <button className="sign-in-button w-full h-11 sm:h-[46px] flex items-center justify-center gap-2 rounded-xl text-white font-extrabold text-[13.5px] tracking-wide shadow-[0_6px_16px_rgba(79,10,27,0.25)] bg-gradient-to-r from-[#63081e] via-[#4d0617] to-[#3a0411] hover:from-[#760c25] hover:to-[#450514] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="inline-block size-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {isDev && (
              <section className="demo-section mt-3 pt-2.5 border-t border-[#decbb7]/60" aria-label="Development demo accounts">
                <div className="demo-heading flex items-center gap-2 mb-2 text-[#9a6a24] text-[9px] font-extrabold tracking-widest">
                  <span className="flex-1 h-[1px] bg-[#decbb7]/60" />
                  <b className="flex items-center gap-1"><Zap size={11} /> QUICK DEMO LOGIN · DEV ONLY</b>
                  <span className="flex-1 h-[1px] bg-[#decbb7]/60" />
                </div>
                <div className="demo-buttons flex flex-wrap gap-1.5 justify-center">
                  {DEMO_CREDENTIALS.map((demo) => {
                    const RoleIcon = DEMO_ICON_MAP[demo.iconName] || Crown;
                    return (
                      <button type="button" key={demo.email} onClick={() => handleQuickLogin(demo)} disabled={submitting} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e3d1be] bg-[#fdfaf5] hover:bg-[#fff6e6] hover:border-[#caa050] text-[#5b1726] text-[10.5px] font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50">
                        <RoleIcon size={13} className="text-[#9a6a24]" />
                        <span>{demo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="card-bottom-rule flex items-center gap-2 mt-3 pt-2 border-t border-[#decbb7]/40 text-[#a89587] text-[8px] font-bold tracking-[0.14em]">
              <span className="flex-1 h-[1px] bg-[#decbb7]/40" />
              <small className="uppercase">YOUR WORKSPACE, ALL IN ONE PLACE</small>
              <span className="flex-1 h-[1px] bg-[#decbb7]/40" />
            </div>
          </section>

          <ForgotPasswordModal
            isOpen={isForgotModalOpen}
            onClose={() => setIsForgotModalOpen(false)}
            onPasswordResetSuccess={(resetEmail) => {
              if (resetEmail) {
                setEmail(resetEmail);
              }
              setResetSuccessMessage('Password reset successfully! Please sign in with your new password.');
            }}
          />

          <div className="workspace-footnote mt-2.5 text-center text-[#a79587] text-[8.5px] font-semibold tracking-wide">
            © {CURRENT_YEAR} Aeterna One <span className="text-[#c69b53] mx-1">·</span> Secure access for authorised team members
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
