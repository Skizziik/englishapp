import { contextBridge, ipcRenderer } from 'electron';

// Widget API - uses same IPC handlers as main app for consistency
contextBridge.exposeInMainWorld('widgetAPI', {
  // Window controls
  close: () => ipcRenderer.invoke('widget:close'),
  minimize: () => ipcRenderer.invoke('widget:minimize'),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('widget:setAlwaysOnTop', enabled),
  isAlwaysOnTop: () => ipcRenderer.invoke('widget:isAlwaysOnTop'),

  // Quiz data - use same SRS handlers as main app!
  getNextWords: (count: number, targetLanguage: string) =>
    ipcRenderer.invoke('srs:getNextWords', count, targetLanguage),
  getNewWords: (count: number, targetLanguage: string) =>
    ipcRenderer.invoke('srs:getNewWords', count, undefined, undefined, targetLanguage),
  getAnswerOptions: (correctTranslation: string, targetLanguage: string) =>
    ipcRenderer.invoke('widget:getAnswerOptions', correctTranslation, targetLanguage),

  // Progress - use same handlers as main app
  recordAnswer: (wordId: string, quality: number) =>
    ipcRenderer.invoke('srs:recordAnswer', wordId, quality),
  addXP: (amount: number) => ipcRenderer.invoke('gamification:addXP', amount),

  // SRS stats
  getDueCount: (targetLanguage: string) => ipcRenderer.invoke('srs:getDueCount', targetLanguage),
  getStats: (targetLanguage: string) => ipcRenderer.invoke('srs:getStats', targetLanguage),

  // Gamification
  getStreak: () => ipcRenderer.invoke('gamification:getStreak'),
  updateStreak: () => ipcRenderer.invoke('gamification:updateStreak'),

  // Notify main window to refresh data
  notifyMainToRefresh: () => ipcRenderer.invoke('widget:notifyMainToRefresh'),
});
