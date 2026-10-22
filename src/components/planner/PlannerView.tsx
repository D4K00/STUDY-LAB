import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { Course, PlannerEvent } from '../../types/index.ts';
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  Clock,
  CheckSquare,
  Square,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  Check,
} from 'lucide-react';

export const PlannerView: React.FC = () => {
  const { currentUser, language, t } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [loading, setLoading] = useState<boolean>(true);

  // Month navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Manual Event Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventType, setEventType] = useState<'task' | 'assignment' | 'session' | 'exam' | 'other'>('task');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState<string>('09:00');
  const [eventEndTime, setEventEndTime] = useState<string>('10:00');
  const [eventCourseId, setEventCourseId] = useState<string>('');
  const [eventPriority, setEventPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [eventDesc, setEventDesc] = useState<string>('');
  const [eventError, setEventError] = useState<string | null>(null);

  // AI Plan Generator Modal
  const [showAiPlanModal, setShowAiPlanModal] = useState<boolean>(false);
  const [targetExamDate, setTargetExamDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [availableHours, setAvailableHours] = useState<number>(3);
  const [sessionMinutes, setSessionMinutes] = useState<number>(45);
  const [selectedCourseNames, setSelectedCourseNames] = useState<string[]>([]);
  const [generatingPlan, setGeneratingPlan] = useState<boolean>(false);

  // Proposed plan for review
  const [proposedSchedule, setProposedSchedule] = useState<any[] | null>(null);

  // Load events & courses
  const loadPlannerData = async () => {
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

      const eSnap = await getDocs(
        query(collection(db, 'planner_events'), where('userId', '==', uid))
      );
      const eList: PlannerEvent[] = [];
      eSnap.forEach((d) => eList.push({ id: d.id, ...d.data() } as PlannerEvent));
      eList.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(eList);
    } catch (err) {
      console.warn('Error loading planner:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlannerData();
  }, [currentUser]);

  // Toggle task completion
  const handleToggleComplete = async (eventId: string, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, 'planner_events', eventId), {
        completed: !currentVal,
        updatedAt: new Date().toISOString(),
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, completed: !currentVal } : e))
      );
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Add event manually
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !eventTitle.trim()) {
      setEventError('Please enter a title for this planner item.');
      return;
    }

    setEventError(null);
    try {
      const eventDoc: any = {
        userId: currentUser.uid,
        title: eventTitle.trim(),
        type: eventType,
        date: eventDate,
        priority: eventPriority,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (eventCourseId) eventDoc.courseId = eventCourseId;
      if (eventStartTime) eventDoc.startTime = eventStartTime;
      if (eventEndTime) eventDoc.endTime = eventEndTime;
      if (eventDesc && eventDesc.trim()) eventDoc.description = eventDesc.trim();

      const docRef = await addDoc(collection(db, 'planner_events'), eventDoc);
      const created: PlannerEvent = { id: docRef.id, ...eventDoc };
      setEvents((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));

      setEventTitle('');
      setEventDesc('');
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Failed to add planner event:', err);
      setEventError(err.message || 'Failed to save event. Please try again.');
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'planner_events', eventId));
      setEvents((prev) => prev.filter((item) => item.id !== eventId));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  // Generate Proposed AI Study Plan
  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      const res = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetExamDate,
          availableHoursPerDay: availableHours,
          sessionLengthMinutes: sessionMinutes,
          subjectsOrLectures:
            selectedCourseNames.length > 0
              ? selectedCourseNames
              : courses.map((c) => c.name),
          language,
        }),
      });

      const data = await res.json();
      if (data.success && data.schedule) {
        setProposedSchedule(data.schedule);
      } else {
        alert('Could not generate plan. Please verify parameters.');
      }
    } catch (err: any) {
      alert('Error generating plan: ' + err.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Accept & save proposed plan to Firestore
  const handleAcceptPlan = async () => {
    if (!currentUser || !proposedSchedule) return;

    try {
      const savedEvents: PlannerEvent[] = [];
      for (const item of proposedSchedule) {
        const docData: any = {
          userId: currentUser.uid,
          title: item.title || 'Study Session',
          type: item.type || 'session',
          date: item.date,
          priority: item.priority || 'high',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (item.startTime) docData.startTime = item.startTime;
        if (item.endTime) docData.endTime = item.endTime;
        if (item.description) docData.description = item.description;

        const docRef = await addDoc(collection(db, 'planner_events'), docData);
        savedEvents.push({ id: docRef.id, ...docData });
      }

      setEvents((prev) => [...prev, ...savedEvents].sort((a, b) => a.date.localeCompare(b.date)));
      setProposedSchedule(null);
      setShowAiPlanModal(false);
    } catch (err) {
      console.error('Failed to save proposed plan:', err);
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.studyPlanner}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage deadlines, study sessions, and AI-scheduled exam preparation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-white border border-slate-200 p-1 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'month' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.monthView}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.listView}
            </button>
          </div>

          <button
            onClick={() => setShowAiPlanModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.aiScheduleGenerator}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addEvent}</span>
          </button>
        </div>
      </div>

      {/* Calendar Month View */}
      {viewMode === 'month' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{monthName}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-24 bg-slate-50/50 rounded-xl" />;
              }

              const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                day
              ).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.date === formattedDay);
              const isToday = formattedDay === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={day}
                  onClick={() => {
                    setEventDate(formattedDay);
                    setShowAddModal(true);
                  }}
                  className={`h-24 p-1.5 rounded-xl border border-slate-100 flex flex-col justify-between cursor-pointer transition hover:bg-slate-50 overflow-hidden ${
                    isToday ? 'bg-blue-50/40 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                          ev.type === 'exam'
                            ? 'bg-purple-100 text-purple-800'
                            : ev.type === 'assignment'
                            ? 'bg-amber-100 text-amber-800'
                            : ev.completed
                            ? 'line-through bg-slate-100 text-slate-400'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-medium pl-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda List View */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t.noEvents}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleComplete(ev.id, ev.completed)}
                      className="text-slate-400 hover:text-slate-800 transition"
                    >
                      {ev.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                    <div>
                      <h4
                        className={`text-sm font-semibold ${
                          ev.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {ev.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {ev.date} {ev.startTime ? `· ${ev.startTime} - ${ev.endTime}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        ev.type === 'exam'
                          ? 'bg-purple-50 text-purple-700'
                          : ev.type === 'assignment'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ev.type}
                    </span>
                    <button
                      onClick={(e) => handleDeleteEvent(ev.id, e)}
                      className="p-1 text-slate-300 hover:text-red-600 transition rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t.addEvent}</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEventError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {eventError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{eventError}</span>
              </div>
            )}

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.eventTitle}</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Midterm Exam Review"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.eventType}</label>
                  <select
                    value={eventType}
                    onChange={(e: any) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                  >
                    <option value="task">{t.typeTask}</option>
                    <option value="assignment">{t.typeAssignment}</option>
                    <option value="session">{t.typeSession}</option>
                    <option value="exam">{t.typeExam}</option>
                    <option value="other">{t.typeOther}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.eventDate}</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.priority}</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEventPriority(p)}
                      className={`py-1.5 rounded-lg border text-center capitalize transition ${
                        eventPriority === p
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'low' ? t.priorityLow : p === 'medium' ? t.priorityMedium : t.priorityHigh}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Study Plan Generator Modal */}
      {showAiPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">{t.aiScheduleGenerator}</h3>
              </div>
              <button
                onClick={() => {
                  setShowAiPlanModal(false);
                  setProposedSchedule(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {proposedSchedule ? (
                /* Plan Review Interface */
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
                    <p className="font-bold">{t.planReviewTitle}</p>
                    <p className="mt-0.5">
                      Review each session below before committing it to your calendar. You may accept or regenerate.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {proposedSchedule.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{item.title}</p>
                          <p className="text-slate-500">
                            {item.date} · {item.startTime} - {item.endTime}
                          </p>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Plan Generator Inputs */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.targetExamDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={targetExamDate}
                      onChange={(e) => setTargetExamDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.availableHours}: {availableHours}h
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={availableHours}
                      onChange={(e) => setAvailableHours(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Courses to Cover
                    </label>
                    <div className="space-y-1">
                      {courses.length === 0 ? (
                        <p className="text-xs text-slate-400">All General Subjects</p>
                      ) : (
                        courses.map((c) => {
                          const checked = selectedCourseNames.includes(c.name);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCourseNames((prev) => [...prev, c.name]);
                                  } else {
                                    setSelectedCourseNames((prev) => prev.filter((n) => n !== c.name));
                                  }
                                }}
                                className="rounded text-slate-900 focus:ring-slate-800"
                              />
                              <span>{c.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAiPlanModal(false);
                  setProposedSchedule(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
              >
                {t.cancel}
              </button>

              {proposedSchedule ? (
                <>
                  <button
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                  >
                    {t.regeneratePlan}
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptPlan}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t.acceptPlan}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {generatingPlan ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling Plan...</span>
                    </>
                  ) : (
                    <span>{t.generatePlan}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
