export interface Topic {
  id: string;
  name: string;
  module: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedTime: number; // in hours
  mastery: number; // 0 to 100
  status: 'Not Started' | 'In Progress' | 'Mastered' | 'Needs Revision';
  lastStudied?: string;
  dependencies: string[]; // IDs of prerequisite topics
  difficulty?: number; // 1 to 5 (Easy to Hard)
  subjectId: string;
  userId: string;
  scheduledDate?: string; // ISO date string
  order: number; // Original entry order
}

export interface Subject {
  id: string;
  name: string;
  examDate: string;
  examTime?: string; // HH:mm format
  dailyHours: number;
  targetScore?: number;
  createdAt: string;
  userId: string;
  feedbackGiven?: boolean;
  graphLayout?: Record<string, { x: number; y: number }>;
}

export interface Module {
  id: string;
  name: string;
  topics: string[]; // Topic IDs
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  college: string;
  bio?: string;
  onboardingCompleted: boolean;
  selectedSubjectId?: string;
  learningPreference: 'adaptive' | 'sequential';
  theme?: 'light' | 'dark' | 'system';
  accentColor?: string;
  createdAt: string;
}

export interface AppState {
  user: UserProfile | null;
  loading: boolean;
  subjects: Subject[];
  selectedSubjectId: string | null;
  learningPreference: 'adaptive' | 'sequential';
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  topics: Topic[];
  modules: Module[];
  rivalProgress: {
    coverage: number;
    mastery: number;
    revision: number;
  };
}

export const MOCK_DATA: AppState = {
  user: null,
  loading: true,
  subjects: [],
  selectedSubjectId: null,
  learningPreference: 'adaptive',
  theme: 'dark',
  accentColor: '#1e9df1',
  modules: [],
  topics: [],
  rivalProgress: {
    coverage: 38,
    mastery: 45,
    revision: 30
  }
};
