import type { Word, WordProgress, UserStats, DailyGoal, Achievement, Session, DailyStats, UserProfile, Settings, Category, Level, ReviewCard } from './index';

interface WordFilters {
  level?: string;
  category?: string;
  search?: string;
  status?: 'new' | 'learning' | 'learned' | 'review';
  limit?: number;
  offset?: number;
}

interface SessionStats {
  wordsCount: number;
  correctCount: number;
  wrongCount: number;
  xpEarned: number;
  timeSpent: number;
}

interface SRSStats {
  dueToday: number;
  newAvailable: number;
  reviewedToday: number;
  correctToday: number;
  wrongToday: number;
}

interface StreakInfo {
  current: number;
  longest: number;
  lastActivity: string | null;
}

interface StreakUpdateResult {
  current: number;
  longest: number;
  extended: boolean;
}

interface UserLevelInfo {
  level: number;
  xp: number;
  xpForNext: number;
}

interface GeminiResponse {
  success: boolean;
  data?: string;
  error?: string;
}

interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };

  theme: {
    get: () => Promise<boolean>;
    toggle: () => Promise<boolean>;
  };

  words: {
    getAll: (filters?: WordFilters) => Promise<Word[]>;
    getById: (id: string) => Promise<Word | null>;
    search: (query: string) => Promise<Word[]>;
    getByLevel: (level: string) => Promise<Word[]>;
    getByCategory: (category: string) => Promise<Word[]>;
    getCategories: () => Promise<Category[]>;
    getLevels: () => Promise<Level[]>;
    getWithProgress: (filters?: WordFilters) => Promise<any[]>;
    getStatusCounts: () => Promise<{ status: string; count: number }[]>;
  };

  progress: {
    get: (wordId: string) => Promise<WordProgress | null>;
    update: (wordId: string, data: Partial<WordProgress>) => Promise<void>;
    getStats: () => Promise<UserStats>;
    getDailyGoal: () => Promise<DailyGoal>;
    updateDailyGoal: (goal: DailyGoal) => Promise<void>;
  };

  srs: {
    getNextWords: (count: number) => Promise<ReviewCard[]>;
    getNewWords: (count: number, level?: string, category?: string) => Promise<ReviewCard[]>;
    recordAnswer: (wordId: string, quality: number) => Promise<{
      nextReview: string;
      interval: number;
      easeFactor: number;
      isGraduated: boolean;
    }>;
    getStats: () => Promise<SRSStats>;
    getDueCount: () => Promise<number>;
  };

  gamification: {
    getXP: () => Promise<number>;
    addXP: (amount: number, source: string) => Promise<number>;
    getStreak: () => Promise<StreakInfo>;
    updateStreak: () => Promise<StreakUpdateResult>;
    getAchievements: () => Promise<Achievement[]>;
    checkAchievements: () => Promise<Achievement[]>;
    getLevel: () => Promise<UserLevelInfo>;
  };

  session: {
    start: (type: string) => Promise<string>;
    end: (sessionId: string, stats: SessionStats) => Promise<void>;
    getHistory: (limit?: number) => Promise<Session[]>;
  };

  stats: {
    getDaily: (days?: number) => Promise<DailyStats[]>;
    getWeekly: () => Promise<DailyStats>;
    getMonthly: () => Promise<DailyStats>;
    getOverall: () => Promise<UserStats>;
  };

  gemini: {
    setApiKey: (apiKey: string) => Promise<boolean>;
    isConfigured: () => Promise<boolean>;
    explainWord: (word: string) => Promise<GeminiResponse>;
    generateExamples: (word: string, count?: number) => Promise<GeminiResponse>;
    checkGrammar: (text: string) => Promise<GeminiResponse>;
    chat: (messages: Array<{ role: 'user' | 'model'; content: string }>) => Promise<GeminiResponse>;
  };

  settings: {
    get: () => Promise<Settings>;
    update: (settings: Partial<Settings>) => Promise<void>;
  };

  data: {
    export: () => Promise<any>;
    import: (data: any) => Promise<boolean>;
  };

  profile: {
    get: () => Promise<UserProfile>;
    update: (profile: Partial<UserProfile>) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
