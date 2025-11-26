import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the API
export interface WordFilters {
  level?: string;
  category?: string;
  search?: string;
  status?: 'new' | 'learning' | 'learned' | 'review';
  limit?: number;
  offset?: number;
}

export interface DailyGoal {
  type: 'time' | 'cards';
  target: number;
  current: number;
}

export interface SessionStats {
  correctAnswers: number;
  wrongAnswers: number;
  xpEarned: number;
  wordsLearned: number;
  timeSpent: number;
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    toggle: () => ipcRenderer.invoke('theme:toggle'),
  },

  // Words database
  words: {
    getAll: (filters?: WordFilters) => ipcRenderer.invoke('db:words:getAll', filters),
    getById: (id: string) => ipcRenderer.invoke('db:words:getById', id),
    search: (query: string) => ipcRenderer.invoke('db:words:search', query),
    getByLevel: (level: string) => ipcRenderer.invoke('db:words:getByLevel', level),
    getByCategory: (category: string) => ipcRenderer.invoke('db:words:getByCategory', category),
    getCategories: () => ipcRenderer.invoke('db:words:getCategories'),
    getLevels: () => ipcRenderer.invoke('db:words:getLevels'),
    getWithProgress: (filters?: WordFilters) => ipcRenderer.invoke('db:words:getWithProgress', filters),
    getStatusCounts: () => ipcRenderer.invoke('db:words:getStatusCounts'),
  },

  // Progress
  progress: {
    get: (wordId: string) => ipcRenderer.invoke('db:progress:get', wordId),
    update: (wordId: string, data: any) => ipcRenderer.invoke('db:progress:update', wordId, data),
    getStats: () => ipcRenderer.invoke('db:progress:getStats'),
    getDailyGoal: () => ipcRenderer.invoke('db:progress:getDailyGoal'),
    updateDailyGoal: (goal: DailyGoal) => ipcRenderer.invoke('db:progress:updateDailyGoal', goal),
  },

  // SRS (Spaced Repetition System)
  srs: {
    getNextWords: (count: number) => ipcRenderer.invoke('srs:getNextWords', count),
    getNewWords: (count: number, level?: string, category?: string) =>
      ipcRenderer.invoke('srs:getNewWords', count, level, category),
    recordAnswer: (wordId: string, quality: number) =>
      ipcRenderer.invoke('srs:recordAnswer', wordId, quality),
    getStats: () => ipcRenderer.invoke('srs:getStats'),
    getDueCount: () => ipcRenderer.invoke('srs:getDueCount'),
  },

  // Gamification
  gamification: {
    getXP: () => ipcRenderer.invoke('gamification:getXP'),
    addXP: (amount: number, source: string) => ipcRenderer.invoke('gamification:addXP', amount, source),
    getStreak: () => ipcRenderer.invoke('gamification:getStreak'),
    updateStreak: () => ipcRenderer.invoke('gamification:updateStreak'),
    getAchievements: () => ipcRenderer.invoke('gamification:getAchievements'),
    checkAchievements: () => ipcRenderer.invoke('gamification:checkAchievements'),
    getLevel: () => ipcRenderer.invoke('gamification:getLevel'),
  },

  // Sessions
  session: {
    start: (type: string) => ipcRenderer.invoke('session:start', type),
    end: (sessionId: string, stats: SessionStats) => ipcRenderer.invoke('session:end', sessionId, stats),
    getHistory: (limit?: number) => ipcRenderer.invoke('session:getHistory', limit),
  },

  // Statistics
  stats: {
    getDaily: (days?: number) => ipcRenderer.invoke('stats:getDaily', days),
    getWeekly: () => ipcRenderer.invoke('stats:getWeekly'),
    getMonthly: () => ipcRenderer.invoke('stats:getMonthly'),
    getOverall: () => ipcRenderer.invoke('stats:getOverall'),
  },

  // Gemini AI
  gemini: {
    setApiKey: (apiKey: string) => ipcRenderer.invoke('gemini:setApiKey', apiKey),
    isConfigured: () => ipcRenderer.invoke('gemini:isConfigured'),
    getMaskedApiKey: () => ipcRenderer.invoke('gemini:getMaskedApiKey'),
    explainWord: (word: string) => ipcRenderer.invoke('gemini:explainWord', word),
    generateExamples: (word: string, count?: number) =>
      ipcRenderer.invoke('gemini:generateExamples', word, count),
    checkGrammar: (text: string) => ipcRenderer.invoke('gemini:checkGrammar', text),
    chat: (messages: any[]) => ipcRenderer.invoke('gemini:chat', messages),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  },

  // Data export/import
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: (data: any) => ipcRenderer.invoke('data:import', data),
  },

  // User profile
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    update: (profile: any) => ipcRenderer.invoke('profile:update', profile),
  },
});
