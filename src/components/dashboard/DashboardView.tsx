import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ActiveTab } from '../layout/AppLayout.tsx';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrors.ts';
import { Course, Lecture, PlannerEvent, QuizAttempt } from '../../types/index.ts';
import {
  GraduationCap,
  BookOpen,
  Layers,
  HelpCircle,
  Calendar,
  Bot,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  AlertTriangle,
  Upload,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenUpload?: () => void;
  onOpenTaskModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenUpload,
  onOpenTaskModal,
}) => {
  const { currentUser, userProfile, language, t, streak } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [tasks, setTasks] = useState<PlannerEvent[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.goodMorning;
    if (hour < 18) return t.goodAfternoon;
    return t.goodEvening;
  };

  const studentName =
    userProfile?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Student';

  // Load real student data
  useEffect(() => {
    if (!currentUser) return;
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const uid = currentUser.uid;

        // Fetch courses
        const coursesSnap = await getDocs(
          query(collection(db, 'courses'), where('userId', '==', uid))
        );
        const fetchedCourses: Course[] = [];
        coursesSnap.forEach((d) => fetchedCourses.push({ id: d.id, ...d.data() } as Course));
        setCourses(fetchedCourses);

        // Fetch lectures
        const lecturesSnap = await getDocs(
          query(collection(db, 'lectures'), where('userId', '==', uid))
        );
        const fetchedLectures: Lecture[] = [];
        lecturesSnap.forEach((d) => fetchedLectures.push({ id: d.id, ...d.data() } as Lecture));
        setLectures(fetchedLectures);

        // Fetch planner events
        const tasksSnap = await getDocs(
          query(collection(db, 'planner_events'), where('userId', '==', uid))
        );
        const fetchedTasks: PlannerEvent[] = [];
        tasksSnap.forEach((d) => fetchedTasks.push({ id: d.id, ...d.data() } as PlannerEvent));
        setTasks(fetchedTasks);

        // Fetch quiz attempts
        const quizSnap = await getDocs(
          query(collection(db, 'quiz_attempts'), where('userId', '==', uid))
        );
        const fetchedAttempts: QuizAttempt[] = [];
        quizSnap.forEach((d) => fetchedAttempts.push({ id: d.id, ...d.data() } as QuizAttempt));
        setQuizAttempts(fetchedAttempts);
      } catch (err) {
        console.warn('Dashboard fetch notice:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  // Calculations from real data only
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.date === todayStr);
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const upcomingExams = tasks.filter(
    (t) => (t.type === 'exam' || t.type === 'assignment') && t.date >= todayStr && !t.completed
  ).sort((a, b) => a.date.localeCompare(b.date));

  const averageQuizScore =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / quizAttempts.length
        )
      : null;

  const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean) => {
    try {
      const taskRef = doc(db, 'planner_events', taskId);
      await updateDoc(taskRef, {
        completed: !currentCompleted,
        updatedAt: new Date().toISOString(),
      });
      setTasks((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, completed: !currentCompleted } : item))
      );
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <GraduationCap className="w-4 h-4 text-slate-700" />
            <span>{t.appTagline}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, {studentName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t.welcomeSub}</p>
        </div>
      </div>

      {/* Metrics Row - Derived only from real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Courses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.metricsCourses}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{courses.length}</p>
          <button
            onClick={() => onNavigate('lectures')}
            className="mt-2 text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
          >
            <span>{t.myLectures}</span>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>

        {/* Metric 2: Lectures */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.metricsLectures}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{lectures.length}</p>
          <span className="mt-2 text-xs text-slate-400 block">
            {lectures.filter((l) => l.status === 'ready').length} {t.ready.toLowerCase()}
          </span>
        </div>

        {/* Metric 3: Pending Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.metricsPendingTasks}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{pendingTasksCount}</p>
          <span className="mt-2 text-xs text-slate-400 block">
            {completedTasksCount} completed
          </span>
        </div>

        {/* Metric 4: Quiz Average */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.metricsQuizAvg}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {averageQuizScore !== null ? `${averageQuizScore}%` : '—'}
          </p>
          <span className="mt-2 text-xs text-slate-400 block">
            {quizAttempts.length} {quizAttempts.length === 1 ? 'attempt' : 'attempts'}
          </span>
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">{t.quickActions}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('lectures')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 mb-2 transition">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {t.actionUploadLecture}
            </span>
          </button>

          <button
            onClick={() => onNavigate('flashcards')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 mb-2 transition">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {t.actionCreateFlashcards}
            </span>
          </button>

          <button
            onClick={() => onNavigate('quizzes')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 mb-2 transition">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {t.actionGenerateQuiz}
            </span>
          </button>

          <button
            onClick={() => onNavigate('tutor')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 mb-2 transition">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {t.actionAskTutor}
            </span>
          </button>

          <button
            onClick={() => onNavigate('planner')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-center group col-span-2 sm:col-span-1"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 mb-2 transition">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {t.actionAddStudyTask}
            </span>
          </button>
        </div>
      </div>

      {/* Two Column Widgets: Today's Tasks & Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks Widget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-700" />
              <span>{t.todaysTasks}</span>
            </h2>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              {t.studyPlanner}
            </button>
          </div>

          <div className="flex-1">
            {todaysTasks.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 max-w-xs mx-auto">{t.noTasksToday}</p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-3 text-xs font-medium text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50"
                >
                  {t.addEvent}
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {todaysTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaskCompletion(task.id, task.completed)}
                        className="text-slate-400 hover:text-slate-800 transition"
                      >
                        {task.completed ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                      <div>
                        <p
                          className={`text-xs font-medium ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.startTime && (
                          <p className="text-[11px] text-slate-400">
                            {task.startTime} {task.endTime ? `- ${task.endTime}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize ${
                        task.priority === 'high'
                          ? 'bg-red-50 text-red-700'
                          : task.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Exams & Deadlines Widget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-700" />
              <span>{t.upcomingExams}</span>
            </h2>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              {t.studyPlanner}
            </button>
          </div>

          <div className="flex-1">
            {upcomingExams.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 max-w-xs mx-auto">{t.noUpcomingExams}</p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-3 text-xs font-medium text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50"
                >
                  {t.addEvent}
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcomingExams.slice(0, 4).map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{exam.title}</p>
                      <p className="text-[11px] text-slate-500">{exam.date}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/50">
                      {exam.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Lectures Widget */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-700" />
            <span>{t.recentLectures}</span>
          </h2>
          <button
            onClick={() => onNavigate('lectures')}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
          >
            <span>{t.myLectures}</span>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>

        {lectures.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 max-w-sm mx-auto">{t.noLecturesYet}</p>
            <button
              onClick={() => onNavigate('lectures')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 px-3.5 py-2 rounded-lg shadow-xs hover:bg-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newCourse}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lectures.slice(0, 3).map((lecture) => (
              <div
                key={lecture.id}
                onClick={() => onNavigate('lectures')}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition cursor-pointer bg-white"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="uppercase text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {lecture.fileType.toUpperCase() || 'DOC'}
                  </span>
                  <span>{new Date(lecture.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 truncate mb-1">
                  {lecture.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {lecture.extractedText ? lecture.extractedText.slice(0, 100) : 'Extracted lecture text'}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
