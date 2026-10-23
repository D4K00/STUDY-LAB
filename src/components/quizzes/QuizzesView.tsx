import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { Course, Lecture, Quiz, QuizAttempt, QuizQuestion, FlashcardDeck, Flashcard } from '../../types/index.ts';
import {
  HelpCircle,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  X,
  Trash2,
  Layers,
  Award,
  AlertCircle,
} from 'lucide-react';

interface QuizzesViewProps {
  initialCourseId?: string;
  initialLectureId?: string;
  onNavigateToFlashcards?: () => void;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({
  initialCourseId,
  initialLectureId,
  onNavigateToFlashcards,
}) => {
  const { currentUser, language, t } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Quiz Playing State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);

  // Modal State
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [genLectureId, setGenLectureId] = useState<string>(initialLectureId || '');
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [genCount, setGenCount] = useState<number>(5);
  const [genTimeLimit, setGenTimeLimit] = useState<number>(10);
  const [generating, setGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Load quizzes and attempts
  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const uid = currentUser.uid;

      const cSnap = await getDocs(
        query(collection(db, 'courses'), where('userId', '==', uid))
      );
      const cList: Course[] = [];
      cSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as Course));
      setCourses(cList);

      const lSnap = await getDocs(
        query(collection(db, 'lectures'), where('userId', '==', uid))
      );
      const lList: Lecture[] = [];
      lSnap.forEach((d) => lList.push({ id: d.id, ...d.data() } as Lecture));
      setLectures(lList);

      const qSnap = await getDocs(
        query(collection(db, 'quizzes'), where('userId', '==', uid))
      );
      const qList: Quiz[] = [];
      qSnap.forEach((d) => {
        const data = d.data();
        let parsedQuestions: QuizQuestion[] = [];
        try {
          parsedQuestions = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
        } catch {}
        qList.push({ id: d.id, ...data, questions: parsedQuestions } as Quiz);
      });
      setQuizzes(qList);

      const aSnap = await getDocs(
        query(collection(db, 'quiz_attempts'), where('userId', '==', uid))
      );
      const aList: QuizAttempt[] = [];
      aSnap.forEach((d) => aList.push({ id: d.id, ...d.data() } as QuizAttempt));
      setAttempts(aList);

      if (initialLectureId) {
        setGenLectureId(initialLectureId);
        setShowGenerateModal(true);
      }
    } catch (err) {
      console.warn('Error loading quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Countdown timer for active quiz
  useEffect(() => {
    if (!activeQuiz || isQuizSubmitted || timeRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuiz, isQuizSubmitted, timeRemainingSeconds]);

  // Start a Quiz
  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsQuizSubmitted(false);
    setLatestAttempt(null);
    setTimeRemainingSeconds(quiz.timeLimitMinutes * 60);
  };

  // Submit Quiz and Grade
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !currentUser) return;

    let correctCount = 0;
    const answersRecord: Record<string, { userAnswer: string; isCorrect: boolean; explanation: string }> = {};

    activeQuiz.questions.forEach((q) => {
      const userAns = selectedAnswers[q.id] || '';
      const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) correctCount += 1;

      answersRecord[q.id] = {
        userAnswer: userAns,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const total = activeQuiz.questions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const timeSpent = activeQuiz.timeLimitMinutes * 60 - timeRemainingSeconds;

    const attemptDoc = {
      userId: currentUser.uid,
      quizId: activeQuiz.id,
      score: correctCount,
      totalQuestions: total,
      percentage,
      timeTakenSeconds: Math.max(timeSpent, 0),
      answers: JSON.stringify(answersRecord),
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, 'quiz_attempts'), attemptDoc);
      const newAttempt: QuizAttempt = {
        id: docRef.id,
        ...attemptDoc,
        answers: answersRecord,
      };
      setAttempts((prev) => [newAttempt, ...prev]);
      setLatestAttempt(newAttempt);
      setIsQuizSubmitted(true);
    } catch (err) {
      console.error('Failed to save quiz attempt:', err);
    }
  };

  // AI Quiz Generation
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !genLectureId) return;

    setGenError(null);
    setGenerating(true);
    try {
      const targetLecture = lectures.find((l) => l.id === genLectureId);
      if (!targetLecture) {
        setGenError('Selected lecture not found. Please choose an existing lecture.');
        return;
      }

      const lectureContent = (targetLecture.extractedText || targetLecture.notes || targetLecture.title || '').trim();
      if (!lectureContent) {
        setGenError('The selected lecture has no text or notes. Please add notes or upload document text first.');
        return;
      }

      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureText: lectureContent,
          lectureTitle: targetLecture.title,
          difficulty: genDifficulty,
          count: genCount,
          timeLimitMinutes: genTimeLimit,
          language,
        }),
      });

      // Read the response as text first: proxies/hosting platforms may return
      // plain text or an HTML error page instead of JSON (which makes res.json()
      // throw an unhelpful "Unexpected token" error).
      const responseText = await res.text();
      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          const preview = responseText.replace(/\\s+/g, ' ').trim().slice(0, 180);
          if (!res.ok) {
            throw new Error(
              `Quiz service returned HTTP ${res.status} with a non-JSON response. ` +
              (res.status === 404
                ? 'The /api/ai/quiz endpoint was not found in this deployment. Check the server/API routing configuration.'
                : 'Check the server logs and API configuration.') +
              ` Response: ${preview}`
            );
          }
          throw new Error(
            `Quiz service returned an invalid response instead of JSON${contentType ? ` (${contentType})` : ''}. ` +
            `Check that /api/ai/quiz is routed to the backend, not the website page. Response: ${preview}`
          );
        }
      } else if (!res.ok) {
        throw new Error(`Quiz service failed with HTTP ${res.status} and returned an empty response.`);
      } else {
        throw new Error('Quiz service returned an empty response. Please try again later.');
      }

      if (!res.ok || !data?.success || !Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error(
          data?.error ||
          data?.message ||
          `Could not generate valid quiz questions (HTTP ${res.status}). Check lecture content and API availability.`
        );
      }

      const quizDoc = {
        userId: currentUser.uid,
        courseId: targetLecture.courseId || '',
        lectureId: targetLecture.id || '',
        title: `${targetLecture.title} Practice Quiz`,
        difficulty: genDifficulty,
        timeLimitMinutes: genTimeLimit,
        questionCount: data.questions.length,
        questions: JSON.stringify(data.questions),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'quizzes'), quizDoc);
      const created: Quiz = { id: docRef.id, ...quizDoc, questions: data.questions };
      setQuizzes((prev) => [created, ...prev]);
      setShowGenerateModal(false);
      handleStartQuiz(created);
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setGenError(err.message || 'Error generating quiz');
    } finally {
      setGenerating(false);
    }
  };

  // Generate Flashcards from Missed Questions
  const handleGenerateFlashcardsFromMissed = async () => {
    if (!activeQuiz || !currentUser || !latestAttempt) return;

    const missedQuestions = activeQuiz.questions.filter((q) => {
      const ans = latestAttempt.answers[q.id];
      return ans && !ans.isCorrect;
    });

    if (missedQuestions.length === 0) {
      alert('You answered all questions correctly! No missed cards to create.');
      return;
    }

    try {
      const deckDoc = {
        userId: currentUser.uid,
        courseId: activeQuiz.courseId,
        lectureId: activeQuiz.lectureId,
        title: `Missed: ${activeQuiz.title}`,
        description: `Flashcards generated from missed questions in ${activeQuiz.title}`,
        cardCount: missedQuestions.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const dRef = await addDoc(collection(db, 'flashcard_decks'), deckDoc);
      const todayStr = new Date().toISOString().split('T')[0];

      for (const q of missedQuestions) {
        await addDoc(collection(db, 'flashcards'), {
          userId: currentUser.uid,
          deckId: dRef.id,
          front: q.question,
          back: `${q.correctAnswer}\n\nExplanation: ${q.explanation}`,
          difficulty: activeQuiz.difficulty,
          sourceReference: q.sourceReference || activeQuiz.title,
          interval: 1,
          repetition: 0,
          easeFactor: 2.5,
          dueDate: todayStr,
          state: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      alert(`Created review deck with ${missedQuestions.length} flashcards from missed questions!`);
      if (onNavigateToFlashcards) onNavigateToFlashcards();
    } catch (err) {
      console.error('Error creating flashcards from missed:', err);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      if (activeQuiz?.id === quizId) setActiveQuiz(null);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentQ = activeQuiz?.questions[currentQuestionIndex];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Quiz Player Interface */}
      {activeQuiz && (
        <div className="max-w-2xl mx-auto space-y-6">
          {!isQuizSubmitted && currentQ ? (
            /* Taking Quiz */
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-md space-y-6">
              {/* Top bar with timer & question progress */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <button
                  onClick={() => {
                    if (window.confirm('Leave quiz? Current progress will be lost.')) {
                      setActiveQuiz(null);
                    }
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Exit
                </button>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimer(timeRemainingSeconds)}</span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                </span>
              </div>

              {/* Question Text */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {currentQ.type.toUpperCase()}
                </span>
                <h3 className="mt-2 text-base md:text-lg font-bold text-slate-900 leading-snug">
                  {currentQ.question}
                </h3>
              </div>

              {/* Answer options */}
              <div className="space-y-2.5">
                {currentQ.type !== 'boolean' && currentQ.type !== 'short' && (
                  (currentQ.options && currentQ.options.length > 0
                    ? currentQ.options
                    : [currentQ.correctAnswer || 'Option A', 'Option B', 'Option C', 'Option D']
                  ).map((opt, i) => {
                    const isSelected = selectedAnswers[currentQ.id] === opt;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))
                        }
                        className={`w-full p-4 rounded-xl text-left rtl:text-right text-xs md:text-sm font-medium border transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                            isSelected ? 'border-white bg-white text-slate-900' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-slate-900" />}
                        </div>
                      </button>
                    );
                  })
                )}

                {currentQ.type === 'boolean' && (
                  <div className="grid grid-cols-2 gap-3">
                    {(currentQ.options && currentQ.options.length >= 2
                      ? currentQ.options
                      : language === 'ar'
                      ? ['صحيح', 'خطأ']
                      : ['True', 'False']
                    ).map((val) => {
                      const isSelected = selectedAnswers[currentQ.id] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }))
                          }
                          className={`p-4 rounded-xl text-center text-sm font-semibold border transition ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQ.type === 'short' && (
                  <div>
                    <textarea
                      value={selectedAnswers[currentQ.id] || ''}
                      onChange={(e) =>
                        setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                      }
                      placeholder="Type your concise answer..."
                      rows={3}
                      className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Prev / Next / Submit Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  {t.prevQuestion}
                </button>

                {currentQuestionIndex + 1 < activeQuiz.questions.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    {t.nextQuestion}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                  >
                    {t.submitQuiz}
                  </button>
                )}
              </div>
            </div>
          ) : isQuizSubmitted && latestAttempt ? (
            /* Results & Review Screen */
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-md space-y-6">
              <div className="text-center py-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                  <Award className="w-8 h-8 text-amber-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t.score}</h2>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {latestAttempt.percentage}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {latestAttempt.score} of {latestAttempt.totalQuestions} questions answered
                  correctly in {formatTimer(latestAttempt.timeTakenSeconds)}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handleStartQuiz(activeQuiz)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.retryQuiz}</span>
                  </button>

                  {latestAttempt.percentage < 100 && (
                    <button
                      onClick={handleGenerateFlashcardsFromMissed}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{t.createFlashcardsFromMissed}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Comprehensive Breakdown of All Questions */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Detailed Answers & Citations
                </h3>
                {activeQuiz.questions.map((q, idx) => {
                  const ansData = latestAttempt.answers[q.id];
                  const isCorrect = ansData?.isCorrect;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-red-200 bg-red-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Question #{idx + 1}</span>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-bold">
                            <XCircle className="w-4 h-4" /> Incorrect
                          </span>
                        )}
                      </div>

                      <p className="font-semibold text-slate-900 text-sm">{q.question}</p>

                      <div className="pt-1">
                        <span className="text-slate-500">Your answer: </span>
                        <span className="font-medium text-slate-800">
                          {ansData?.userAnswer || '(No answer provided)'}
                        </span>
                      </div>

                      {!isCorrect && (
                        <div>
                          <span className="text-slate-500">Correct answer: </span>
                          <span className="font-bold text-emerald-800">{q.correctAnswer}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/50 text-slate-600">
                        <span className="font-semibold">Explanation: </span>
                        <span>{q.explanation}</span>
                        {q.sourceReference && (
                          <p className="mt-1 text-[11px] text-slate-500 italic">
                            Source: {q.sourceReference}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Quizzes List (Master View) */}
      {!activeQuiz && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.myQuizzes}</h1>
              <p className="text-xs text-slate-500 mt-1">
                AI practice exams extracted directly from your course lectures
              </p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>{t.createQuiz}</span>
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t.noQuizzesTitle}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t.noQuizzesDesc}</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.createQuiz}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => {
                const pastAttempts = attempts.filter((a) => a.quizId === quiz.id);
                const bestScore =
                  pastAttempts.length > 0
                    ? Math.max(...pastAttempts.map((a) => a.percentage))
                    : null;
                return (
                  <div
                    key={quiz.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {quiz.difficulty}
                        </span>
                        <button
                          onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                          className="p-1 text-slate-300 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">{quiz.title}</h3>
                      <p className="text-xs text-slate-500">
                        {quiz.questionCount} {t.questionsCount} · {quiz.timeLimitMinutes} min limit
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {bestScore !== null ? `Best: ${bestScore}%` : 'Not attempted'}
                      </span>
                      <button
                        onClick={() => handleStartQuiz(quiz)}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
                      >
                        {t.startQuiz}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Quiz Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">{t.createQuiz}</h3>
              </div>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {genError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.selectLecture}
                </label>
                <select
                  required
                  value={genLectureId}
                  onChange={(e) => setGenLectureId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                >
                  <option value="">Select a lecture</option>
                  {lectures.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.difficulty}
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setGenDifficulty(d)}
                      className={`py-2 rounded-lg border text-center capitalize transition ${
                        genDifficulty === d
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {d === 'easy' ? t.diffEasy : d === 'medium' ? t.diffMedium : t.diffHard}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Questions: {genCount}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Timer: {genTimeLimit} min
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={genTimeLimit}
                    onChange={(e) => setGenTimeLimit(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={generating || !genLectureId}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {generating ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Questions...</span>
                    </>
                  ) : (
                    <span>Generate Quiz</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
