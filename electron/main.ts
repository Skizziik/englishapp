import type { App, BrowserWindow as BW, IpcMain, NativeTheme, Tray as TrayType, Menu as MenuType, Notification as NotificationType } from 'electron';
const electron = require('electron');
const app: App = electron.app;
const BrowserWindow: typeof BW = electron.BrowserWindow;
const ipcMain: IpcMain = electron.ipcMain;
const nativeTheme: NativeTheme = electron.nativeTheme;
const Tray: typeof TrayType = electron.Tray;
const Menu: typeof MenuType = electron.Menu;
const Notification: typeof NotificationType = electron.Notification;

import * as path from 'path';
import { DatabaseManager } from './database';
import { SRSEngine } from './srs-engine';
import { GeminiService } from './gemini-service';
import { YouTubeImportService, ProcessedWord } from './youtube-import-service';

let mainWindow: BW | null = null;
let widgetWindow: BW | null = null;
let tray: TrayType | null = null;
let database: DatabaseManager;
let srsEngine: SRSEngine;
let geminiService: GeminiService;
let youtubeImportService: YouTubeImportService;
let reminderInterval: NodeJS.Timeout | null = null;
let wordOfDayShown: string | null = null;

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

function createWidget() {
  if (widgetWindow) {
    widgetWindow.focus();
    return;
  }

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  widgetWindow = new BrowserWindow({
    width: 380,
    height: 500,
    minWidth: 320,
    minHeight: 400,
    maxWidth: 500,
    maxHeight: 700,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#1a1a2e',
    skipTaskbar: false,
    resizable: true,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'widget-preload.js'),
    },
  });

  if (isDev) {
    widgetWindow.loadURL('http://localhost:3000/#/widget');
  } else {
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist/renderer/index.html');
    widgetWindow.loadFile(indexPath, { hash: '/widget' });
  }

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

function closeWidget() {
  if (widgetWindow) {
    widgetWindow.close();
    widgetWindow = null;
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('English Learning');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

function updateTrayMenu() {
  if (!tray || !database) return;

  const settings = database.getSettings();
  const wordOfDay = database.getWordOfTheDay(settings?.target_language || 'en');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📖 Слово дня',
      enabled: false,
    },
    {
      label: wordOfDay ? `${wordOfDay.word} - ${wordOfDay.translations[0] || ''}` : 'Загрузка...',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '🎯 Начать тренировку',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', '/learn');
        }
      },
    },
    {
      label: '⚡ Sprint Mode',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', '/sprint');
        }
      },
    },
    {
      label: '📱 Виджет',
      click: () => {
        createWidget();
      },
    },
    { type: 'separator' },
    {
      label: '📊 Статистика',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', '/stats');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Показать приложение',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Выход',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function showWordOfDayNotification() {
  if (!database) return;

  const settings = database.getSettings();
  if (!settings?.word_of_day_notifications) return;

  const today = new Date().toISOString().split('T')[0];
  if (wordOfDayShown === today) return; // Already shown today

  const wordOfDay = database.getWordOfTheDay(settings?.target_language || 'en');
  if (!wordOfDay) return;

  wordOfDayShown = today;

  const notification = new Notification({
    title: '📖 Слово дня',
    body: `${wordOfDay.word} (${wordOfDay.level})\n${wordOfDay.translations.slice(0, 2).join(', ')}`,
    icon: path.join(__dirname, '../public/icon.png'),
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('navigate', '/dictionary');
    }
  });

  notification.show();
}

function showReminderNotification() {
  if (!database) return;

  const settings = database.getSettings();
  if (!settings?.reminder_enabled) return;

  const stats = database.getUserStats();
  const dueCount = srsEngine.getDueReviewCount(settings?.target_language || 'en');

  let body = '';
  if (dueCount > 0) {
    body = `У вас ${dueCount} слов для повторения!`;
  } else {
    body = 'Время изучить новые слова!';
  }

  const notification = new Notification({
    title: '🎯 Время учиться!',
    body: body + `\n🔥 Серия: ${stats.currentStreak} дней`,
    icon: path.join(__dirname, '../public/icon.png'),
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('navigate', '/learn');
    }
  });

  notification.show();
}

function setupReminders() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }

  // Check every minute if it's time for a reminder
  reminderInterval = setInterval(() => {
    if (!database) return;

    const settings = database.getSettings();
    if (!settings?.reminder_enabled) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentTime === settings.reminder_time) {
      showReminderNotification();
    }

    // Show word of the day at 8:00 AM
    if (currentTime === '08:00') {
      showWordOfDayNotification();
    }
  }, 60000); // Check every minute
}

app.whenReady().then(async () => {
  // Initialize database
  database = new DatabaseManager();
  await database.initialize();

  // Initialize SRS Engine
  srsEngine = new SRSEngine(database);

  // Initialize Gemini Service
  geminiService = new GeminiService();

  // Initialize YouTube Import Service
  youtubeImportService = new YouTubeImportService(geminiService, database);

  createWindow();

  // Create system tray
  const settings = database.getSettings();
  if (settings?.tray_enabled !== 0) {
    createTray();
  }

  // Setup reminders
  setupReminders();

  // Show word of the day notification on startup (if enabled)
  setTimeout(() => {
    showWordOfDayNotification();
  }, 5000); // Delay 5 seconds after startup

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

ipcMain.handle('db:words:getLevels', async (_, targetLanguage?: string) => {
  return database.getLevels(targetLanguage || 'en');
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
ipcMain.handle('srs:getNextWords', async (_, count: number, targetLanguage?: string) => {
  return srsEngine.getNextReviewWords(count, targetLanguage || 'en');
});

ipcMain.handle('srs:getNewWords', async (_, count: number, level?: string, category?: string, targetLanguage?: string) => {
  return srsEngine.getNewWordsToLearn(count, level, category, targetLanguage || 'en');
});

ipcMain.handle('srs:recordAnswer', async (_, wordId: string, quality: number) => {
  return srsEngine.recordAnswer(wordId, quality);
});

ipcMain.handle('srs:getStats', async (_, targetLanguage?: string) => {
  return srsEngine.getReviewStats(targetLanguage || 'en');
});

ipcMain.handle('srs:getDueCount', async (_, targetLanguage?: string) => {
  return srsEngine.getDueReviewCount(targetLanguage || 'en');
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

ipcMain.handle('gemini:explainWord', async (_, word: string, targetLanguage?: string) => {
  return geminiService.explainWord(word, targetLanguage);
});

ipcMain.handle('gemini:generateExamples', async (_, word: string, count?: number, targetLanguage?: string) => {
  return geminiService.generateExamples(word, count, targetLanguage);
});

ipcMain.handle('gemini:checkGrammar', async (_, text: string, targetLanguage?: string) => {
  return geminiService.checkGrammar(text, targetLanguage);
});

ipcMain.handle('gemini:chat', async (_, messages: any[], targetLanguage?: string) => {
  return geminiService.chat(messages, targetLanguage);
});

ipcMain.handle('gemini:getContextSentences', async (_, word: string, targetLanguage?: string) => {
  return geminiService.generateContextSentences(word, targetLanguage);
});

ipcMain.handle('gemini:getWordInsights', async (_, word: string, targetLanguage?: string) => {
  return geminiService.getWordInsights(word, targetLanguage);
});

ipcMain.handle('gemini:analyzeProgress', async (_, stats: any, targetLanguage?: string) => {
  return geminiService.analyzeProgress(stats, targetLanguage);
});

ipcMain.handle('gemini:analyzeMistakes', async (_, mistakes: any[], targetLanguage?: string) => {
  return geminiService.analyzeMistakes(mistakes, targetLanguage);
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

// Word of the Day handlers
ipcMain.handle('wordOfDay:get', async (_, targetLanguage?: string) => {
  return database.getWordOfTheDay(targetLanguage || 'en');
});

ipcMain.handle('wordOfDay:showNotification', async () => {
  showWordOfDayNotification();
  return true;
});

// Tray handlers
ipcMain.handle('tray:update', async () => {
  updateTrayMenu();
  return true;
});

ipcMain.handle('tray:enable', async (_, enabled: boolean) => {
  if (enabled && !tray) {
    createTray();
  } else if (!enabled && tray) {
    tray.destroy();
    tray = null;
  }
  return true;
});

// Reminder handlers
ipcMain.handle('reminders:test', async () => {
  showReminderNotification();
  return true;
});

// YouTube Import handlers
ipcMain.handle('youtube:import', async (_, url: string, targetLanguage: string) => {
  return youtubeImportService.importFromYouTube(url, targetLanguage);
});

ipcMain.handle('youtube:addWords', async (_, words: ProcessedWord[], targetLanguage: string, source?: string) => {
  return youtubeImportService.addWordsToDictionary(words, targetLanguage, source || 'youtube');
});

// Word management handlers
ipcMain.handle('db:words:delete', async (_, wordId: string) => {
  return database.deleteWord(wordId);
});

ipcMain.handle('db:words:update', async (_, wordId: string, data: any) => {
  return database.updateWord(wordId, data);
});

ipcMain.handle('db:words:getSources', async (_, targetLanguage?: string) => {
  return database.getSources(targetLanguage || 'en');
});

// Widget handlers
ipcMain.handle('widget:open', async () => {
  createWidget();
  return true;
});

ipcMain.handle('widget:close', async () => {
  closeWidget();
  return true;
});

ipcMain.handle('widget:isOpen', async () => {
  return widgetWindow !== null;
});

ipcMain.handle('widget:minimize', async () => {
  widgetWindow?.minimize();
});

ipcMain.handle('widget:getWords', async (_, count: number, targetLanguage: string) => {
  // Get mix of due words and new words for widget
  const dueWords = srsEngine.getNextReviewWords(Math.ceil(count / 2), targetLanguage);
  const newWords = srsEngine.getNewWordsToLearn(Math.ceil(count / 2), undefined, undefined, targetLanguage);

  // Combine and shuffle
  const allWords = [...dueWords, ...newWords].slice(0, count);
  return allWords.sort(() => Math.random() - 0.5);
});

ipcMain.handle('widget:getAnswerOptions', async (_, correctTranslation: string, targetLanguage: string) => {
  // Get random words for wrong answers
  const allWords = database.getWords({ targetLanguage, limit: 50 });
  const wrongOptions = allWords
    .map(w => {
      const primary = w.translations?.find((t: any) => t.isPrimary);
      return primary?.translation || w.translations?.[0]?.translation || '';
    })
    .filter(t => t && t !== correctTranslation)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // Add correct answer and shuffle
  const options = [...wrongOptions, correctTranslation].sort(() => Math.random() - 0.5);
  return options;
});

ipcMain.handle('widget:recordAnswer', async (_, wordId: string, quality: number) => {
  return srsEngine.recordAnswer(wordId, quality);
});

ipcMain.handle('widget:addXP', async (_, amount: number) => {
  return database.addXP(amount, 'widget');
});
