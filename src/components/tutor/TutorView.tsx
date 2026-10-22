import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { Course, Lecture, TutorConversation, TutorMessage } from '../../types/index.ts';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  MessageSquare,
  Plus,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface TutorViewProps {
  initialCourseId?: string;
  initialLectureId?: string;
}

export const TutorView: React.FC<TutorViewProps> = ({
  initialCourseId,
  initialLectureId,
}) => {
  const { currentUser, language, t } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<TutorConversation | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);

  // Tutor configuration
  const [mode, setMode] = useState<'lecture' | 'general'>('lecture');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '');
  const [selectedLectureId, setSelectedLectureId] = useState<string>(initialLectureId || '');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load courses, lectures, and existing conversations
  useEffect(() => {
    if (!currentUser) return;
    const loadTutorData = async () => {
      try {
        const uid = currentUser.uid;

        // Courses
        const cSnap = await getDocs(
          query(collection(db, 'courses'), where('userId', '==', uid))
        );
        const cList: Course[] = [];
        cSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as Course));
        setCourses(cList);

        // Lectures
        const lSnap = await getDocs(
          query(collection(db, 'lectures'), where('userId', '==', uid))
        );
        const lList: Lecture[] = [];
        lSnap.forEach((d) => lList.push({ id: d.id, ...d.data() } as Lecture));
        setLectures(lList);

        // Pre-select lecture if provided or fallback
        if (initialLectureId) {
          setSelectedLectureId(initialLectureId);
          setMode('lecture');
        } else if (lList.length > 0) {
          setSelectedLectureId(lList[0].id);
          setSelectedCourseId(lList[0].courseId);
        } else {
          setMode('general');
        }

        // Conversations
        const convSnap = await getDocs(
          query(collection(db, 'tutor_conversations'), where('userId', '==', uid))
        );
        const convList: TutorConversation[] = [];
        convSnap.forEach((d) => convList.push({ id: d.id, ...d.data() } as TutorConversation));
        convList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setConversations(convList);

        if (convList.length > 0) {
          setActiveConversation(convList[0]);
        }
      } catch (err) {
        console.warn('Tutor load notice:', err);
      }
    };

    loadTutorData();
  }, [currentUser, initialLectureId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const msgSnap = await getDocs(
          collection(db, 'tutor_conversations', activeConversation.id, 'messages')
        );
        const msgList: TutorMessage[] = [];
        msgSnap.forEach((d) => msgList.push({ id: d.id, ...d.data() } as TutorMessage));
        msgList.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages(msgList);
      } catch (err) {
        console.warn('Error loading messages:', err);
      }
    };

    loadMessages();
  }, [activeConversation]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handle start new conversation
  const handleNewConversation = async () => {
    if (!currentUser) return;
    const lecture = lectures.find((l) => l.id === selectedLectureId);
    const title =
      mode === 'lecture' && lecture
        ? `${lecture.title} Tutor Session`
        : `Academic Inquiry ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    try {
      const convData = {
        userId: currentUser.uid,
        courseId: selectedCourseId || undefined,
        lectureId: mode === 'lecture' ? selectedLectureId : undefined,
        title,
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'tutor_conversations'), convData);
      const newConv: TutorConversation = { id: docRef.id, ...convData };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'tutor_conversations', convId));
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversation?.id === convId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || inputMessage).trim();
    if (!question || !currentUser || isSending) return;

    setInputMessage('');
    setIsSending(true);

    try {
      // Create conversation if none active
      let conv = activeConversation;
      if (!conv) {
        const lecture = lectures.find((l) => l.id === selectedLectureId);
        const title =
          mode === 'lecture' && lecture
            ? `${lecture.title}`
            : question.slice(0, 30);

        const convData = {
          userId: currentUser.uid,
          courseId: selectedCourseId || undefined,
          lectureId: mode === 'lecture' ? selectedLectureId : undefined,
          title,
          mode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'tutor_conversations'), convData);
        conv = { id: docRef.id, ...convData };
        setConversations((prev) => [conv!, ...prev]);
        setActiveConversation(conv);
      }

      // Add User Message to Firestore
      const userMsgData = {
        userId: currentUser.uid,
        conversationId: conv.id,
        role: 'user' as const,
        content: question,
        createdAt: new Date().toISOString(),
      };
      const userDocRef = await addDoc(
        collection(db, 'tutor_conversations', conv.id, 'messages'),
        userMsgData
      );
      const userMsg: TutorMessage = { id: userDocRef.id, ...userMsgData };
      setMessages((prev) => [...prev, userMsg]);

      // Call Backend Gemini AI Tutor API
      const selectedLecture = lectures.find((l) => l.id === selectedLectureId);

      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          lectureText: selectedLecture?.extractedText || '',
          lectureTitle: selectedLecture?.title || '',
          question,
          conversationHistory: messages.slice(-5),
          language,
        }),
      });

      const data = await response.json();
      const answer = data.success && data.answer ? data.answer : 'An issue occurred while generating the tutor response.';

      // Add Model Message to Firestore
      const modelMsgData = {
        userId: currentUser.uid,
        conversationId: conv.id,
        role: 'model' as const,
        content: answer,
        sourceReferences: mode === 'lecture' ? selectedLecture?.title : undefined,
        createdAt: new Date().toISOString(),
      };
      const modelDocRef = await addDoc(
        collection(db, 'tutor_conversations', conv.id, 'messages'),
        modelMsgData
      );
      const modelMsg: TutorMessage = { id: modelDocRef.id, ...modelMsgData };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Tutor send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLectures = selectedCourseId
    ? lectures.filter((l) => l.courseId === selectedCourseId)
    : lectures;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fadeIn">
      {/* Sidebar: Conversation history & source selector */}
      <div className="w-full md:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col shrink-0 overflow-hidden">
        {/* Source Mode Toggle */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setMode('lecture')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'lecture' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              {t.modeLecture}
            </button>
            <button
              onClick={() => setMode('general')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'general' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              {t.modeGeneral}
            </button>
          </div>

          {/* If Lecture mode, select course and lecture */}
          {mode === 'lecture' && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {t.selectCourse}
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    const matched = lectures.find((l) => l.courseId === e.target.value);
                    if (matched) setSelectedLectureId(matched.id);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-800"
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {t.selectLecture}
                </label>
                <select
                  value={selectedLectureId}
                  onChange={(e) => setSelectedLectureId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-800"
                >
                  {filteredLectures.length === 0 ? (
                    <option value="">No lectures uploaded</option>
                  ) : (
                    filteredLectures.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newChat}</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            History
          </p>
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-400 text-center">No past inquiries yet</p>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition group ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        {/* Tutor Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t.academicTutor}</h2>
              <p className="text-[11px] text-slate-500">
                {mode === 'lecture'
                  ? `Grounded in: ${
                      lectures.find((l) => l.id === selectedLectureId)?.title || 'Selected lecture'
                    }`
                  : 'University-level academic tutor & conceptual guide'}
              </p>
            </div>
          </div>
        </div>

        {/* Message scroll area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="py-12 max-w-md mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {mode === 'lecture' ? 'Ask questions about your lecture' : 'Academic Concept Tutor'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {mode === 'lecture'
                  ? t.selectLecturePrompt
                  : 'Ask for concept explanations, theory comparisons, problem breakdown, or practice checks.'}
              </p>

              {/* Suggested Questions */}
              <div className="text-left space-y-2 pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t.suggestedQuestions}
                </p>
                <button
                  onClick={() => handleSendMessage(t.sq1)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-700 transition text-left"
                >
                  {t.sq1}
                </button>
                <button
                  onClick={() => handleSendMessage(t.sq2)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-700 transition text-left"
                >
                  {t.sq2}
                </button>
                <button
                  onClick={() => handleSendMessage(t.sq3)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-700 transition text-left"
                >
                  {t.sq3}
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.role === 'model' && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                      {msg.sourceReferences ? (
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          <span>Source: {msg.sourceReferences}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 hover:text-slate-800 transition flex items-center gap-1 text-[11px]"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t.copy}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex gap-3 justify-start items-center text-xs text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                <span>Thinking & analyzing lecture source...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.tutorPlaceholder}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shadow-xs"
            >
              <span>{t.send}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
