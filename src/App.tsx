import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { AppLayout, ActiveTab } from './components/layout/AppLayout.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { LecturesView } from './components/lectures/LecturesView.tsx';
import { TutorView } from './components/tutor/TutorView.tsx';
import { FlashcardsView } from './components/flashcards/FlashcardsView.tsx';
import { QuizzesView } from './components/quizzes/QuizzesView.tsx';
import { PlannerView } from './components/planner/PlannerView.tsx';
import { StudyGroupsView } from './components/groups/StudyGroupsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { GraduationCap } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [navContext, setNavContext] = useState<{ courseId?: string; lectureId?: string }>({});

  const handleNavigate = (tab: ActiveTab, context?: { courseId?: string; lectureId?: string }) => {
    if (context) setNavContext(context);
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md animate-pulse">
          <GraduationCap className="w-7 h-7" />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Loading Study Lab...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
      {activeTab === 'lectures' && <LecturesView onNavigate={handleNavigate} />}
      {activeTab === 'tutor' && (
        <TutorView
          initialCourseId={navContext.courseId}
          initialLectureId={navContext.lectureId}
        />
      )}
      {activeTab === 'flashcards' && (
        <FlashcardsView
          initialCourseId={navContext.courseId}
          initialLectureId={navContext.lectureId}
        />
      )}
      {activeTab === 'quizzes' && (
        <QuizzesView
          initialCourseId={navContext.courseId}
          initialLectureId={navContext.lectureId}
          onNavigateToFlashcards={() => setActiveTab('flashcards')}
        />
      )}
      {activeTab === 'planner' && <PlannerView />}
      {activeTab === 'groups' && <StudyGroupsView />}
      {activeTab === 'settings' && <SettingsView />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
