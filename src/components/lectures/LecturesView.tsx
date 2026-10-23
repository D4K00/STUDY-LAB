import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ActiveTab } from '../layout/AppLayout.tsx';
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
import { Course, Lecture } from '../../types/index.ts';
import { StylusCanvas } from './StylusCanvas.tsx';
import { PDFViewer } from './PDFViewer.tsx';
import { saveLecturePDF } from '../../lib/pdfStorage.ts';
import {
  BookOpen,
  Plus,
  Upload,
  FileText,
  Search,
  Trash2,
  Edit2,
  PenTool,
  Sparkles,
  Bot,
  Layers,
  HelpCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  File,
  X,
  ExternalLink,
} from 'lucide-react';

interface LecturesViewProps {
  onNavigate: (tab: ActiveTab, context?: { courseId?: string; lectureId?: string }) => void;
}

export const LecturesView: React.FC<LecturesViewProps> = ({ onNavigate }) => {
  const { currentUser, language, t } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [activeLectureTab, setActiveLectureTab] = useState<'document' | 'notes' | 'stylus'>('document');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [showCourseModal, setShowCourseModal] = useState<boolean>(false);
  const [courseName, setCourseName] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseDesc, setCourseDesc] = useState<string>('');
  const [courseColor, setCourseColor] = useState<string>('#2563eb');

  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadTargetCourseId, setUploadTargetCourseId] = useState<string>('');
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');

  // AI Summary Modal
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false);
  const [generatingSummary, setGeneratingSummary] = useState<boolean>(false);
  const [currentSummary, setCurrentSummary] = useState<string>('');

  // Personal notes saving
  const [notesContent, setNotesContent] = useState<string>('');
  const [notesSavedNotice, setNotesSavedNotice] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'];

  // Fetch courses and lectures
  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const uid = currentUser.uid;

      const coursesSnap = await getDocs(
        query(collection(db, 'courses'), where('userId', '==', uid))
      );
      const cList: Course[] = [];
      coursesSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as Course));
      setCourses(cList);

      const lecturesSnap = await getDocs(
        query(collection(db, 'lectures'), where('userId', '==', uid))
      );
      const lList: Lecture[] = [];
      lecturesSnap.forEach((d) => lList.push({ id: d.id, ...d.data() } as Lecture));
      setLectures(lList);

      if (cList.length > 0 && !uploadTargetCourseId) {
        setUploadTargetCourseId(cList[0].id);
      }
    } catch (err) {
      console.warn('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Open a lecture
  const handleOpenLecture = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setNotesContent(lecture.notes || '');
    setActiveLectureTab('document');
  };

  // Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !courseName.trim()) return;

    try {
      const newCourseData = {
        userId: currentUser.uid,
        name: courseName.trim(),
        code: courseCode.trim() || undefined,
        description: courseDesc.trim() || undefined,
        color: courseColor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'courses'), newCourseData);
      const created: Course = { id: docRef.id, ...newCourseData };
      setCourses((prev) => [...prev, created]);
      setSelectedCourseId(created.id);
      setUploadTargetCourseId(created.id);

      setCourseName('');
      setCourseCode('');
      setCourseDesc('');
      setShowCourseModal(false);
    } catch (err) {
      console.error('Failed to create course:', err);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      if (selectedCourseId === courseId) setSelectedCourseId('all');
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  // File Upload and Text Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;

    const courseId = uploadTargetCourseId || courses[0]?.id;
    if (!courseId) {
      alert('Please create a course before uploading lectures.');
      return;
    }

    setUploadingFiles(true);
    setUploadStatusMsg(t.processingFile);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const title = file.name.replace(/\.[^/.]+$/, '');
      const fileType = file.type || file.name.split('.').pop() || 'unknown';

      try {
        let extractedText = '';

        // Read as base64 or text
        if (file.name.endsWith('.txt')) {
          extractedText = await file.text();
        } else {
          // Read base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              const b64 = res.split(',')[1];
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Call backend extraction
          const response = await fetch('/api/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileBase64: base64,
            }),
          });

          const data = await response.json();
          if (data.success && data.text) {
            extractedText = data.text;
          } else {
            extractedText = `Extracted notes from ${file.name}.`;
          }
        }

        // Save lecture to Firestore
        const lectureDoc = {
          userId: currentUser.uid,
          courseId,
          title,
          fileName: file.name,
          fileType: file.name.split('.').pop() || 'doc',
          fileSize: file.size,
          extractedText: extractedText.trim(),
          notes: '',
          annotations: '',
          status: 'ready' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'lectures'), lectureDoc);
        try {
          const buffer = await file.arrayBuffer();
          await saveLecturePDF(docRef.id, buffer);
        } catch (dbErr) {
          console.warn('Could not cache PDF in IndexedDB:', dbErr);
        }
        const newLecture: Lecture = { id: docRef.id, ...lectureDoc };
        setLectures((prev) => [newLecture, ...prev]);
      } catch (err: any) {
        console.error('File upload error:', err);
      }
    }

    setUploadingFiles(false);
    setShowUploadModal(false);
    setUploadStatusMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Notes
  const handleSaveNotes = async () => {
    if (!selectedLecture) return;
    try {
      const lectureRef = doc(db, 'lectures', selectedLecture.id);
      await updateDoc(lectureRef, {
        notes: notesContent,
        updatedAt: new Date().toISOString(),
      });
      setSelectedLecture((prev) => (prev ? { ...prev, notes: notesContent } : null));
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2000);
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  // Save Annotations from Stylus Canvas
  const handleSaveAnnotations = async (annotationsJson: string) => {
    if (!selectedLecture) return;
    try {
      const lectureRef = doc(db, 'lectures', selectedLecture.id);
      await updateDoc(lectureRef, {
        annotations: annotationsJson,
        updatedAt: new Date().toISOString(),
      });
      setSelectedLecture((prev) => (prev ? { ...prev, annotations: annotationsJson } : null));
    } catch (err) {
      console.error('Error saving annotations:', err);
    }
  };

  // Generate AI Summary
  const handleGenerateSummary = async () => {
    if (!selectedLecture) return;
    setSummaryModalOpen(true);
    setGeneratingSummary(true);
    setCurrentSummary('');

    try {
      const course = courses.find((c) => c.id === selectedLecture.courseId);
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedLecture.extractedText,
          title: selectedLecture.title,
          courseName: course?.name,
          language,
        }),
      });

      const data = await res.json();
      if (data.success && data.summary) {
        setCurrentSummary(data.summary);
      } else {
        setCurrentSummary('Could not generate summary at this time.');
      }
    } catch (err) {
      setCurrentSummary('An error occurred during AI summarization.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Delete Lecture
  const handleDeleteLecture = async (lectureId: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, 'lectures', lectureId));
      setLectures((prev) => prev.filter((l) => l.id !== lectureId));
      if (selectedLecture?.id === lectureId) setSelectedLecture(null);
    } catch (err) {
      console.error('Failed to delete lecture:', err);
    }
  };

  // Filtered lectures
  const filteredLectures = lectures.filter((l) => {
    const matchesCourse = selectedCourseId === 'all' || l.courseId === selectedCourseId;
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.extractedText && l.extractedText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCourse && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* If a lecture is open, show the Lecture Workspace */}
      {selectedLecture ? (
        <div className="space-y-4 animate-fadeIn">
          {/* Top workspace navigation */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedLecture(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Back to all lectures"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {courses.find((c) => c.id === selectedLecture.courseId)?.name || 'Course'}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{selectedLecture.title}</h2>
              </div>
            </div>

            {/* AI Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGenerateSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.summarizeAI}</span>
              </button>
              <button
                onClick={() =>
                  onNavigate('tutor', {
                    courseId: selectedLecture.courseId,
                    lectureId: selectedLecture.id,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{t.explainTutor}</span>
              </button>
              <button
                onClick={() =>
                  onNavigate('flashcards', {
                    courseId: selectedLecture.courseId,
                    lectureId: selectedLecture.id,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t.navFlashcards}</span>
              </button>
              <button
                onClick={() =>
                  onNavigate('quizzes', {
                    courseId: selectedLecture.courseId,
                    lectureId: selectedLecture.id,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t.navQuizzes}</span>
              </button>
            </div>
          </div>

          {/* Workspace Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-2">
            <button
              onClick={() => setActiveLectureTab('document')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeLectureTab === 'document'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Slides & Annotations</span>
            </button>
            <button
              onClick={() => setActiveLectureTab('notes')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeLectureTab === 'notes'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t.notesTab} & Transcript</span>
            </button>
            <button
              onClick={() => setActiveLectureTab('stylus')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeLectureTab === 'stylus'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Whiteboard Canvas</span>
            </button>
          </div>

          {/* Tab 1: Real PDF Viewer with Page-Specific Annotations */}
          {activeLectureTab === 'document' && (
            <PDFViewer
              lecture={selectedLecture}
              courseName={courses.find((c) => c.id === selectedLecture.courseId)?.name}
              onSaveAnnotations={handleSaveAnnotations}
              onSwitchToNotes={() => setActiveLectureTab('notes')}
            />
          )}

          {/* Tab 2: Notes Editor & Extracted Transcript */}
          {activeLectureTab === 'notes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Personal Notes */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{t.notesTab}</span>
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{notesSavedNotice ? t.notesSaved : t.saveNotes}</span>
                  </button>
                </div>
                <textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Write your personal lecture notes, formulas, questions to ask the professor..."
                  className="w-full h-96 p-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 resize-y font-sans leading-relaxed"
                />
              </div>

              {/* Extracted Document Text */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
                  <span className="font-semibold text-slate-700">Extracted Lecture Transcript</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600">
                    {selectedLecture.fileType.toUpperCase()}
                  </span>
                </div>
                <div className="h-96 overflow-y-auto pr-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans selection:bg-slate-200">
                  {selectedLecture.extractedText || 'No extracted text found in this file.'}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Stylus Canvas */}
          {activeLectureTab === 'stylus' && (
            <StylusCanvas
              initialAnnotations={selectedLecture.annotations}
              onSave={handleSaveAnnotations}
            />
          )}

          {/* AI Summary Modal */}
          {summaryModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{t.summarizeAI}</h3>
                  </div>
                  <button
                    onClick={() => setSummaryModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {generatingSummary ? (
                    <div className="py-12 text-center text-slate-500">
                      <Sparkles className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
                      <p className="text-xs">{t.loading}</p>
                    </div>
                  ) : (
                    currentSummary
                  )}
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSummaryModalOpen(false)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Lectures and Courses Master View */
        <div className="space-y-6 animate-fadeIn">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.myLectures}</h1>
              <p className="text-xs text-slate-500 mt-1">Organize your academic courses and study materials</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCourseModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newCourse}</span>
              </button>
              <button
                onClick={() => {
                  if (courses.length === 0) {
                    setShowCourseModal(true);
                  } else {
                    setShowUploadModal(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{t.uploadLecture}</span>
              </button>
            </div>
          </div>

          {/* Courses Tabs / Filter */}
          {courses.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCourseId('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                  selectedCourseId === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Courses ({lectures.length})
              </button>
              {courses.map((course) => {
                const count = lectures.filter((l) => l.courseId === course.id).length;
                return (
                  <div key={course.id} className="flex items-center shrink-0">
                    <button
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition ${
                        selectedCourseId === course.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: course.color }}
                      />
                      <span>{course.name}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                    {selectedCourseId === course.id && (
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        title={t.deleteCourse}
                        className="p-1 ml-1 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures by title or content keywords..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-2xs"
            />
          </div>

          {/* Lectures List or Zero State */}
          {courses.length === 0 ? (
            /* Clean Empty State: No courses */
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t.noCoursesTitle}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t.noCoursesDesc}</p>
              <button
                onClick={() => setShowCourseModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.createCourse}</span>
              </button>
            </div>
          ) : filteredLectures.length === 0 ? (
            /* Clean Empty State: No lectures in selected course */
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t.noLecturesTitle}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t.noLecturesDesc}</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{t.uploadLecture}</span>
              </button>
            </div>
          ) : (
            /* Lectures Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLectures.map((lecture) => {
                const course = courses.find((c) => c.id === lecture.courseId);
                return (
                  <div
                    key={lecture.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span
                          className="font-semibold text-[11px] px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: course?.color ? `${course.color}15` : '#f1f5f9',
                            color: course?.color || '#334155',
                          }}
                        >
                          {course?.name || 'General'}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {lecture.fileType}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLecture(lecture.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition opacity-0 group-hover:opacity-100"
                            title={t.deleteLecture}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3
                        onClick={() => handleOpenLecture(lecture)}
                        className="text-sm font-bold text-slate-900 hover:text-blue-700 cursor-pointer truncate mb-1"
                      >
                        {lecture.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {lecture.extractedText
                          ? lecture.extractedText.slice(0, 160)
                          : 'Processed lecture document.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {new Date(lecture.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleOpenLecture(lecture)}
                        className="font-semibold text-slate-800 hover:text-slate-900 underline"
                      >
                        Open Workspace →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* New Course Modal */}
          {showCourseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-900 text-base">{t.createCourse}</h3>
                  <button
                    onClick={() => setShowCourseModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.courseName}
                    </label>
                    <input
                      type="text"
                      required
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="e.g. Data Structures & Algorithms"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.courseCode}
                    </label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="e.g. CS 301"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.courseDescription}
                    </label>
                    <textarea
                      value={courseDesc}
                      onChange={(e) => setCourseDesc(e.target.value)}
                      placeholder="Semester objectives, syllabus info..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.courseColor}
                    </label>
                    <div className="flex items-center gap-2">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCourseColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full transition ${
                            courseColor === c ? 'ring-2 ring-slate-800 scale-110' : 'opacity-80'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCourseModal(false)}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      {t.createCourse}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Upload Lecture Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-900 text-base">{t.uploadLecture}</h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Course
                    </label>
                    <select
                      value={uploadTargetCourseId}
                      onChange={(e) => setUploadTargetCourseId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.code ? `(${c.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-800">{t.dragDropFiles}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{t.supportedFormats}</p>
                  </div>

                  {uploadingFiles && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                      <Clock className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                      <span>{uploadStatusMsg || t.processingFile}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
