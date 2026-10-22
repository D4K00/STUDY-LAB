import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { Language, Theme, UserProfile } from '../types/index.ts';
import { translations, Translations } from '../lib/i18n.ts';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  language: Language;
  theme: Theme;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  streak: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('study_lab_lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('study_lab_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const t = translations[language];

  // Update HTML dir and lang attributes on language change
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('study_lab_lang', language);
  }, [language]);

  // Sync theme class on <html> element and persist
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('study_lab_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync or create user profile in Firestore
  const syncProfile = async (user: User, fallbackName?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const todayStr = new Date().toISOString().split('T')[0];

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        // Check daily study streak
        let streak = data.studyStreak || 1;
        if (data.lastActiveDate) {
          const lastDate = new Date(data.lastActiveDate);
          const currentDate = new Date(todayStr);
          const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            streak += 1;
          } else if (diffDays > 1) {
            streak = 1; // reset streak if missed a day
          }
        }

        const updatedProfile: UserProfile = {
          ...data,
          lastActiveDate: todayStr,
          studyStreak: streak,
          displayName: user.displayName || data.displayName || fallbackName || 'Student',
          updatedAt: new Date().toISOString(),
        };

        await updateDoc(userRef, {
          lastActiveDate: todayStr,
          studyStreak: streak,
          displayName: updatedProfile.displayName,
          updatedAt: updatedProfile.updatedAt,
        });

        setUserProfile(updatedProfile);
        if (data.language && (data.language === 'en' || data.language === 'ar')) {
          setLanguageState(data.language);
        }
      } else {
        const newProfile: UserProfile = {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || fallbackName || 'Student',
          language,
          studyStreak: 1,
          lastActiveDate: todayStr,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err);
      // Non-fatal for initial render
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          language: newLang,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to update language on user profile:', err);
      }
    }
  };

  const signInGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncProfile(result.user);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      throw err;
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await syncProfile(cred.user);
    }
  };

  const signUpEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      // Send real email verification
      await sendEmailVerification(cred.user);
      await syncProfile(cred.user, name.trim());
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const updateDisplayName = async (name: string) => {
    if (!currentUser) return;
    await updateProfile(currentUser, { displayName: name.trim() });
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      displayName: name.trim(),
      updatedAt: new Date().toISOString(),
    });
    setUserProfile((prev) => (prev ? { ...prev, displayName: name.trim() } : null));
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await syncProfile(currentUser);
    }
  };

  const deleteAccount = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const token = await currentUser.getIdToken();

    // Call server to clean up all student documents
    try {
      await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: uid }),
      });
    } catch (err) {
      console.warn('Backend cleanup error:', err);
    }

    // Delete user from Firebase Auth
    await deleteUser(currentUser);
    setUserProfile(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        language,
        theme,
        t,
        setLanguage,
        setTheme,
        toggleTheme,
        signInGoogle,
        signInEmail,
        signUpEmail,
        resetPassword,
        resendVerificationEmail,
        signOut,
        deleteAccount,
        updateDisplayName,
        refreshUserProfile,
        streak: userProfile?.studyStreak || 1,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
