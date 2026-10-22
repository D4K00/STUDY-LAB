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
import { Course, Lecture, FlashcardDeck, Flashcard } from '../../types/index.ts';
import {
  Layers,
  Plus,
  Sparkles,
  BookOpen,
  RotateCw,
  CheckCircle2,
  Clock,
  Shuffle,
  Trash2,
  X,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface FlashcardsViewProps {
  initialCourseId?: string;
  initialLectureId?: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  initialCourseId,
  initialLectureId,
}) => {
  const { currentUser, language, t } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Study Mode State
  const [isStudying, setIsStudying] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [reviewedInSession, setReviewedInSession] = useState<number>(0);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showCreateDeckModal, setShowCreateDeckModal] = useState<boolean>(false);
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);

  // Generator form fields
  const [genCourseId, setGenCourseId] = useState<string>(initialCourseId || '');
  const [genLectureId, setGenLectureId] = useState<string>(initialLectureId || '');
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [genCount, setGenCount] = useState<number>(10);
  const [generating, setGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Manual Deck / Card Form
  const [newDeckTitle, setNewDeckTitle] = useState<string>('');
  const [newDeckDesc, setNewDeckDesc] = useState<string>('');
  const [newDeckCourseId, setNewDeckCourseId] = useState<string>('');

  const [cardFront, setCardFront] = useState<string>('');
  const [cardBack, setCardBack] = useState<string>('');

  // Fetch all initial data
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

      const dSnap = await getDocs(
        query(collection(db, 'flashcard_decks'), where('userId', '==', uid))
      );
      const dList: FlashcardDeck[] = [];
      dSnap.forEach((d) => dList.push({ id: d.id, ...d.data() } as FlashcardDeck));
      setDecks(dList);

      if (initialLectureId) {
        setGenLectureId(initialLectureId);
        const l = lList.find((item) => item.id === initialLectureId);
        if (l) setGenCourseId(l.courseId);
        setShowGenerateModal(true);
      }
    } catch (err) {
      console.warn('Error fetching decks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Load cards when a deck is opened
  const handleOpenDeck = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    try {
      const cardsSnap = await getDocs(
        query(
          collection(db, 'flashcards'),
          where('userId', '==', currentUser?.uid),
          where('deckId', '==', deck.id)
        )
      );
      const cList: Flashcard[] = [];
      cardsSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as Flashcard));
      setCards(cList);
    } catch (err) {
      console.warn('Error loading cards:', err);
    }
  };

  // Start study session
  const handleStartStudy = () => {
    if (cards.length === 0) return;
    setIsStudying(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setReviewedInSession(0);
  };

  // SM-2 Spaced Repetition Algorithm Rating Handler
  // 1: Again (reset), 2: Hard (short interval), 3: Good (standard), 4: Easy (longer interval)
  const handleRateCard = async (rating: 1 | 2 | 3 | 4) => {
    if (cards.length === 0) return;
    const currentCard = cards[currentCardIndex];

    let interval = currentCard.interval || 1;
    let repetition = currentCard.repetition || 0;
    let easeFactor = currentCard.easeFactor || 2.5;

    if (rating === 1) {
      repetition = 0;
      interval = 1;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = rating === 2 ? 2 : rating === 3 ? 3 : 5;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetition += 1;
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + interval);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    const state: 'learning' | 'review' | 'mastered' =
      rating === 4 && repetition >= 3 ? 'mastered' : rating === 1 ? 'learning' : 'review';

    try {
      const cardRef = doc(db, 'flashcards', currentCard.id);
      await updateDoc(cardRef, {
        interval,
        repetition,
        easeFactor,
        dueDate: dueDateStr,
        lastReviewed: new Date().toISOString(),
        state,
        updatedAt: new Date().toISOString(),
      });

      // Update local card state
      setCards((prev) =>
        prev.map((c) =>
          c.id === currentCard.id
            ? { ...c, interval, repetition, easeFactor, dueDate: dueDateStr, state }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to update card spaced repetition data:', err);
    }

    setReviewedInSession((prev) => prev + 1);
    setIsFlipped(false);

    if (currentCardIndex + 1 < cards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // Completed all cards in deck
      alert(t.sessionComplete);
      setIsStudying(false);
    }
  };

  // AI Flashcard Generation
  const handleGenerateWithAI = async (e: React.FormEvent) => {
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

      const res = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureText: lectureContent,
          lectureTitle: targetLecture.title,
          difficulty: genDifficulty,
          count: genCount,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
        throw new Error(data.error || 'Could not generate valid flashcards. Check lecture content and try again.');
      }

      // Create Deck in Firestore
      const deckDoc = {
        userId: currentUser.uid,
        courseId: targetLecture.courseId || '',
        lectureId: targetLecture.id || '',
        title: `${targetLecture.title} Cards`,
        description: `Generated from ${targetLecture.title} (${genDifficulty})`,
        cardCount: data.cards.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const deckRef = await addDoc(collection(db, 'flashcard_decks'), deckDoc);
      const newDeck: FlashcardDeck = { id: deckRef.id, ...deckDoc };

      // Save each card to Firestore
      const todayStr = new Date().toISOString().split('T')[0];
      const createdCards: Flashcard[] = [];

      for (const c of data.cards) {
        const cardDoc = {
          userId: currentUser.uid,
          deckId: newDeck.id,
          front: c.front || '',
          back: c.back || '',
          difficulty: genDifficulty,
          sourceReference: c.sourceReference || targetLecture.title || '',
          interval: 1,
          repetition: 0,
          easeFactor: 2.5,
          dueDate: todayStr,
          state: 'new' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const cRef = await addDoc(collection(db, 'flashcards'), cardDoc);
        createdCards.push({ id: cRef.id, ...cardDoc });
      }

      setDecks((prev) => [newDeck, ...prev]);
      setSelectedDeck(newDeck);
      setCards(createdCards);
      setShowGenerateModal(false);
    } catch (err: any) {
      console.error('Flashcard AI generation error:', err);
      setGenError(err.message || 'Error generating flashcards');
    } finally {
      setGenerating(false);
    }
  };

  // Create manual deck
  const handleCreateManualDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newDeckTitle.trim()) return;

    try {
      const deckDoc: any = {
        userId: currentUser.uid,
        title: newDeckTitle.trim(),
        cardCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (newDeckCourseId) deckDoc.courseId = newDeckCourseId;
      if (newDeckDesc.trim()) deckDoc.description = newDeckDesc.trim();

      const docRef = await addDoc(collection(db, 'flashcard_decks'), deckDoc);
      const created: FlashcardDeck = { id: docRef.id, ...deckDoc };
      setDecks((prev) => [created, ...prev]);
      setSelectedDeck(created);
      setCards([]);
      setShowCreateDeckModal(false);
      setNewDeckTitle('');
      setNewDeckDesc('');
    } catch (err) {
      console.error('Failed to create manual deck:', err);
    }
  };

  // Add individual card manually
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedDeck || !cardFront.trim() || !cardBack.trim()) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const cardDoc = {
        userId: currentUser.uid,
        deckId: selectedDeck.id,
        front: cardFront.trim(),
        back: cardBack.trim(),
        difficulty: 'medium' as const,
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        dueDate: todayStr,
        state: 'new' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'flashcards'), cardDoc);
      const created: Flashcard = { id: docRef.id, ...cardDoc };
      setCards((prev) => [...prev, created]);

      // Update deck card count
      await updateDoc(doc(db, 'flashcard_decks', selectedDeck.id), {
        cardCount: cards.length + 1,
        updatedAt: new Date().toISOString(),
      });
      setSelectedDeck((prev) => (prev ? { ...prev, cardCount: cards.length + 1 } : null));

      setCardFront('');
      setCardBack('');
      setShowAddCardModal(false);
    } catch (err) {
      console.error('Failed to add card:', err);
    }
  };

  // Delete Deck
  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, 'flashcard_decks', deckId));
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      if (selectedDeck?.id === deckId) {
        setSelectedDeck(null);
        setCards([]);
      }
    } catch (err) {
      console.error('Failed to delete deck:', err);
    }
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* If Studying, show the Study Player */}
      {isStudying && currentCard ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsStudying(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>Back to Deck</span>
            </button>
            <span className="text-xs font-semibold text-slate-400">
              Card {currentCardIndex + 1} of {cards.length}
            </span>
          </div>

          {/* Flashcard 3D Card Flip Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[320px] bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-lg relative selection:bg-transparent"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {isFlipped ? 'Answer / Explanation' : 'Question / Prompt'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <RotateCw className="w-3.5 h-3.5" />
                <span>{t.flipCard}</span>
              </span>
            </div>

            <div className="my-auto py-6 text-center">
              <p
                className={`text-lg md:text-xl font-semibold leading-relaxed ${
                  isFlipped ? 'text-slate-900' : 'text-slate-800'
                }`}
              >
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              {isFlipped && currentCard.sourceReference && (
                <p className="mt-4 text-xs text-slate-400 italic">
                  Source: {currentCard.sourceReference}
                </p>
              )}
            </div>

            <div className="text-center text-[11px] text-slate-400">
              {isFlipped ? 'Rate how well you recalled this concept:' : 'Click card to reveal answer'}
            </div>
          </div>

          {/* SM-2 Spaced Repetition Rating Buttons */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-2 pt-2 animate-fadeIn">
              <button
                onClick={() => handleRateCard(1)}
                className="py-3 px-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex flex-col items-center"
              >
                <span>{t.again}</span>
                <span className="text-[10px] font-normal opacity-80">Reset</span>
              </button>
              <button
                onClick={() => handleRateCard(2)}
                className="py-3 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition flex flex-col items-center"
              >
                <span>{t.hard}</span>
                <span className="text-[10px] font-normal opacity-80">+2 days</span>
              </button>
              <button
                onClick={() => handleRateCard(3)}
                className="py-3 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex flex-col items-center"
              >
                <span>{t.good}</span>
                <span className="text-[10px] font-normal opacity-80">+4 days</span>
              </button>
              <button
                onClick={() => handleRateCard(4)}
                className="py-3 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex flex-col items-center"
              >
                <span>{t.easy}</span>
                <span className="text-[10px] font-normal opacity-80">+7 days</span>
              </button>
            </div>
          )}
        </div>
      ) : selectedDeck ? (
        /* Single Deck Detail / Review List */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDeck(null)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedDeck.title}</h2>
                <p className="text-xs text-slate-500">
                  {cards.length} {t.cardCount} · {cards.filter((c) => c.state === 'mastered').length}{' '}
                  {t.mastered}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCardModal(true)}
                className="px-3.5 py-2 border border-slate-300 bg-white rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-2xs"
              >
                {t.addCard}
              </button>
              <button
                onClick={handleStartStudy}
                disabled={cards.length === 0}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs disabled:opacity-40"
              >
                {t.reviewSession}
              </button>
            </div>
          </div>

          {/* Cards List */}
          {cards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No cards in this deck yet.</p>
              <button
                onClick={() => setShowAddCardModal(true)}
                className="mt-3 text-xs font-semibold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg"
              >
                {t.addCard}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((c, idx) => (
                <div
                  key={c.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-500">Card #{idx + 1}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        c.state === 'mastered'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.state === 'review'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.state}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">Q:</p>
                    <p className="text-sm font-semibold text-slate-900">{c.front}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">A:</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{c.back}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Decks Overview */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.myFlashcards}</h1>
              <p className="text-xs text-slate-500 mt-1">
                Active recall & spaced repetition system for long-term memory
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateDeckModal(true)}
                className="px-3.5 py-2 border border-slate-300 bg-white text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
              >
                {t.createDeck}
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>{t.generateWithAI}</span>
              </button>
            </div>
          </div>

          {/* Decks Grid or Clean Empty State */}
          {decks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t.noFlashcardsTitle}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t.noFlashcardsDesc}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t.generateWithAI}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => handleOpenDeck(deck)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold text-[11px] text-slate-500">
                        {deck.cardCount} {t.cardCount}
                      </span>
                      <button
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                        className="p-1 text-slate-300 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition">
                      {deck.title}
                    </h3>
                    {deck.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {deck.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>Study Deck →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate with AI Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">{t.generateWithAI}</h3>
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

            <form onSubmit={handleGenerateWithAI} className="space-y-4">
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Number of Cards: {genCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
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
                      <span>Extracting Cards...</span>
                    </>
                  ) : (
                    <span>Generate Flashcards</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Manual Deck Modal */}
      {showCreateDeckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t.createDeck}</h3>
              <button
                onClick={() => setShowCreateDeckModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateManualDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.deckTitle}</label>
                <input
                  type="text"
                  required
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Reactions"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Optional Description
                </label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Key mechanisms and reagents..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateDeckModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Card to Deck Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t.addCard}</h3>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.frontPrompt}
                </label>
                <textarea
                  required
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="e.g. What is the SN2 reaction mechanism?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.backAnswer}
                </label>
                <textarea
                  required
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="e.g. A bimolecular nucleophilic substitution occurring in a single concerted step..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
