import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  Layers,
  HelpCircle,
  Calendar,
  Users,
  Settings,
  Flame,
  Globe,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export type ActiveTab =
  | 'dashboard'
  | 'lectures'
  | 'tutor'
  | 'flashcards'
  | 'quizzes'
  | 'planner'
  | 'groups'
  | 'settings';

interface AppLayoutProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const { currentUser, userProfile, language, setLanguage, theme, toggleTheme, signOut, t, streak } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'lectures', label: t.navLectures, icon: BookOpen },
    { id: 'tutor', label: t.navTutor, icon: Bot },
    { id: 'flashcards', label: t.navFlashcards, icon: Layers },
    { id: 'quizzes', label: t.navQuizzes, icon: HelpCircle },
    { id: 'planner', label: t.navPlanner, icon: Calendar },
    { id: 'groups', label: t.navGroups, icon: Users },
  ];

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student';

  // Format today's date according to selected language
  const formattedDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900">{t.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton variant="header" />
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200/80 bg-slate-50 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-xs font-semibold border border-amber-200">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{streak}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-white border-r md:border-r border-slate-200/80 z-30 shrink-0 h-auto md:h-screen sticky top-0`}
      >
        {/* App Logo */}
        <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight">{t.appName}</h1>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t.appTagline}</p>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Settings & Sign Out */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <button
            onClick={() => {
              setActiveTab('settings');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>{t.navSettings}</span>
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar on Desktop */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 hidden md:flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {formattedDate}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className="text-slate-400">|</span>
              <span>{t.appName}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Daily Study Streak Flame */}
            <div
              title={`${t.studyStreak}: ${streak} ${t.daysStreak}`}
              className="flex items-center gap-1.5 bg-amber-50/80 text-amber-800 border border-amber-200/80 px-3 py-1 rounded-full text-xs font-semibold cursor-default"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>
                {streak} {t.daysStreak}
              </span>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200/80 bg-slate-50 transition flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  language === 'ar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                عربي
              </button>
            </div>

            {/* Student Profile Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {displayName.charAt(0)}
              </div>
              <div className="text-left rtl:text-right">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{currentUser?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Email verification reminder banner if student email is unverified */}
        {currentUser && !currentUser.emailVerified && currentUser.providerData.some((p) => p.providerId === 'password') && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800">
            <span>{t.verifyEmailNotice}</span>
            <button
              onClick={() => useAuth().resendVerificationEmail()}
              className="font-semibold underline hover:text-amber-950 ml-4 rtl:mr-4 shrink-0"
            >
              {t.resendVerification}
            </button>
          </div>
        )}

        {/* Dynamic Content View */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
