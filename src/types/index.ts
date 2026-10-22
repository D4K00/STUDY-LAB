export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  language: Language;
  studyStreak: number;
  lastActiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  userId: string;
  name: string;
  code?: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lecture {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  notes: string;
  annotations?: string; // JSON serialized canvas strokes or drawings
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutorConversation {
  id: string;
  userId: string;
  courseId?: string;
  lectureId?: string;
  title: string;
  mode: 'lecture' | 'general';
  createdAt: string;
  updatedAt: string;
}

export interface TutorMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'model';
  content: string;
  sourceReferences?: string;
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  courseId?: string;
  lectureId?: string;
  title: string;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  deckId: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceReference?: string;
  interval: number; // In days for spaced repetition
  repetition: number;
  easeFactor: number;
  dueDate: string;
  lastReviewed?: string;
  state: 'new' | 'learning' | 'review' | 'mastered';
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'boolean' | 'short';
  options?: string[]; // for mcq
  correctAnswer: string;
  explanation: string;
  sourceReference?: string;
}

export interface Quiz {
  id: string;
  userId: string;
  courseId?: string;
  lectureId?: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitMinutes: number;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
  answers: Record<string, { userAnswer: string; isCorrect: boolean; explanation: string }>;
  createdAt: string;
}

export interface PlannerEvent {
  id: string;
  userId: string;
  courseId?: string;
  title: string;
  type: 'task' | 'assignment' | 'session' | 'exam' | 'other';
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  joinCode: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'member';
  displayName: string;
  joinedAt: string;
}
