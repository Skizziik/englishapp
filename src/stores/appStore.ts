import { create } from 'zustand';
import type { UserStats, DailyGoal, Achievement, Settings, UserProfile, Word, ReviewCard } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AppState {
  // User data
  stats: UserStats | null;
  dailyGoal: DailyGoal | null;
  achievements: Achievement[];
  settings: Settings | null;
  profile: UserProfile | null;
  userLevel: { level: number; xp: number; xpForNext: number } | null;
  streak: { current: number; longest: number; lastActivity: string | null } | null;

  // Target language for learning (en = English, it = Italian)
  targetLanguage: 'en' | 'it';

  // Chat history per language (separate for English and Italian)
  chatMessagesEn: ChatMessage[];
  chatMessagesIt: ChatMessage[];

  // Learning state
  currentSession: {
    id: string | null;
    type: string | null;
    startTime: number | null;
    cards: ReviewCard[];
    currentIndex: number;
    correctCount: number;
    wrongCount: number;
    xpEarned: number;
  };

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setStats: (stats: UserStats) => void;
  setDailyGoal: (goal: DailyGoal) => void;
  setAchievements: (achievements: Achievement[]) => void;
  setSettings: (settings: Settings) => void;
  setProfile: (profile: UserProfile) => void;
  setUserLevel: (level: { level: number; xp: number; xpForNext: number }) => void;
  setStreak: (streak: { current: number; longest: number; lastActivity: string | null }) => void;
  setTargetLanguage: (language: 'en' | 'it') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Session actions
  startSession: (type: string, cards: ReviewCard[]) => void;
  nextCard: () => void;
  recordAnswer: (correct: boolean, xp: number) => void;
  endSession: () => { correctCount: number; wrongCount: number; xpEarned: number; timeSpent: number };
  resetSession: () => void;

  // Chat actions (per language)
  addChatMessage: (message: ChatMessage, language: 'en' | 'it') => void;
  clearChatMessages: (language: 'en' | 'it') => void;
  getChatMessages: () => ChatMessage[];

  // Initialize
  initialize: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  stats: null,
  chatMessagesEn: [],
  chatMessagesIt: [],
  dailyGoal: null,
  achievements: [],
  settings: null,
  profile: null,
  userLevel: null,
  streak: null,
  targetLanguage: 'en',
  currentSession: {
    id: null,
    type: null,
    startTime: null,
    cards: [],
    currentIndex: 0,
    correctCount: 0,
    wrongCount: 0,
    xpEarned: 0,
  },
  isLoading: false,
  error: null,

  // Setters
  setStats: (stats) => set({ stats }),
  setDailyGoal: (dailyGoal) => set({ dailyGoal }),
  setAchievements: (achievements) => set({ achievements }),
  setSettings: (settings) => set({ settings }),
  setProfile: (profile) => set({ profile }),
  setUserLevel: (userLevel) => set({ userLevel }),
  setStreak: (streak) => set({ streak }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Session management
  startSession: (type, cards) => {
    set({
      currentSession: {
        id: crypto.randomUUID(),
        type,
        startTime: Date.now(),
        cards,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        xpEarned: 0,
      },
    });
  },

  nextCard: () => {
    const { currentSession } = get();
    if (currentSession.currentIndex < currentSession.cards.length - 1) {
      set({
        currentSession: {
          ...currentSession,
          currentIndex: currentSession.currentIndex + 1,
        },
      });
    }
  },

  recordAnswer: (correct, xp) => {
    const { currentSession } = get();
    set({
      currentSession: {
        ...currentSession,
        correctCount: currentSession.correctCount + (correct ? 1 : 0),
        wrongCount: currentSession.wrongCount + (correct ? 0 : 1),
        xpEarned: currentSession.xpEarned + xp,
      },
    });
  },

  endSession: () => {
    const { currentSession } = get();
    const timeSpent = currentSession.startTime
      ? Math.floor((Date.now() - currentSession.startTime) / 1000)
      : 0;

    return {
      correctCount: currentSession.correctCount,
      wrongCount: currentSession.wrongCount,
      xpEarned: currentSession.xpEarned,
      timeSpent,
    };
  },

  resetSession: () => {
    set({
      currentSession: {
        id: null,
        type: null,
        startTime: null,
        cards: [],
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        xpEarned: 0,
      },
    });
  },

  // Chat management (per language)
  addChatMessage: (message, language) => {
    set((state) => ({
      ...(language === 'en'
        ? { chatMessagesEn: [...state.chatMessagesEn, message] }
        : { chatMessagesIt: [...state.chatMessagesIt, message] }),
    }));
  },

  clearChatMessages: (language) => {
    set(language === 'en' ? { chatMessagesEn: [] } : { chatMessagesIt: [] });
  },

  getChatMessages: () => {
    const state = get();
    return state.targetLanguage === 'en' ? state.chatMessagesEn : state.chatMessagesIt;
  },

  // Initialize app data
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if electronAPI is available
      if (typeof window === 'undefined' || !window.electronAPI) {
        // Development mode - use mock data
        set({
          stats: {
            totalWords: 1000,
            learnedWords: 50,
            learningWords: 30,
            totalXP: 1250,
            currentStreak: 5,
            longestStreak: 12,
            totalTimeSpent: 3600,
            sessionsCompleted: 25,
          },
          dailyGoal: { type: 'cards', target: 50, current: 15 },
          userLevel: { level: 3, xp: 50, xpForNext: 300 },
          streak: { current: 5, longest: 12, lastActivity: new Date().toISOString() },
          profile: {
            id: 1,
            name: 'Пользователь',
            targetLevel: 'B1',
            dailyGoalType: 'cards',
            dailyGoalTarget: 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          settings: {
            theme: 'dark',
            soundEnabled: true,
            notificationsEnabled: true,
            autoPlayAudio: true,
            srsNewCardsPerDay: 20,
            srsReviewCardsPerDay: 100,
            geminiEnabled: false,
            language: 'ru',
          },
          achievements: [],
          isLoading: false,
        });
        return;
      }

      const [stats, dailyGoal, userLevel, streak, profile, settings, achievements] = await Promise.all([
        window.electronAPI.progress.getStats(),
        window.electronAPI.progress.getDailyGoal(),
        window.electronAPI.gamification.getLevel(),
        window.electronAPI.gamification.getStreak(),
        window.electronAPI.profile.get(),
        window.electronAPI.settings.get(),
        window.electronAPI.gamification.getAchievements(),
      ]);

      set({
        stats,
        dailyGoal,
        userLevel,
        streak,
        profile,
        settings,
        achievements,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      set({
        error: 'Не удалось загрузить данные',
        isLoading: false,
      });
    }
  },

  refreshData: async () => {
    try {
      if (!window.electronAPI) return;

      const [stats, dailyGoal, userLevel, streak] = await Promise.all([
        window.electronAPI.progress.getStats(),
        window.electronAPI.progress.getDailyGoal(),
        window.electronAPI.gamification.getLevel(),
        window.electronAPI.gamification.getStreak(),
      ]);

      set({ stats, dailyGoal, userLevel, streak });
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  },
}));
