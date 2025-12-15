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
    getLevels: (targetLanguage?: string) => ipcRenderer.invoke('db:words:getLevels', targetLanguage),
    getWithProgress: (filters?: WordFilters) => ipcRenderer.invoke('db:words:getWithProgress', filters),
    getStatusCounts: (targetLanguage?: string) => ipcRenderer.invoke('db:words:getStatusCounts', targetLanguage),
    delete: (wordId: string) => ipcRenderer.invoke('db:words:delete', wordId),
    update: (wordId: string, data: any) => ipcRenderer.invoke('db:words:update', wordId, data),
    getSources: (targetLanguage?: string) => ipcRenderer.invoke('db:words:getSources', targetLanguage),
  },

  // Progress
  progress: {
    get: (wordId: string) => ipcRenderer.invoke('db:progress:get', wordId),
    update: (wordId: string, data: any) => ipcRenderer.invoke('db:progress:update', wordId, data),
    getStats: (targetLanguage?: string) => ipcRenderer.invoke('db:progress:getStats', targetLanguage),
    getDailyGoal: () => ipcRenderer.invoke('db:progress:getDailyGoal'),
    updateDailyGoal: (goal: DailyGoal) => ipcRenderer.invoke('db:progress:updateDailyGoal', goal),
  },

  // SRS (Spaced Repetition System)
  srs: {
    getNextWords: (count: number, targetLanguage?: string) =>
      ipcRenderer.invoke('srs:getNextWords', count, targetLanguage),
    getNewWords: (count: number, level?: string, category?: string, targetLanguage?: string) =>
      ipcRenderer.invoke('srs:getNewWords', count, level, category, targetLanguage),
    recordAnswer: (wordId: string, quality: number) =>
      ipcRenderer.invoke('srs:recordAnswer', wordId, quality),
    getStats: (targetLanguage?: string) => ipcRenderer.invoke('srs:getStats', targetLanguage),
    getDueCount: (targetLanguage?: string) => ipcRenderer.invoke('srs:getDueCount', targetLanguage),
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
    getDifficultWords: (targetLanguage?: string) => ipcRenderer.invoke('stats:getDifficultWords', targetLanguage),
    getStrongCategories: (targetLanguage?: string) => ipcRenderer.invoke('stats:getStrongCategories', targetLanguage),
    getWeakCategories: (targetLanguage?: string) => ipcRenderer.invoke('stats:getWeakCategories', targetLanguage),
  },

  // Gemini AI
  gemini: {
    setApiKey: (apiKey: string) => ipcRenderer.invoke('gemini:setApiKey', apiKey),
    isConfigured: () => ipcRenderer.invoke('gemini:isConfigured'),
    getMaskedApiKey: () => ipcRenderer.invoke('gemini:getMaskedApiKey'),
    explainWord: (word: string, targetLanguage?: string) => ipcRenderer.invoke('gemini:explainWord', word, targetLanguage),
    generateExamples: (word: string, count?: number, targetLanguage?: string) =>
      ipcRenderer.invoke('gemini:generateExamples', word, count, targetLanguage),
    checkGrammar: (text: string, targetLanguage?: string) => ipcRenderer.invoke('gemini:checkGrammar', text, targetLanguage),
    chat: (messages: any[], targetLanguage?: string) => ipcRenderer.invoke('gemini:chat', messages, targetLanguage),
    getContextSentences: (word: string, targetLanguage?: string) =>
      ipcRenderer.invoke('gemini:getContextSentences', word, targetLanguage),
    getWordInsights: (word: string, targetLanguage?: string) =>
      ipcRenderer.invoke('gemini:getWordInsights', word, targetLanguage),
    analyzeProgress: (stats: any, targetLanguage?: string) =>
      ipcRenderer.invoke('gemini:analyzeProgress', stats, targetLanguage),
    analyzeMistakes: (mistakes: any[], targetLanguage?: string) =>
      ipcRenderer.invoke('gemini:analyzeMistakes', mistakes, targetLanguage),
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

  // Word of the Day
  wordOfDay: {
    get: (targetLanguage?: string) => ipcRenderer.invoke('wordOfDay:get', targetLanguage),
    showNotification: () => ipcRenderer.invoke('wordOfDay:showNotification'),
  },

  // System Tray
  tray: {
    update: () => ipcRenderer.invoke('tray:update'),
    enable: (enabled: boolean) => ipcRenderer.invoke('tray:enable', enabled),
  },

  // Reminders
  reminders: {
    test: () => ipcRenderer.invoke('reminders:test'),
  },

  // YouTube Import
  youtube: {
    import: (url: string, targetLanguage: string) => ipcRenderer.invoke('youtube:import', url, targetLanguage),
    addWords: (words: any[], targetLanguage: string, source?: string) =>
      ipcRenderer.invoke('youtube:addWords', words, targetLanguage, source),
  },

  // Widget
  widget: {
    open: () => ipcRenderer.invoke('widget:open'),
    close: () => ipcRenderer.invoke('widget:close'),
    isOpen: () => ipcRenderer.invoke('widget:isOpen'),
  },

  // Event listeners for IPC events from main process
  onRefreshData: (callback: () => void) => {
    ipcRenderer.on('refresh-data', callback);
    return () => ipcRenderer.removeListener('refresh-data', callback);
  },
});
