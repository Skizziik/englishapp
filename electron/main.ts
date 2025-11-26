import type { App, BrowserWindow as BW, IpcMain, NativeTheme } from 'electron';
const electron = require('electron');
const app: App = electron.app;
const BrowserWindow: typeof BW = electron.BrowserWindow;
const ipcMain: IpcMain = electron.ipcMain;
const nativeTheme: NativeTheme = electron.nativeTheme;

import * as path from 'path';
import { DatabaseManager } from './database';
import { SRSEngine } from './srs-engine';
import { GeminiService } from './gemini-service';

let mainWindow: BW | null = null;
let database: DatabaseManager;
let srsEngine: SRSEngine;
let geminiService: GeminiService;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f23',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from app.asar
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist/renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize database
  database = new DatabaseManager();
  await database.initialize();

  // Initialize SRS Engine
  srsEngine = new SRSEngine(database);

  // Initialize Gemini Service
  geminiService = new GeminiService();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window control handlers
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

// Theme handlers
ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors);
ipcMain.handle('theme:toggle', () => {
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
  return nativeTheme.shouldUseDarkColors;
});

// Database handlers - Words
ipcMain.handle('db:words:getAll', async (_, filters) => {
  return database.getWords(filters);
});

ipcMain.handle('db:words:getById', async (_, id: string) => {
  return database.getWordById(id);
});

ipcMain.handle('db:words:search', async (_, query: string) => {
  return database.searchWords(query);
});

ipcMain.handle('db:words:getByLevel', async (_, level: string) => {
  return database.getWordsByLevel(level);
});

ipcMain.handle('db:words:getByCategory', async (_, category: string) => {
  return database.getWordsByCategory(category);
});

ipcMain.handle('db:words:getCategories', async () => {
  return database.getCategories();
});

ipcMain.handle('db:words:getLevels', async () => {
  return database.getLevels();
});

ipcMain.handle('db:words:getWithProgress', async (_, filters) => {
  return database.getWordsWithProgress(filters);
});

ipcMain.handle('db:words:getStatusCounts', async () => {
  return database.getWordStatusCounts();
});

// User progress handlers
ipcMain.handle('db:progress:get', async (_, wordId: string) => {
  return database.getWordProgress(wordId);
});

ipcMain.handle('db:progress:update', async (_, wordId: string, data: any) => {
  return database.updateWordProgress(wordId, data);
});

ipcMain.handle('db:progress:getStats', async () => {
  return database.getUserStats();
});

ipcMain.handle('db:progress:getDailyGoal', async () => {
  return database.getDailyGoal();
});

ipcMain.handle('db:progress:updateDailyGoal', async (_, goal: any) => {
  return database.updateDailyGoal(goal);
});

// SRS handlers
ipcMain.handle('srs:getNextWords', async (_, count: number) => {
  return srsEngine.getNextReviewWords(count);
});

ipcMain.handle('srs:getNewWords', async (_, count: number, level?: string, category?: string) => {
  return srsEngine.getNewWordsToLearn(count, level, category);
});

ipcMain.handle('srs:recordAnswer', async (_, wordId: string, quality: number) => {
  return srsEngine.recordAnswer(wordId, quality);
});

ipcMain.handle('srs:getStats', async () => {
  return srsEngine.getReviewStats();
});

ipcMain.handle('srs:getDueCount', async () => {
  return srsEngine.getDueReviewCount();
});

// Gamification handlers
ipcMain.handle('gamification:getXP', async () => {
  return database.getTotalXP();
});

ipcMain.handle('gamification:addXP', async (_, amount: number, source: string) => {
  return database.addXP(amount, source);
});

ipcMain.handle('gamification:getStreak', async () => {
  return database.getStreak();
});

ipcMain.handle('gamification:updateStreak', async () => {
  return database.updateStreak();
});

ipcMain.handle('gamification:getAchievements', async () => {
  return database.getAchievements();
});

ipcMain.handle('gamification:checkAchievements', async () => {
  return database.checkAndUnlockAchievements();
});

ipcMain.handle('gamification:getLevel', async () => {
  return database.getUserLevel();
});

// Session handlers
ipcMain.handle('session:start', async (_, type: string) => {
  return database.startSession(type);
});

ipcMain.handle('session:end', async (_, sessionId: string, stats: any) => {
  return database.endSession(sessionId, stats);
});

ipcMain.handle('session:getHistory', async (_, limit?: number) => {
  return database.getSessionHistory(limit);
});

// Statistics handlers
ipcMain.handle('stats:getDaily', async (_, days?: number) => {
  return database.getDailyStats(days);
});

ipcMain.handle('stats:getWeekly', async () => {
  return database.getWeeklyStats();
});

ipcMain.handle('stats:getMonthly', async () => {
  return database.getMonthlyStats();
});

ipcMain.handle('stats:getOverall', async () => {
  return database.getOverallStats();
});

// Gemini AI handlers
ipcMain.handle('gemini:setApiKey', async (_, apiKey: string) => {
  return geminiService.setApiKey(apiKey);
});

ipcMain.handle('gemini:isConfigured', async () => {
  return geminiService.isConfigured();
});

ipcMain.handle('gemini:getMaskedApiKey', async () => {
  return geminiService.getMaskedApiKey();
});

ipcMain.handle('gemini:explainWord', async (_, word: string) => {
  return geminiService.explainWord(word);
});

ipcMain.handle('gemini:generateExamples', async (_, word: string, count?: number) => {
  return geminiService.generateExamples(word, count);
});

ipcMain.handle('gemini:checkGrammar', async (_, text: string) => {
  return geminiService.checkGrammar(text);
});

ipcMain.handle('gemini:chat', async (_, messages: any[]) => {
  return geminiService.chat(messages);
});

// User settings handlers
ipcMain.handle('settings:get', async () => {
  return database.getSettings();
});

ipcMain.handle('settings:update', async (_, settings: any) => {
  return database.updateSettings(settings);
});

// Export/Import handlers
ipcMain.handle('data:export', async () => {
  return database.exportData();
});

ipcMain.handle('data:import', async (_, data: any) => {
  return database.importData(data);
});

// User profile handlers
ipcMain.handle('profile:get', async () => {
  return database.getUserProfile();
});

ipcMain.handle('profile:update', async (_, profile: any) => {
  return database.updateUserProfile(profile);
});
