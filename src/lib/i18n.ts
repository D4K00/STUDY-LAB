import { Language } from '../types/index.ts';

export interface Translations {
  appName: string;
  appTagline: string;
  loginSubtitle: string;
  // Auth
  signIn: string;
  signUp: string;
  continueWithGoogle: string;
  continueWithEmail: string;
  or: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  forgotPassword: string;
  resetPassword: string;
  resetPasswordSent: string;
  needAccount: string;
  alreadyHaveAccount: string;
  verifyEmailNotice: string;
  resendVerification: string;
  verificationSent: string;
  signOut: string;
  // Navigation
  navDashboard: string;
  navLectures: string;
  navTutor: string;
  navFlashcards: string;
  navQuizzes: string;
  navPlanner: string;
  navGroups: string;
  navSettings: string;
  // Dashboard
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  welcomeSub: string;
  studyStreak: string;
  daysStreak: string;
  metricsCourses: string;
  metricsLectures: string;
  metricsPendingTasks: string;
  metricsQuizAvg: string;
  todaysTasks: string;
  noTasksToday: string;
  upcomingExams: string;
  noUpcomingExams: string;
  recentLectures: string;
  noLecturesYet: string;
  quickActions: string;
  actionUploadLecture: string;
  actionCreateFlashcards: string;
  actionGenerateQuiz: string;
  actionAskTutor: string;
  actionAddStudyTask: string;
  // Lectures
  myLectures: string;
  newCourse: string;
  createCourse: string;
  courseName: string;
  courseCode: string;
  courseDescription: string;
  courseColor: string;
  uploadLecture: string;
  dragDropFiles: string;
  supportedFormats: string;
  noCoursesTitle: string;
  noCoursesDesc: string;
  noLecturesTitle: string;
  noLecturesDesc: string;
  processingFile: string;
  ready: string;
  errorProcessing: string;
  notesTab: string;
  documentTab: string;
  stylusTab: string;
  summarizeAI: string;
  explainTutor: string;
  saveNotes: string;
  notesSaved: string;
  deleteLecture: string;
  deleteCourse: string;
  confirmDelete: string;
  pen: string;
  highlighter: string;
  eraser: string;
  clearCanvas: string;
  undo: string;
  redo: string;
  // AI Tutor
  academicTutor: string;
  modeLecture: string;
  modeGeneral: string;
  selectLecturePrompt: string;
  tutorPlaceholder: string;
  send: string;
  copy: string;
  copied: string;
  newChat: string;
  sourceReferences: string;
  suggestedQuestions: string;
  sq1: string;
  sq2: string;
  sq3: string;
  // Flashcards
  myFlashcards: string;
  createDeck: string;
  generateWithAI: string;
  deckTitle: string;
  cardCount: string;
  flipCard: string;
  showAnswer: string;
  again: string;
  hard: string;
  good: string;
  easy: string;
  cardsDue: string;
  mastered: string;
  reviewSession: string;
  sessionComplete: string;
  noFlashcardsTitle: string;
  noFlashcardsDesc: string;
  addCard: string;
  frontPrompt: string;
  backAnswer: string;
  // Quizzes
  myQuizzes: string;
  createQuiz: string;
  quizTitle: string;
  questionsCount: string;
  startQuiz: string;
  submitQuiz: string;
  nextQuestion: string;
  prevQuestion: string;
  timeRemaining: string;
  score: string;
  explanation: string;
  retryQuiz: string;
  createFlashcardsFromMissed: string;
  noQuizzesTitle: string;
  noQuizzesDesc: string;
  selectCourse: string;
  selectLecture: string;
  difficulty: string;
  diffEasy: string;
  diffMedium: string;
  diffHard: string;
  // Planner
  studyPlanner: string;
  addEvent: string;
  monthView: string;
  weekView: string;
  listView: string;
  eventTitle: string;
  eventType: string;
  typeTask: string;
  typeAssignment: string;
  typeSession: string;
  typeExam: string;
  typeOther: string;
  eventDate: string;
  priority: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  aiScheduleGenerator: string;
  targetExamDate: string;
  availableHours: string;
  generatePlan: string;
  planReviewTitle: string;
  acceptPlan: string;
  regeneratePlan: string;
  noEvents: string;
  // Study Groups
  studyGroups: string;
  createGroup: string;
  joinGroup: string;
  groupName: string;
  groupDesc: string;
  joinCode: string;
  enterJoinCode: string;
  members: string;
  leaveGroup: string;
  noGroupsTitle: string;
  noGroupsDesc: string;
  shareNotes: string;
  // Settings
  settings: string;
  languagePref: string;
  theme: string;
  lightMode: string;
  darkMode: string;
  themeDesc: string;
  profileInfo: string;
  saveChanges: string;
  accountSecurity: string;
  deleteAccount: string;
  deleteAccountWarning: string;
  deleteAccountConfirm: string;
  cancel: string;
  save: string;
  delete: string;
  loading: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Study Lab',
    appTagline: 'Academic Workspace',
    loginSubtitle: 'Your personal academic workspace.',
    signIn: 'Sign In',
    signUp: 'Create Account',
    continueWithGoogle: 'Continue with Google',
    continueWithEmail: 'Continue with Email',
    or: 'or',
    email: 'University or Personal Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    displayName: 'Your Name',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Send Reset Link',
    resetPasswordSent: 'Password reset email sent. Please check your inbox.',
    needAccount: "Don't have an account? Sign up",
    alreadyHaveAccount: 'Already have an account? Sign in',
    verifyEmailNotice: 'Please verify your email address to unlock all cloud sync features. Check your inbox.',
    resendVerification: 'Resend Verification Email',
    verificationSent: 'Verification email resent!',
    signOut: 'Sign Out',

    navDashboard: 'Dashboard',
    navLectures: 'Lectures',
    navTutor: 'AI Academy Tutor',
    navFlashcards: 'Smart Flashcards',
    navQuizzes: 'Quizzes',
    navPlanner: 'Study Planner',
    navGroups: 'Study Groups',
    navSettings: 'Settings',

    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    welcomeSub: 'Ready to advance your academic goals today?',
    studyStreak: 'Study Streak',
    daysStreak: 'days',
    metricsCourses: 'Enrolled Courses',
    metricsLectures: 'Uploaded Lectures',
    metricsPendingTasks: 'Pending Tasks',
    metricsQuizAvg: 'Quiz Average',
    todaysTasks: "Today's Tasks",
    noTasksToday: 'No tasks scheduled for today. Enjoy your day or plan ahead!',
    upcomingExams: 'Upcoming Exams & Deadlines',
    noUpcomingExams: 'No upcoming exams recorded.',
    recentLectures: 'Recent Lectures',
    noLecturesYet: 'No lectures uploaded yet. Start by creating a course and uploading your notes.',
    quickActions: 'Quick Actions',
    actionUploadLecture: 'Upload Lecture',
    actionCreateFlashcards: 'Create Flashcards',
    actionGenerateQuiz: 'Generate Quiz',
    actionAskTutor: 'Ask AI Tutor',
    actionAddStudyTask: 'Add Study Task',

    myLectures: 'My Lectures',
    newCourse: '+ New Course',
    createCourse: 'Create Course',
    courseName: 'Course / Subject Name (e.g. Organic Chemistry)',
    courseCode: 'Code (e.g. CHEM 201)',
    courseDescription: 'Optional Course Description',
    courseColor: 'Color Tag',
    uploadLecture: 'Upload Lecture',
    dragDropFiles: 'Click or drag lecture files here to upload',
    supportedFormats: 'Supports PDF, Word (.docx), PowerPoint (.pptx), Text (.txt), and Images',
    noCoursesTitle: 'No Courses Created',
    noCoursesDesc: 'Organize your academic materials by creating your first course.',
    noLecturesTitle: 'No Lectures in this Course',
    noLecturesDesc: 'Upload lecture slides, syllabus, documents, or readings to begin.',
    processingFile: 'Processing document & extracting content...',
    ready: 'Ready',
    errorProcessing: 'Extraction failed. Try another file.',
    notesTab: 'My Notes',
    documentTab: 'Lecture Text',
    stylusTab: 'Handwriting & Stylus Canvas',
    summarizeAI: 'Summarize with AI',
    explainTutor: 'Explain with AI Tutor',
    saveNotes: 'Save Notes',
    notesSaved: 'Notes saved successfully',
    deleteLecture: 'Delete Lecture',
    deleteCourse: 'Delete Course',
    confirmDelete: 'Are you sure? This action cannot be undone.',
    pen: 'Pen',
    highlighter: 'Highlighter',
    eraser: 'Eraser',
    clearCanvas: 'Clear',
    undo: 'Undo',
    redo: 'Redo',

    academicTutor: 'AI Academy Tutor',
    modeLecture: 'Lecture Mode',
    modeGeneral: 'General Academic Mode',
    selectLecturePrompt: 'Select a course and lecture to ask targeted questions grounded in your course materials.',
    tutorPlaceholder: 'Ask an academic question or request a concept breakdown...',
    send: 'Send',
    copy: 'Copy',
    copied: 'Copied to clipboard',
    newChat: 'New Conversation',
    sourceReferences: 'Lecture Source References',
    suggestedQuestions: 'Suggested Inquiries',
    sq1: 'Can you summarize the core thesis of this lecture in 3 bullet points?',
    sq2: 'Explain the most complex concept here using a real-world analogy.',
    sq3: 'What are 3 likely exam questions based on this material?',

    myFlashcards: 'My Flashcards',
    createDeck: '+ Create Deck',
    generateWithAI: 'Generate with AI',
    deckTitle: 'Deck Title',
    cardCount: 'cards',
    flipCard: 'Click to flip',
    showAnswer: 'Show Answer',
    again: 'Again (1d)',
    hard: 'Hard (2d)',
    good: 'Good (4d)',
    easy: 'Easy (7d)',
    cardsDue: 'Due Today',
    mastered: 'Mastered',
    reviewSession: 'Start Review',
    sessionComplete: 'Review complete for now! Great work maintaining your memory curve.',
    noFlashcardsTitle: 'No Flashcard Decks',
    noFlashcardsDesc: 'Create decks manually or generate them from your lectures with AI.',
    addCard: '+ Add Card',
    frontPrompt: 'Front (Question / Prompt)',
    backAnswer: 'Back (Answer / Explanation)',

    myQuizzes: 'Quizzes',
    createQuiz: '+ New Quiz',
    quizTitle: 'Quiz Title',
    questionsCount: 'Questions',
    startQuiz: 'Start Quiz',
    submitQuiz: 'Submit Quiz',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    timeRemaining: 'Time Left',
    score: 'Final Score',
    explanation: 'Explanation & Reference',
    retryQuiz: 'Retry Quiz',
    createFlashcardsFromMissed: 'Create Flashcards from Missed Questions',
    noQuizzesTitle: 'No Quizzes Yet',
    noQuizzesDesc: 'Generate tailored practice quizzes from your uploaded lectures.',
    selectCourse: 'Select Course',
    selectLecture: 'Select Lecture',
    difficulty: 'Difficulty',
    diffEasy: 'Easy',
    diffMedium: 'Medium',
    diffHard: 'Hard',

    studyPlanner: 'Study Planner',
    addEvent: '+ Add Item',
    monthView: 'Month',
    weekView: 'Week',
    listView: 'Agenda',
    eventTitle: 'Item Title',
    eventType: 'Type',
    typeTask: 'Task',
    typeAssignment: 'Assignment',
    typeSession: 'Study Session',
    typeExam: 'Exam',
    typeOther: 'Other',
    eventDate: 'Date',
    priority: 'Priority',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    aiScheduleGenerator: 'AI Study Plan Generator',
    targetExamDate: 'Target Exam / Deadline Date',
    availableHours: 'Available Study Hours per Day',
    generatePlan: 'Generate Proposed Schedule',
    planReviewTitle: 'Review Proposed Study Schedule',
    acceptPlan: 'Accept & Add to Planner',
    regeneratePlan: 'Regenerate',
    noEvents: 'No events or tasks scheduled for this period.',

    studyGroups: 'Study Groups',
    createGroup: '+ Create Group',
    joinGroup: 'Join with Code',
    groupName: 'Group Name',
    groupDesc: 'Group Focus / Subject',
    joinCode: 'Group Join Code',
    enterJoinCode: 'Enter 6-character group code',
    members: 'Members',
    leaveGroup: 'Leave Group',
    noGroupsTitle: 'No Study Groups',
    noGroupsDesc: 'Collaborate with your peers by creating or joining a private study group.',
    shareNotes: 'Share Lecture Notes',

    settings: 'Settings & Account',
    languagePref: 'Preferred Language',
    theme: 'Appearance & Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    themeDesc: 'Choose between a clean light academic look and a focused dark reading theme.',
    profileInfo: 'Profile Information',
    saveChanges: 'Save Changes',
    accountSecurity: 'Account Security',
    deleteAccount: 'Delete Account Permanently',
    deleteAccountWarning: 'This will permanently delete your account, courses, lectures, flashcards, quizzes, planner items, and uploaded notes from Cloud Firestore. This cannot be undone.',
    deleteAccountConfirm: 'Yes, permanently delete my account',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    loading: 'Loading...',
  },
  ar: {
    appName: 'ستادي لاب',
    appTagline: 'مساحتك الأكاديمية',
    loginSubtitle: 'مساحتك الأكاديمية الشخصية للتميز الجامعي.',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب جديد',
    continueWithGoogle: 'المتابعة باستخدام Google',
    continueWithEmail: 'المتابعة بالبريد الإلكتروني',
    or: 'أو',
    email: 'البريد الإلكتروني الجامعي أو الشخصي',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    displayName: 'اسمك الكامل',
    forgotPassword: 'نسيت كلمة المرور؟',
    resetPassword: 'إرسال رابط استعادة المرور',
    resetPasswordSent: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك.',
    needAccount: 'ليس لديك حساب؟ سجّل الآن',
    alreadyHaveAccount: 'لديك حساب بالفعل؟ تسجيل الدخول',
    verifyEmailNotice: 'يرجى تأكيد بريدك الإلكتروني لتفعيل جميع مزامنات السحابة.',
    resendVerification: 'إعادة إرسال رابط التحقق',
    verificationSent: 'تمت إعادة إرسال رابط التحقق!',
    signOut: 'تسجيل الخروج',

    navDashboard: 'لوحة التحكم',
    navLectures: 'المحاضرات',
    navTutor: 'المعلم الأكاديمي الذكي',
    navFlashcards: 'البطاقات التعليمية',
    navQuizzes: 'الاختبارات القصيرة',
    navPlanner: 'مخطط الدراسة',
    navGroups: 'مجموعات الدراسة',
    navSettings: 'الإعدادات',

    goodMorning: 'صباح الخير',
    goodAfternoon: 'مساء الخير',
    goodEvening: 'مساء الخير',
    welcomeSub: 'جاهز لتحقيق أهدافك الأكاديمية اليوم؟',
    studyStreak: 'التتابع اليومي للدراسة',
    daysStreak: 'أيام',
    metricsCourses: 'المساقات المسجلة',
    metricsLectures: 'المحاضرات المرفوعة',
    metricsPendingTasks: 'المهام المعلقة',
    metricsQuizAvg: 'متوسط الاختبارات',
    todaysTasks: 'مهام اليوم',
    noTasksToday: 'لا توجد مهام مجدولة لهذا اليوم. استمتع بوقتك أو خطط مسبقاً!',
    upcomingExams: 'الاختبارات والمواعيد النهائية القادمة',
    noUpcomingExams: 'لا توجد اختبارات قادمة مسجلة.',
    recentLectures: 'أحدث المحاضرات',
    noLecturesYet: 'لم تقم برفع أي محاضرات بعد. ابدأ بإنشاء مساقك الأول.',
    quickActions: 'إجراءات سريعة',
    actionUploadLecture: 'رفع محاضرة',
    actionCreateFlashcards: 'إنشاء بطاقات',
    actionGenerateQuiz: 'توليد اختبار',
    actionAskTutor: 'سؤال المعلم الذكي',
    actionAddStudyTask: 'إضافة مهمة دراسية',

    myLectures: 'محاضراتي الدراسية',
    newCourse: '+ مساق جديد',
    createCourse: 'إنشاء مساق',
    courseName: 'اسم المساق / المادة (مثال: الكيمياء العضوية)',
    courseCode: 'رمز المادة (مثال: كيم ٢٠١)',
    courseDescription: 'وصف اختياري للمساق',
    courseColor: 'لون التمييز',
    uploadLecture: 'رفع محاضرة',
    dragDropFiles: 'انقر أو اسحب ملفات المحاضرة هنا لرفعها',
    supportedFormats: 'يدعم PDF ومستندات Word (.docx) وPowerPoint (.pptx) والنصوص والصور',
    noCoursesTitle: 'لا توجد مساقات دراسية',
    noCoursesDesc: 'نظم موادك الأكاديمية بإنشاء مساقك الأول الآن.',
    noLecturesTitle: 'لا توجد محاضرات في هذا المساق',
    noLecturesDesc: 'ارفع شرائح المحاضرة أو الملخصات للبدء في معالجتها وتحليلها.',
    processingFile: 'جارٍ استخراج المحتوى ومعالجة المستند...',
    ready: 'جاهز للدراسة',
    errorProcessing: 'تعذر استخراج النص. يرجى تجربة ملف آخر.',
    notesTab: 'ملاحظاتي',
    documentTab: 'نص المحاضرة المستخرج',
    stylusTab: 'لوحة الكتابة بالقلم الرقمي',
    summarizeAI: 'تلخيص بالذكاء الاصطناعي',
    explainTutor: 'شرح مع المعلم الذكي',
    saveNotes: 'حفظ الملاحظات',
    notesSaved: 'تم حفظ الملاحظات بنجاح',
    deleteLecture: 'حذف المحاضرة',
    deleteCourse: 'حذف المساق',
    confirmDelete: 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.',
    pen: 'قلم',
    highlighter: 'قلم تمييز',
    eraser: 'ممحاة',
    clearCanvas: 'مسح اللوحة',
    undo: 'تراجع',
    redo: 'إعادة',

    academicTutor: 'المعلم الأكاديمي الذكي',
    modeLecture: 'وضع المحاضرة المحددة',
    modeGeneral: 'وضع المعلم الأكاديمي العام',
    selectLecturePrompt: 'اختر مساقاً ومحاضرة لطرح أسئلة دقيقة مستندة تماماً إلى موادك الدراسية.',
    tutorPlaceholder: 'اطرح سؤالاً أكاديمياً أو اطلب تبسيط مفهوم معقد...',
    send: 'إرسال',
    copy: 'نسخ',
    copied: 'تم النسخ للحافظة',
    newChat: 'محادثة جديدة',
    sourceReferences: 'المراجع ومصادر المحاضرة',
    suggestedQuestions: 'استفسارات مقترحة',
    sq1: 'هل يمكنك تلخيص الأفكار الرئيسية لهذه المحاضرة في ٣ نقاط موجزة؟',
    sq2: 'اشرح أصعب مفهوم في هذا الدرس باستخدام تشبيه من الحياة العملية.',
    sq3: 'ما هي أهم ٣ أسئلة مرشحة للاختبار من هذه المادة؟',

    myFlashcards: 'البطاقات التعليمية الذكية',
    createDeck: '+ إنشاء حزمة بطاقات',
    generateWithAI: 'توليد بالذكاء الاصطناعي',
    deckTitle: 'عنوان حزمة البطاقات',
    cardCount: 'بطاقات',
    flipCard: 'انقر لقلب البطاقة',
    showAnswer: 'إظهار الإجابة',
    again: 'إعادة (يوم)',
    hard: 'صعب (يومان)',
    good: 'جيد (٤ أيام)',
    easy: 'سهل (٧ أيام)',
    cardsDue: 'مستحقة للمراجعة اليوم',
    mastered: 'تم إتقانها',
    reviewSession: 'بدء جلسة المراجعة',
    sessionComplete: 'اكتملت مراجعة اليوم! أحسنت في الحفاظ على منحنى التذكر.',
    noFlashcardsTitle: 'لا توجد حزم بطاقات',
    noFlashcardsDesc: 'أنشئ بطاقاتك يدوياً أو دع الذكاء الاصطناعي يستخرجها من محاضراتك.',
    addCard: '+ إضافة بطاقة',
    frontPrompt: 'الوجه (السؤال أو المفهوم)',
    backAnswer: 'الظهر (الإجابة والشرح)',

    myQuizzes: 'الاختبارات الذكية',
    createQuiz: '+ اختبار جديد',
    quizTitle: 'عنوان الاختبار',
    questionsCount: 'عدد الأسئلة',
    startQuiz: 'بدء الاختبار',
    submitQuiz: 'تسليم الإجابات',
    nextQuestion: 'التالي',
    prevQuestion: 'السابق',
    timeRemaining: 'الوقت المتبقي',
    score: 'النتيجة النهائية',
    explanation: 'الشرح والمصدر المرجعي',
    retryQuiz: 'إعادة الاختبار',
    createFlashcardsFromMissed: 'توليد بطاقات تعليمية من الأسئلة الخاطئة',
    noQuizzesTitle: 'لا توجد اختبارات قصيرة بعد',
    noQuizzesDesc: 'ولّد اختبارات تدريبية واقعية مستخرجة من محاضراتك ومناهجك.',
    selectCourse: 'اختر المساق',
    selectLecture: 'اختر المحاضرة',
    difficulty: 'مستوى الصعوبة',
    diffEasy: 'سهل',
    diffMedium: 'متوسط',
    diffHard: 'متقدم',

    studyPlanner: 'مخطط الدراسة وجدول المذاكرة',
    addEvent: '+ إضافة بند',
    monthView: 'شهري',
    weekView: 'أسبوعي',
    listView: 'جدول الأعمال',
    eventTitle: 'عنوان البند',
    eventType: 'النوع',
    typeTask: 'مهمة',
    typeAssignment: 'واجب دراسي',
    typeSession: 'جلسة مذاكرة',
    typeExam: 'اختبار نهائي / فصلي',
    typeOther: 'أخرى',
    eventDate: 'التاريخ',
    priority: 'الأولوية',
    priorityLow: 'منخفضة',
    priorityMedium: 'متوسطة',
    priorityHigh: 'عالية',
    aiScheduleGenerator: 'مولد جدول المذاكرة بالذكاء الاصطناعي',
    targetExamDate: 'تاريخ الاختبار أو الموعد النهائي',
    availableHours: 'ساعات المذاكرة المتاحة يومياً',
    generatePlan: 'اقتراح خطة المذاكرة',
    planReviewTitle: 'مراجعة جدول المذاكرة المقترح',
    acceptPlan: 'اعتماد وإضافة إلى المخطط',
    regeneratePlan: 'إعادة التوليد',
    noEvents: 'لا توجد فعاليات أو مهام مجدولة لهذه الفترة.',

    studyGroups: 'مجموعات الدراسة',
    createGroup: '+ إنشاء مجموعة',
    joinGroup: 'الانضمام برمز',
    groupName: 'اسم المجموعة',
    groupDesc: 'مجال الدراسة / التخصص',
    joinCode: 'رمز الانضمام',
    enterJoinCode: 'أدخل الرمز المكون من ٦ خانات',
    members: 'الأعضاء',
    leaveGroup: 'مغادرة المجموعة',
    noGroupsTitle: 'لا توجد مجموعات دراسة',
    noGroupsDesc: 'تعاون مع زملائك بإنشاء مجموعة دراسية أو الانضمام لمجموعة خاصة.',
    shareNotes: 'مشاركة ملخص المحاضرة',

    settings: 'الإعدادات والحساب',
    languagePref: 'لغة الواجهة المفضلة',
    theme: 'المظهر والسمة',
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
    themeDesc: 'اختر بين المظهر الأكاديمي الفاتح أو الوضع الليلي الهادئ المريح للقراءة.',
    profileInfo: 'معلومات الحساب الأكاديمي',
    saveChanges: 'حفظ التعديلات',
    accountSecurity: 'أمان الحساب',
    deleteAccount: 'حذف الحساب نهائياً',
    deleteAccountWarning: 'سيؤدي هذا إلى حذف جميع مساقاتك ومحاضراتك وبطاقاتك واختباراتك وملفاتك نهائياً من قاعدة البيانات السحابية. لا يمكن التراجع عن هذا الإجراء.',
    deleteAccountConfirm: 'نعم، احذف حسابي وجميع بياناتي نهائياً',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    loading: 'جارٍ التحميل...',
  },
};
