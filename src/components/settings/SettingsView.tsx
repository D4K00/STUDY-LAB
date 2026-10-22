import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Settings as SettingsIcon,
  Globe,
  User,
  Shield,
  Trash2,
  LogOut,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Flame,
  Check,
  Sun,
  Moon,
  Smartphone,
} from 'lucide-react';
import { PWAInstallButton } from '../layout/PWAInstallButton.tsx';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    language,
    setLanguage,
    theme,
    setTheme,
    updateDisplayName,
    resetPassword,
    signOut,
    deleteAccount,
    t,
    streak,
  } = useAuth();

  const [displayNameInput, setDisplayNameInput] = useState<string>(
    userProfile?.displayName || currentUser?.displayName || ''
  );
  const [savingName, setSavingName] = useState<boolean>(false);
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [resetSentSuccess, setResetSentSuccess] = useState<boolean>(false);

  // Account deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;
    setSavingName(true);
    try {
      await updateDisplayName(displayNameInput);
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update display name:', err);
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      await resetPassword(currentUser.email);
      setResetSentSuccess(true);
      setTimeout(() => setResetSentSuccess(false), 4000);
    } catch (err) {
      alert('Could not send reset email.');
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      alert('Failed to delete account: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.settings}</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account preferences, interface language, and cloud privacy
        </p>
      </div>

      {/* Language Preference Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">{t.languagePref}</h2>
        </div>
        <p className="text-xs text-slate-500">
          Switch interface direction and typography between English (LTR) and العربية (RTL).
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
          <button
            onClick={() => setLanguage('en')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
              language === 'en'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>English (LTR)</span>
            {language === 'en' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
              language === 'ar'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>العربية (RTL)</span>
            {language === 'ar' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Theme Preference Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          <h2 className="text-sm font-bold text-slate-900">{t.theme}</h2>
        </div>
        <p className="text-xs text-slate-500">{t.themeDesc}</p>
        <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
              theme === 'light'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{t.lightMode}</span>
            </div>
            {theme === 'light' && <Check className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
              theme === 'dark'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>{t.darkMode}</span>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Profile & Name Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">{t.profileInfo}</h2>
        </div>
        <form onSubmit={handleSaveDisplayName} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.displayName}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
              <button
                type="submit"
                disabled={savingName}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shrink-0"
              >
                {savingName ? t.loading : nameSavedSuccess ? 'Saved!' : t.save}
              </button>
            </div>
          </div>
        </form>

        <div className="pt-2 flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentUser?.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {streak} {t.daysStreak} study streak
            </span>
          </div>
        </div>
      </div>

      {/* Account Security & Password Reset */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">{t.accountSecurity}</h2>
        </div>
        <p className="text-xs text-slate-500">
          Authenticated with Firebase Authentication. Request password reset email below.
        </p>

        {resetSentSuccess ? (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t.resetPasswordSent}</span>
          </div>
        ) : (
          <button
            onClick={handlePasswordReset}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
          >
            {t.resetPassword}
          </button>
        )}
      </div>

      {/* Permanent Account Deletion (Red Zone) */}
      <div className="bg-red-50/50 rounded-2xl border border-red-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-sm font-bold text-red-900">{t.deleteAccount}</h2>
        </div>
        <p className="text-xs text-red-700 leading-relaxed max-w-xl">{t.deleteAccountWarning}</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition shadow-xs"
        >
          {t.deleteAccount}
        </button>
      </div>

      {/* Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">{t.deleteAccount}</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {t.deleteAccountWarning}
              </p>
              <p className="mt-3 text-xs font-semibold text-red-600">
                To confirm, type <span className="font-mono bg-red-50 px-1 py-0.5 rounded">DELETE</span> below:
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full text-center font-mono font-bold tracking-widest px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmText('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={confirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition disabled:opacity-40 shadow-xs"
              >
                {deleting ? t.loading : t.deleteAccountConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
