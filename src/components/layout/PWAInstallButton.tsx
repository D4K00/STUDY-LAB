import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Download, Share, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useAuth();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isArabic = language === 'ar';

  // If already running as an installed PWA in standalone mode, do not show install prompt
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isArabic ? 'التطبيق مثبت وجاهز للعمل' : 'App is installed and ready'}</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'settings') {
      return (
        <button
          onClick={install}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>{isArabic ? 'تثبيت Study Lab على جهازك' : 'Install Study Lab on your device'}</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        title={isArabic ? 'تثبيت التطبيق' : 'Install App'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold transition"
      >
        <Download className="w-3.5 h-3.5 text-blue-600" />
        <span className="hidden sm:inline">{isArabic ? 'تثبيت' : 'Install'}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        {variant === 'settings' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{isArabic ? 'إضافة إلى الشاشة الرئيسية (iOS)' : 'Install on iPhone / iPad'}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            title={isArabic ? 'تثبيت على آيفون / آيباد' : 'Install on iPhone / iPad'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">{isArabic ? 'تثبيت' : 'Install'}</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Share className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isArabic ? 'تثبيت على iPhone و iPad' : 'Install on iPhone & iPad'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">1</span>
                  <p>
                    {isArabic
                      ? 'انقر على زر المشاركة (Share) في شريط أدوات سفاري أسفل الشاشة.'
                      : 'Tap the Share button in Safari toolbar at the bottom or top of your screen.'}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">2</span>
                  <p>
                    {isArabic
                      ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">3</span>
                  <p>
                    {isArabic
                      ? 'انقر على "إضافة" في الزاوية العلوية لتثبيت Study Lab كتطبيق مستقل.'
                      : 'Tap "Add" in the top right corner to install Study Lab as an app.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                {isArabic ? 'حسناً، فهمت' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for browsers that don't trigger beforeinstallprompt (e.g. desktop Safari or already prompted)
  if (variant === 'settings') {
    return (
      <div className="text-xs text-slate-500">
        {isArabic
          ? 'لتثبيت التطبيق، استخدم قائمة المتصفح واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".'
          : 'To install, open your browser menu and choose "Install Study Lab" or "Add to Home Screen".'}
      </div>
    );
  }

  return null;
};
