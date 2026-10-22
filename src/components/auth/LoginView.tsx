import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  Globe,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    signInGoogle,
    signInEmail,
    signUpEmail,
    resetPassword,
    language,
    setLanguage,
    t,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [showForgot, setShowForgot] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google Sign-in was cancelled or failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpEmail(email, password, displayName);
        setSuccessMsg('Account created! A verification link was sent to your email.');
      } else {
        await signInEmail(email, password);
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(err?.message || 'Authentication error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to receive a password reset link.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(email);
      setSuccessMsg(t.resetPasswordSent);
      setShowForgot(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-slate-200">
      {/* Top Language Toggle */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-sm">
        <Globe className="w-4 h-4 text-slate-500" />
        <button
          onClick={() => setLanguage('en')}
          className={`font-medium px-2 py-0.5 rounded transition ${
            language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          English
        </button>
        <span className="text-slate-300">|</span>
        <button
          onClick={() => setLanguage('ar')}
          className={`font-medium px-2 py-0.5 rounded transition ${
            language === 'ar' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          العربية
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* App Wordmark & Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t.appName}</h1>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t.appTagline}</p>
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-slate-600">{t.loginSubtitle}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {/* Notifications */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {showForgot ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900">{t.forgotPassword}</h2>
              <p className="text-xs text-slate-600">Enter your email and we'll send you a secure password reset link.</p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="w-1/2 py-2 px-3 border border-slate-300 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-xs font-medium rounded-lg text-white transition disabled:opacity-50"
                >
                  {submitting ? t.loading : t.resetPassword}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {t.continueWithGoogle}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">{t.or}</span>
                </div>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t.displayName}</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.email}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">{t.password}</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        {t.forgotPassword}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t.confirmPassword}</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl text-white bg-slate-900 hover:bg-slate-800 text-sm font-medium transition shadow-xs disabled:opacity-50 mt-2"
                >
                  <span>{submitting ? t.loading : isSignUp ? t.signUp : t.signIn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  {isSignUp ? t.alreadyHaveAccount : t.needAccount}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
