import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AppState, MOCK_DATA, UserProfile, Subject, Topic } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where, updateDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';

interface AppContextType {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  setUser: (user: UserProfile | null) => void;
  selectSubject: (subjectId: string | null) => void;
  toggleTopicStatus: (topicId: string) => Promise<void>;
  toggleLearningPreference: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  scheduleTopic: (topicId: string, date: string | null) => Promise<void>;
  updateTopicDifficulty: (topicId: string, difficulty: number) => Promise<void>;
  rebalancePlan: () => Promise<void>;
  updateTopicDependencies: (topicId: string, dependencies: string[]) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  updateSubject: (subjectId: string, data: Partial<Subject>) => Promise<void>;
  saveGraphLayout: (subjectId: string, layout: Record<string, { x: number; y: number }>) => Promise<void>;
  addTopic: (subjectId: string, topic: Omit<Topic, 'id' | 'subjectId' | 'userId'>) => Promise<void>;
  deleteTopic: (subjectId: string, topicId: string) => Promise<void>;
  updateTopic: (topicId: string, data: Partial<Topic>) => Promise<void>;
  moveTopic: (topicId: string, targetTopicId: string) => Promise<void>;
  isTimerEnabled: boolean;
  isTimerRunning: boolean;
  timerElapsedTime: number;
  lastTrackedTimes: number[];
  toggleTimer: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  logTopicTime: (time: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(MOCK_DATA);

  // Timer persistent states
  const [isTimerEnabled, setIsTimerEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('study_timer_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('study_timer_running');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  const [timerStartTime, setTimerStartTime] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('study_timer_start_time');
      if (!saved) return isTimerRunning ? Date.now() : null;
      const parsed = parseInt(saved);
      return isNaN(parsed) ? (isTimerRunning ? Date.now() : null) : parsed;
    } catch (e) {
      return isTimerRunning ? Date.now() : null;
    }
  });
  const [timerElapsedTime, setTimerElapsedTime] = useState<number>(() => {
    try {
      const savedStart = localStorage.getItem('study_timer_start_time');
      const running = localStorage.getItem('study_timer_running') === 'true';
      if (running && savedStart) {
        const start = parseInt(savedStart);
        if (!isNaN(start)) {
          return Math.floor((Date.now() - start) / 1000);
        }
      }
    } catch (e) {
      console.error("Error computing elapsed time:", e);
    }
    return 0;
  });
  const [lastTrackedTimes, setLastTrackedTimes] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('study_timer_last_tracked');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error parsing timer logs:", e);
    }
    return [];
  });

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (isTimerEnabled && isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        setTimerElapsedTime(Math.floor((Date.now() - timerStartTime) / 1000));
      }, 1000);
    } else {
      setTimerElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isTimerEnabled, isTimerRunning, timerStartTime]);

  // Sync timer state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('study_timer_enabled', String(isTimerEnabled));
      localStorage.setItem('study_timer_running', String(isTimerRunning));
      localStorage.setItem('study_timer_start_time', timerStartTime ? String(timerStartTime) : '');
      localStorage.setItem('study_timer_last_tracked', JSON.stringify(lastTrackedTimes));
    } catch (e) {
      // Storage might be blocked or full
    }
  }, [isTimerEnabled, isTimerRunning, timerStartTime, lastTrackedTimes]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'study_timer_enabled' && e.newValue !== null) {
        setIsTimerEnabled(e.newValue === 'true');
      }
      if (e.key === 'study_timer_running' && e.newValue !== null) {
        setIsTimerRunning(e.newValue === 'true');
      }
      if (e.key === 'study_timer_start_time') {
        setTimerStartTime(e.newValue ? parseInt(e.newValue) : null);
      }
      if (e.key === 'study_timer_last_tracked' && e.newValue !== null) {
        setLastTrackedTimes(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTimer = () => {
    setIsTimerEnabled(prev => !prev);
  };

  const startTimer = () => {
    if (!isTimerRunning) {
      setTimerStartTime(Date.now() - (timerElapsedTime * 1000));
      setIsTimerRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerStartTime(isTimerRunning ? Date.now() : null);
    setTimerElapsedTime(0);
  };

  const logTopicTime = (time: number) => {
    setLastTrackedTimes(prev => [...prev, time].slice(-3));
    // Auto-reset for next topic
    setTimerStartTime(Date.now());
    setTimerElapsedTime(0);
  };

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous user listener
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        // Listen to user profile
        unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setState(prev => ({ 
              ...prev, 
              user: userData,
              selectedSubjectId: userData.selectedSubjectId || null,
              learningPreference: userData.learningPreference || 'adaptive',
              theme: userData.theme || 'dark',
              accentColor: userData.accentColor || '#1e9df1',
              loading: false 
            }));
          } else {
            setState(prev => ({ ...prev, loading: false, user: null }));
          }
        }, (error) => {
          console.error("User profile listener error:", error);
          setState(prev => ({ ...prev, loading: false }));
        });
      } else {
        setState(prev => ({ 
          ...prev, 
          user: null, 
          loading: false, 
          subjects: [], 
          selectedSubjectId: null, 
          topics: [],
          modules: []
        }));
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Listen to subjects
  useEffect(() => {
    if (!state.user?.uid) return;

    console.log('Setting up subjects listener for user:', state.user.uid);
    const subjectsQuery = collection(db, 'users', state.user.uid, 'subjects');
    const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
      const subjects = snapshot.docs.map(doc => doc.data() as Subject);
      console.log('Subjects fetched:', subjects.length, subjects);
      setState(prev => ({ ...prev, subjects }));
    }, (error) => {
      console.error('Subjects listener error:', error);
      handleFirestoreError(error, OperationType.GET, `users/${state.user?.uid}/subjects`);
    });

    return () => unsubscribe();
  }, [state.user?.uid]);

  // Listen to topics when a subject is selected
  useEffect(() => {
    if (state.user?.uid && state.selectedSubjectId) {
      const topicsQuery = collection(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics');
      const unsubscribe = onSnapshot(topicsQuery, (snapshot) => {
        const topics = snapshot.docs
          .map(doc => doc.data() as Topic)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Derive modules from topics
        const moduleMap = new Map<string, string[]>();
        topics.forEach(topic => {
          if (!moduleMap.has(topic.module)) {
            moduleMap.set(topic.module, []);
          }
          moduleMap.get(topic.module)!.push(topic.id);
        });

        const modules = Array.from(moduleMap.entries()).map(([name, topicIds]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          topics: topicIds
        }));

        setState(prev => ({ ...prev, topics, modules }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${state.user?.uid}/subjects/${state.selectedSubjectId}/topics`);
      });
      return () => unsubscribe();
    } else {
      setState(prev => ({ ...prev, topics: [], modules: [] }));
    }
  }, [state.user?.uid, state.selectedSubjectId]);

  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme(state.theme);

    // Listen for system theme changes if theme is 'system'
    if (state.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.theme]);

  // Apply accent color
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary', state.accentColor);
    root.style.setProperty('--ring', state.accentColor);
    root.style.setProperty('--sidebar-primary', state.accentColor);
    root.style.setProperty('--sidebar-ring', state.accentColor);
    root.style.setProperty('--accent-foreground', state.accentColor);
    root.style.setProperty('--sidebar-accent-foreground', state.accentColor);
    root.style.setProperty('--chart-1', state.accentColor);
    
    // Also update shadow color
    root.style.setProperty('--shadow-color', `${state.accentColor}26`); 
  }, [state.accentColor]);

  const updateState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const setUser = (user: UserProfile | null) => {
    setState(prev => ({ ...prev, user }));
  };

  const selectSubject = async (subjectId: string | null) => {
    if (state.user) {
      try {
        const userRef = doc(db, 'users', state.user.uid);
        await updateDoc(userRef, { selectedSubjectId: subjectId });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
      }
    }
    setState(prev => ({ ...prev, selectedSubjectId: subjectId }));
  };

  const toggleTopicStatus = async (topicId: string) => {
    if (!state.user || !state.selectedSubjectId) return;
    
    const topic = (state.topics || []).find(t => t.id === topicId);
    if (!topic) return;

    const newStatus = topic.status === 'Mastered' ? 'Not Started' : 'Mastered';
    const newMastery = newStatus === 'Mastered' ? 100 : 0;
    const now = new Date().toISOString();

    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', topicId);
      await updateDoc(topicRef, { 
        status: newStatus,
        mastery: newMastery,
        lastStudied: newStatus === 'Mastered' ? now : (topic.lastStudied || null),
        updatedAt: now
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics/${topicId}`);
    }
  };

  const toggleLearningPreference = async () => {
    if (!state.user) return;
    
    const newPreference = state.learningPreference === 'adaptive' ? 'sequential' : 'adaptive';
    
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, { learningPreference: newPreference });
      setState(prev => ({ ...prev, learningPreference: newPreference }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
    }
  };

  const setTheme = async (theme: 'light' | 'dark' | 'system') => {
    if (state.user) {
      try {
        const userRef = doc(db, 'users', state.user.uid);
        await updateDoc(userRef, { theme });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
      }
    }
    setState(prev => ({ ...prev, theme }));
  };

  const setAccentColor = async (color: string) => {
    if (state.user) {
      try {
        const userRef = doc(db, 'users', state.user.uid);
        await updateDoc(userRef, { accentColor: color });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
      }
    }
    setState(prev => ({ ...prev, accentColor: color }));
  };

  const scheduleTopic = async (topicId: string, date: string | null) => {
    if (!state.user || !state.selectedSubjectId) return;
    
    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', topicId);
      await updateDoc(topicRef, { scheduledDate: date });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics/${topicId}`);
    }
  };

  const updateTopicDifficulty = async (topicId: string, difficulty: number) => {
    if (!state.user || !state.selectedSubjectId) return;
    
    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', topicId);
      await updateDoc(topicRef, { difficulty });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics/${topicId}`);
    }
  };

  const updateTopicDependencies = async (topicId: string, dependencies: string[]) => {
    if (!state.user || !state.selectedSubjectId) return;
    
    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', topicId);
      await updateDoc(topicRef, { dependencies });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics/${topicId}`);
    }
  };

  const rebalancePlan = async () => {
    if (!state.user || !state.selectedSubjectId || (state.topics || []).length === 0) return;
    
    const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);
    if (!selectedSubject) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(selectedSubject.examDate);
    examDate.setHours(0, 0, 0, 0);
    
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExam <= 0) return;

    // Filter unmastered topics and sort based on preference
    const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const unmasteredTopics = [...(state.topics || [])]
      .filter(t => t.status !== 'Mastered')
      .sort((a, b) => {
        if (state.learningPreference === 'sequential') {
          return (a.order || 0) - (b.order || 0);
        }
        return priorityMap[a.priority] - priorityMap[b.priority];
      });

    if (unmasteredTopics.length === 0) return;

    const totalHours = unmasteredTopics.reduce((acc, t) => acc + t.estimatedTime, 0);
    const hoursPerDay = totalHours / daysUntilExam;
    
    let currentDayIndex = 0;
    let currentDayHours = 0;

    const updates = unmasteredTopics.map(topic => {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + currentDayIndex);
      const dateStr = scheduledDate.toISOString().split('T')[0];

      currentDayHours += topic.estimatedTime;
      
      // If we've exceeded the target hours for the day, move to next day
      // but only if we haven't reached the exam date
      if (currentDayHours >= hoursPerDay && currentDayIndex < daysUntilExam - 1) {
        currentDayIndex++;
        currentDayHours = 0;
      }

      return { id: topic.id, scheduledDate: dateStr };
    });

    try {
      // Update each topic in Firestore
      const promises = updates.map(update => {
        const topicRef = doc(db, 'users', state.user!.uid, 'subjects', state.selectedSubjectId!, 'topics', update.id);
        return updateDoc(topicRef, { scheduledDate: update.scheduledDate });
      });
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics`);
    }
  };

  const deleteSubject = async (subjectId: string) => {
    if (!state.user) return;

    try {
      // 1. Delete the subject document
      const subjectRef = doc(db, 'users', state.user.uid, 'subjects', subjectId);
      await deleteDoc(subjectRef);

      // 2. If it was selected, deselect it
      if (state.selectedSubjectId === subjectId) {
        await selectSubject(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${state.user.uid}/subjects/${subjectId}`);
    }
  };

  const updateSubject = async (subjectId: string, data: Partial<Subject>) => {
    if (!state.user) return;

    try {
      const subjectRef = doc(db, 'users', state.user.uid, 'subjects', subjectId);
      const updates = {
        ...data,
        updatedAt: new Date().toISOString()
      } as any;

      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      await updateDoc(subjectRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${subjectId}`);
    }
  };

  const saveGraphLayout = async (subjectId: string, layout: Record<string, { x: number; y: number }>) => {
    if (!state.user) return;

    try {
      const subjectRef = doc(db, 'users', state.user.uid, 'subjects', subjectId);
      await updateDoc(subjectRef, {
        graphLayout: layout,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${subjectId}`);
    }
  };

  const addTopic = async (subjectId: string, topicData: Omit<Topic, 'id' | 'subjectId' | 'userId'>) => {
    if (!state.user) return;

    try {
      const topicsRef = collection(db, 'users', state.user.uid, 'subjects', subjectId, 'topics');
      const newTopicRef = doc(topicsRef);
      const newTopic: Topic = {
        ...topicData,
        id: newTopicRef.id,
        subjectId,
        userId: state.user.uid,
      };
      await setDoc(newTopicRef, newTopic);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${state.user.uid}/subjects/${subjectId}/topics`);
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    if (!state.user) return;

    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', subjectId, 'topics', topicId);
      await deleteDoc(topicRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${state.user.uid}/subjects/${subjectId}/topics/${topicId}`);
    }
  };

  const updateTopic = async (topicId: string, data: Partial<Topic>) => {
    if (!state.user || !state.selectedSubjectId) return;

    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', topicId);
      const updates = { 
        ...data, 
        updatedAt: new Date().toISOString()
      } as any;
      
      if (data.status === 'Mastered') {
        updates.lastStudied = new Date().toISOString();
      }

      // Remove undefined values to avoid Firestore errors
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      await updateDoc(topicRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics/${topicId}`);
    }
  };

  const moveTopic = async (topicId: string, targetTopicId: string) => {
    if (!state.user || !state.selectedSubjectId) return;
    
    const currentTopic = state.topics.find(t => t.id === topicId);
    const targetTopic = state.topics.find(t => t.id === targetTopicId);
    
    if (!currentTopic || !targetTopic) return;
    
    const currentOrder = currentTopic.order || 0;
    const targetOrder = targetTopic.order || 0;
    
    try {
      const batch = writeBatch(db);
      const currentRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', currentTopic.id);
      const targetRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', targetTopic.id);
      
      batch.update(currentRef, { order: targetOrder });
      batch.update(targetRef, { order: currentOrder });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics`);
    }
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      updateState, 
      setUser, 
      selectSubject, 
      toggleTopicStatus, 
      toggleLearningPreference, 
      setTheme, 
      setAccentColor,
      scheduleTopic, 
      updateTopicDifficulty, 
      updateTopicDependencies, 
      rebalancePlan, 
      deleteSubject, 
      updateSubject, 
      saveGraphLayout,
      addTopic,
      deleteTopic,
      updateTopic,
      moveTopic,
      isTimerEnabled,
      isTimerRunning,
      timerElapsedTime,
      lastTrackedTimes,
      toggleTimer,
      startTimer,
      pauseTimer,
      resetTimer,
      logTopicTime
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
