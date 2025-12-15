import { contextBridge, ipcRenderer } from 'electron';

// Widget API
contextBridge.exposeInMainWorld('widgetAPI', {
  // Window controls
  close: () => ipcRenderer.invoke('widget:close'),
  minimize: () => ipcRenderer.invoke('widget:minimize'),

  // Quiz data
  getWords: (count: number, targetLanguage: string) =>
    ipcRenderer.invoke('widget:getWords', count, targetLanguage),
  getAnswerOptions: (correctTranslation: string, targetLanguage: string) =>
    ipcRenderer.invoke('widget:getAnswerOptions', correctTranslation, targetLanguage),

  // Progress
  recordAnswer: (wordId: string, quality: number) =>
    ipcRenderer.invoke('widget:recordAnswer', wordId, quality),
  addXP: (amount: number) => ipcRenderer.invoke('widget:addXP', amount),

  // SRS stats
  getDueCount: (targetLanguage: string) => ipcRenderer.invoke('srs:getDueCount', targetLanguage),
  getStats: (targetLanguage: string) => ipcRenderer.invoke('srs:getStats', targetLanguage),

  // Gamification
  getStreak: () => ipcRenderer.invoke('gamification:getStreak'),
  updateStreak: () => ipcRenderer.invoke('gamification:updateStreak'),
});
