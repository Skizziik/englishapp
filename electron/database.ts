import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
const { app } = require('electron');
import { v4 as uuidv4 } from 'uuid';

export interface Word {
  id: string;
  word: string;
  transcription: string;
  partOfSpeech: string;
  level: string;
  frequency: number;
  translations: Translation[];
  examples: Example[];
  forms: string[];
  synonyms: string[];
  antonyms: string[];
  tags: string[];
  audioPath?: string;
}

export interface Translation {
  id: string;
  wordId: string;
  translation: string;
  meaning?: string;
  isPrimary: boolean;
}

export interface Example {
  id: string;
  wordId: string;
  english: string;
  russian: string;
  difficulty: number;
}

export interface WordProgress {
  wordId: string;
  status: 'new' | 'learning' | 'learned' | 'review';
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReview?: string;
  correctCount: number;
  wrongCount: number;
}

export interface UserStats {
  totalWords: number;
  learnedWords: number;
  learningWords: number;
  wordsReviewed: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalTimeSpent: number;
  sessionsCompleted: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  unlockedAt?: string;
  progress: number;
  target: number;
}

export class DatabaseManager {
  private db!: Database.Database;
  private dbPath: string = '';

  constructor() {
    // dbPath will be set in initialize() when app is ready
  }

  async initialize(): Promise<void> {
    // Now app is ready, we can use app.getPath
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'english-learning.db');

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createTables();
    await this.seedInitialData();
  }

  private createTables(): void {
    // Words table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS words (
        id TEXT PRIMARY KEY,
        word TEXT NOT NULL,
        transcription TEXT,
        part_of_speech TEXT,
        level TEXT,
        frequency INTEGER DEFAULT 0,
        forms TEXT,
        synonyms TEXT,
        antonyms TEXT,
        audio_path TEXT,
        target_language TEXT DEFAULT 'en',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(word, target_language)
      );
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
      CREATE INDEX IF NOT EXISTS idx_words_level ON words(level);
      CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency);
      CREATE INDEX IF NOT EXISTS idx_words_target_language ON words(target_language);
    `);

    // Translations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS translations (
        id TEXT PRIMARY KEY,
        word_id TEXT NOT NULL,
        translation TEXT NOT NULL,
        meaning TEXT,
        is_primary INTEGER DEFAULT 0,
        FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_translations_word_id ON translations(word_id);
    `);

    // Examples table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS examples (
        id TEXT PRIMARY KEY,
        word_id TEXT NOT NULL,
        english TEXT NOT NULL,
        russian TEXT NOT NULL,
        difficulty INTEGER DEFAULT 1,
        FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_examples_word_id ON examples(word_id);
    `);

    // Tags table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT
      );
    `);

    // Word tags junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS word_tags (
        word_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (word_id, tag_id),
        FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    // User progress table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_progress (
        word_id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'new',
        ease_factor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        next_review TEXT,
        last_review TEXT,
        correct_count INTEGER DEFAULT 0,
        wrong_count INTEGER DEFAULT 0,
        FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_progress_next_review ON user_progress(next_review);
      CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);
    `);

    // User profile table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT DEFAULT 'Пользователь',
        target_level TEXT DEFAULT 'B1',
        daily_goal_type TEXT DEFAULT 'cards',
        daily_goal_target INTEGER DEFAULT 50,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Daily stats table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        words_learned INTEGER DEFAULT 0,
        words_reviewed INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        wrong_answers INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        sessions_count INTEGER DEFAULT 0
      );
    `);

    // XP log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS xp_log (
        id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Streak table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS streak (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_activity_date TEXT,
        streak_freeze_count INTEGER DEFAULT 0
      );
    `);

    // Achievements table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        condition_value INTEGER NOT NULL,
        unlocked_at TEXT,
        progress INTEGER DEFAULT 0
      );
    `);

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        words_count INTEGER DEFAULT 0,
        correct_count INTEGER DEFAULT 0,
        wrong_count INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0
      );
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme TEXT DEFAULT 'dark',
        sound_enabled INTEGER DEFAULT 1,
        notifications_enabled INTEGER DEFAULT 1,
        auto_play_audio INTEGER DEFAULT 1,
        srs_new_cards_per_day INTEGER DEFAULT 20,
        srs_review_cards_per_day INTEGER DEFAULT 100,
        gemini_api_key TEXT,
        gemini_enabled INTEGER DEFAULT 0,
        language TEXT DEFAULT 'ru'
      );
    `);

    // Initialize default records
    this.db.exec(`
      INSERT OR IGNORE INTO user_profile (id) VALUES (1);
      INSERT OR IGNORE INTO streak (id) VALUES (1);
      INSERT OR IGNORE INTO settings (id) VALUES (1);
    `);
  }

  private async seedInitialData(): Promise<void> {
    // Check if we already have data
    const count = this.db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
    if (count.count > 0) return;

    // Seed achievements - General achievements for all languages
    const achievements = [
      // Word milestones
      { id: 'first_word', name: 'Первое слово', description: 'Выучите своё первое слово', icon: '🎯', type: 'words_learned', value: 1 },
      { id: 'words_10', name: 'Начинающий', description: 'Выучите 10 слов', icon: '📚', type: 'words_learned', value: 10 },
      { id: 'words_25', name: 'На пути', description: 'Выучите 25 слов', icon: '🚀', type: 'words_learned', value: 25 },
      { id: 'words_50', name: 'Прилежный ученик', description: 'Выучите 50 слов', icon: '📖', type: 'words_learned', value: 50 },
      { id: 'words_100', name: 'Сотня', description: 'Выучите 100 слов', icon: '💯', type: 'words_learned', value: 100 },
      { id: 'words_250', name: 'Словарный запас', description: 'Выучите 250 слов', icon: '📕', type: 'words_learned', value: 250 },
      { id: 'words_500', name: 'Полиглот', description: 'Выучите 500 слов', icon: '🎓', type: 'words_learned', value: 500 },
      { id: 'words_750', name: 'Эксперт', description: 'Выучите 750 слов', icon: '🧠', type: 'words_learned', value: 750 },
      { id: 'words_1000', name: 'Мастер слов', description: 'Выучите 1000 слов', icon: '👑', type: 'words_learned', value: 1000 },
      { id: 'words_2000', name: 'Лингвист', description: 'Выучите 2000 слов', icon: '🏅', type: 'words_learned', value: 2000 },
      { id: 'words_5000', name: 'Профессор', description: 'Выучите 5000 слов', icon: '🎖️', type: 'words_learned', value: 5000 },

      // Streak achievements
      { id: 'streak_3', name: 'Три дня подряд', description: 'Учитесь 3 дня подряд', icon: '🔥', type: 'streak', value: 3 },
      { id: 'streak_7', name: 'Неделя', description: 'Учитесь 7 дней подряд', icon: '🔥', type: 'streak', value: 7 },
      { id: 'streak_14', name: 'Две недели', description: 'Учитесь 14 дней подряд', icon: '🔥', type: 'streak', value: 14 },
      { id: 'streak_21', name: 'Три недели', description: 'Учитесь 21 день подряд', icon: '🔥', type: 'streak', value: 21 },
      { id: 'streak_30', name: 'Месяц', description: 'Учитесь 30 дней подряд', icon: '🔥', type: 'streak', value: 30 },
      { id: 'streak_60', name: 'Два месяца', description: 'Учитесь 60 дней подряд', icon: '🔥', type: 'streak', value: 60 },
      { id: 'streak_100', name: 'Сто дней', description: 'Учитесь 100 дней подряд', icon: '🏆', type: 'streak', value: 100 },
      { id: 'streak_365', name: 'Год без перерыва', description: 'Учитесь 365 дней подряд', icon: '🌟', type: 'streak', value: 365 },

      // XP achievements
      { id: 'xp_100', name: 'Первая сотня XP', description: 'Заработайте 100 XP', icon: '⭐', type: 'xp', value: 100 },
      { id: 'xp_500', name: 'Полтысячи XP', description: 'Заработайте 500 XP', icon: '⭐', type: 'xp', value: 500 },
      { id: 'xp_1000', name: 'Тысяча XP', description: 'Заработайте 1000 XP', icon: '🌟', type: 'xp', value: 1000 },
      { id: 'xp_5000', name: 'Пять тысяч XP', description: 'Заработайте 5000 XP', icon: '🌟', type: 'xp', value: 5000 },
      { id: 'xp_10000', name: 'Мастер XP', description: 'Заработайте 10000 XP', icon: '💫', type: 'xp', value: 10000 },
      { id: 'xp_25000', name: 'Легенда XP', description: 'Заработайте 25000 XP', icon: '💫', type: 'xp', value: 25000 },
      { id: 'xp_50000', name: 'Титан XP', description: 'Заработайте 50000 XP', icon: '💎', type: 'xp', value: 50000 },

      // Session achievements
      { id: 'perfect_session', name: 'Без ошибок', description: 'Завершите сессию без ошибок', icon: '✨', type: 'perfect_session', value: 1 },
      { id: 'perfect_5', name: 'Пять идеальных', description: 'Завершите 5 сессий без ошибок', icon: '✨', type: 'perfect_sessions', value: 5 },
      { id: 'perfect_10', name: 'Десять идеальных', description: 'Завершите 10 сессий без ошибок', icon: '💎', type: 'perfect_sessions', value: 10 },
      { id: 'sessions_10', name: '10 сессий', description: 'Завершите 10 сессий', icon: '📝', type: 'sessions', value: 10 },
      { id: 'sessions_25', name: '25 сессий', description: 'Завершите 25 сессий', icon: '📝', type: 'sessions', value: 25 },
      { id: 'sessions_50', name: '50 сессий', description: 'Завершите 50 сессий', icon: '📝', type: 'sessions', value: 50 },
      { id: 'sessions_100', name: '100 сессий', description: 'Завершите 100 сессий', icon: '📚', type: 'sessions', value: 100 },
      { id: 'sessions_250', name: '250 сессий', description: 'Завершите 250 сессий', icon: '📚', type: 'sessions', value: 250 },
      { id: 'sessions_500', name: '500 сессий', description: 'Завершите 500 сессий', icon: '🏆', type: 'sessions', value: 500 },

      // English specific achievements
      { id: 'en_first', name: 'Hello, English!', description: 'Выучите первое английское слово', icon: '🇬🇧', type: 'en_words', value: 1 },
      { id: 'en_50', name: 'English Starter', description: 'Выучите 50 английских слов', icon: '🇬🇧', type: 'en_words', value: 50 },
      { id: 'en_100', name: 'English Explorer', description: 'Выучите 100 английских слов', icon: '🇬🇧', type: 'en_words', value: 100 },
      { id: 'en_500', name: 'English Speaker', description: 'Выучите 500 английских слов', icon: '🇬🇧', type: 'en_words', value: 500 },
      { id: 'en_1000', name: 'English Master', description: 'Выучите 1000 английских слов', icon: '🇬🇧', type: 'en_words', value: 1000 },
      { id: 'en_2000', name: 'English Expert', description: 'Выучите 2000 английских слов', icon: '🇬🇧', type: 'en_words', value: 2000 },
      { id: 'en_5000', name: 'English Native', description: 'Выучите 5000 английских слов', icon: '🇬🇧', type: 'en_words', value: 5000 },

      // Italian specific achievements
      { id: 'it_first', name: 'Ciao, Italiano!', description: 'Выучите первое итальянское слово', icon: '🇮🇹', type: 'it_words', value: 1 },
      { id: 'it_50', name: 'Italiano Principiante', description: 'Выучите 50 итальянских слов', icon: '🇮🇹', type: 'it_words', value: 50 },
      { id: 'it_100', name: 'Italiano Esploratore', description: 'Выучите 100 итальянских слов', icon: '🇮🇹', type: 'it_words', value: 100 },
      { id: 'it_500', name: 'Italiano Parlante', description: 'Выучите 500 итальянских слов', icon: '🇮🇹', type: 'it_words', value: 500 },
      { id: 'it_1000', name: 'Italiano Maestro', description: 'Выучите 1000 итальянских слов', icon: '🇮🇹', type: 'it_words', value: 1000 },

      // Time-based achievements
      { id: 'time_1h', name: 'Час обучения', description: 'Проведите 1 час за обучением', icon: '⏰', type: 'time', value: 3600 },
      { id: 'time_5h', name: '5 часов обучения', description: 'Проведите 5 часов за обучением', icon: '⏰', type: 'time', value: 18000 },
      { id: 'time_10h', name: '10 часов обучения', description: 'Проведите 10 часов за обучением', icon: '⏰', type: 'time', value: 36000 },
      { id: 'time_24h', name: 'Сутки обучения', description: 'Проведите 24 часа за обучением', icon: '🕐', type: 'time', value: 86400 },
      { id: 'time_100h', name: '100 часов обучения', description: 'Проведите 100 часов за обучением', icon: '🏆', type: 'time', value: 360000 },

      // Special achievements
      { id: 'bilingual', name: 'Билингв', description: 'Учите оба языка одновременно', icon: '🌍', type: 'bilingual', value: 1 },
      { id: 'night_owl', name: 'Ночная сова', description: 'Учитесь после полуночи', icon: '🦉', type: 'night_study', value: 1 },
      { id: 'early_bird', name: 'Ранняя пташка', description: 'Учитесь до 6 утра', icon: '🐦', type: 'early_study', value: 1 },
      { id: 'weekend_warrior', name: 'Воин выходных', description: 'Учитесь в выходные 5 раз', icon: '⚔️', type: 'weekend_study', value: 5 },
      { id: 'speed_demon', name: 'Скоростной демон', description: 'Ответьте на 20 карточек менее чем за минуту', icon: '⚡', type: 'speed', value: 1 },
      { id: 'comeback_kid', name: 'Возвращение', description: 'Вернитесь к обучению после 7 дней перерыва', icon: '🔄', type: 'comeback', value: 1 },
    ];

    const insertAchievement = this.db.prepare(`
      INSERT OR IGNORE INTO achievements (id, name, description, icon, condition_type, condition_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const achievement of achievements) {
      insertAchievement.run(
        achievement.id,
        achievement.name,
        achievement.description,
        achievement.icon,
        achievement.type,
        achievement.value
      );
    }

    // Seed tags
    const tags = [
      { id: 'everyday', name: 'Повседневная жизнь', category: 'topic' },
      { id: 'travel', name: 'Путешествия', category: 'topic' },
      { id: 'food', name: 'Еда', category: 'topic' },
      { id: 'business', name: 'Бизнес', category: 'topic' },
      { id: 'technology', name: 'Технологии', category: 'topic' },
      { id: 'education', name: 'Образование', category: 'topic' },
      { id: 'health', name: 'Здоровье', category: 'topic' },
      { id: 'sports', name: 'Спорт', category: 'topic' },
      { id: 'entertainment', name: 'Развлечения', category: 'topic' },
      { id: 'nature', name: 'Природа', category: 'topic' },
      { id: 'phrasal_verb', name: 'Фразовый глагол', category: 'type' },
      { id: 'idiom', name: 'Идиома', category: 'type' },
      { id: 'collocation', name: 'Коллокация', category: 'type' },
    ];

    const insertTag = this.db.prepare('INSERT OR IGNORE INTO tags (id, name, category) VALUES (?, ?, ?)');
    for (const tag of tags) {
      insertTag.run(tag.id, tag.name, tag.category);
    }

    // Seed initial words (A1 level basic vocabulary)
    await this.seedWords();
  }

  private async seedWords(): Promise<void> {
    // Load English words (8000+)
    const englishPaths = [
      path.join(process.resourcesPath || '', 'data', 'words-8000.json'),
      path.join(__dirname, '..', '..', 'data', 'words-8000.json'),
      path.join(__dirname, '..', 'data', 'words-8000.json'),
      path.join(process.cwd(), 'data', 'words-8000.json'),
    ];

    // Load Italian words (1000)
    const italianPaths = [
      path.join(process.resourcesPath || '', 'data', 'words-italian.json'),
      path.join(__dirname, '..', '..', 'data', 'words-italian.json'),
      path.join(__dirname, '..', 'data', 'words-italian.json'),
      path.join(process.cwd(), 'data', 'words-italian.json'),
    ];

    console.log('Looking for English words database...');
    for (const jsonPath of englishPaths) {
      if (fs.existsSync(jsonPath)) {
        console.log(`Loading English words from: ${jsonPath}`);
        this.seedWordsFromJson(jsonPath, 'en');
        break;
      }
    }

    console.log('Looking for Italian words database...');
    for (const jsonPath of italianPaths) {
      if (fs.existsSync(jsonPath)) {
        console.log(`Loading Italian words from: ${jsonPath}`);
        this.seedItalianWordsFromJson(jsonPath);
        break;
      }
    }

    // Check if any words were loaded
    const wordCount = this.db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
    if (wordCount.count > 0) {
      console.log(`Total words in database: ${wordCount.count}`);
      return;
    }

    // Fallback to basic vocabulary
    console.log('Using basic vocabulary (external database not found)');
    const wordsData = [
      // A1 Level - Basic
      { word: 'hello', transcription: '/həˈləʊ/', pos: 'interjection', level: 'A1', freq: 100, translations: ['привет', 'здравствуйте'], examples: [{ en: 'Hello! How are you?', ru: 'Привет! Как дела?' }], tags: ['everyday'] },
      { word: 'goodbye', transcription: '/ɡʊdˈbaɪ/', pos: 'interjection', level: 'A1', freq: 99, translations: ['до свидания', 'пока'], examples: [{ en: 'Goodbye! See you tomorrow.', ru: 'До свидания! Увидимся завтра.' }], tags: ['everyday'] },
      { word: 'yes', transcription: '/jes/', pos: 'adverb', level: 'A1', freq: 100, translations: ['да'], examples: [{ en: 'Yes, I agree with you.', ru: 'Да, я согласен с тобой.' }], tags: ['everyday'] },
      { word: 'no', transcription: '/nəʊ/', pos: 'adverb', level: 'A1', freq: 100, translations: ['нет'], examples: [{ en: 'No, thank you.', ru: 'Нет, спасибо.' }], tags: ['everyday'] },
      { word: 'please', transcription: '/pliːz/', pos: 'adverb', level: 'A1', freq: 98, translations: ['пожалуйста'], examples: [{ en: 'Please help me.', ru: 'Пожалуйста, помоги мне.' }], tags: ['everyday'] },
      { word: 'thank', transcription: '/θæŋk/', pos: 'verb', level: 'A1', freq: 97, translations: ['благодарить', 'спасибо'], examples: [{ en: 'Thank you very much!', ru: 'Большое спасибо!' }], tags: ['everyday'] },
      { word: 'sorry', transcription: '/ˈsɒri/', pos: 'adjective', level: 'A1', freq: 96, translations: ['извините', 'простите'], examples: [{ en: 'Sorry, I am late.', ru: 'Извините, я опоздал.' }], tags: ['everyday'] },
      { word: 'name', transcription: '/neɪm/', pos: 'noun', level: 'A1', freq: 95, translations: ['имя', 'название'], examples: [{ en: 'What is your name?', ru: 'Как тебя зовут?' }], tags: ['everyday'] },
      { word: 'water', transcription: '/ˈwɔːtə/', pos: 'noun', level: 'A1', freq: 94, translations: ['вода'], examples: [{ en: 'I need some water.', ru: 'Мне нужна вода.' }], tags: ['food', 'everyday'] },
      { word: 'food', transcription: '/fuːd/', pos: 'noun', level: 'A1', freq: 93, translations: ['еда', 'пища'], examples: [{ en: 'The food is delicious.', ru: 'Еда очень вкусная.' }], tags: ['food'] },
      { word: 'house', transcription: '/haʊs/', pos: 'noun', level: 'A1', freq: 92, translations: ['дом'], examples: [{ en: 'This is my house.', ru: 'Это мой дом.' }], tags: ['everyday'] },
      { word: 'family', transcription: '/ˈfæməli/', pos: 'noun', level: 'A1', freq: 91, translations: ['семья'], examples: [{ en: 'I love my family.', ru: 'Я люблю свою семью.' }], tags: ['everyday'] },
      { word: 'friend', transcription: '/frend/', pos: 'noun', level: 'A1', freq: 90, translations: ['друг'], examples: [{ en: 'She is my best friend.', ru: 'Она моя лучшая подруга.' }], tags: ['everyday'] },
      { word: 'time', transcription: '/taɪm/', pos: 'noun', level: 'A1', freq: 100, translations: ['время'], examples: [{ en: 'What time is it?', ru: 'Который час?' }], tags: ['everyday'] },
      { word: 'day', transcription: '/deɪ/', pos: 'noun', level: 'A1', freq: 99, translations: ['день'], examples: [{ en: 'Have a nice day!', ru: 'Хорошего дня!' }], tags: ['everyday'] },
      { word: 'night', transcription: '/naɪt/', pos: 'noun', level: 'A1', freq: 95, translations: ['ночь'], examples: [{ en: 'Good night!', ru: 'Доброй ночи!' }], tags: ['everyday'] },
      { word: 'morning', transcription: '/ˈmɔːnɪŋ/', pos: 'noun', level: 'A1', freq: 94, translations: ['утро'], examples: [{ en: 'Good morning!', ru: 'Доброе утро!' }], tags: ['everyday'] },
      { word: 'work', transcription: '/wɜːk/', pos: 'noun', level: 'A1', freq: 98, translations: ['работа', 'работать'], examples: [{ en: 'I go to work every day.', ru: 'Я хожу на работу каждый день.' }], tags: ['business', 'everyday'] },
      { word: 'school', transcription: '/skuːl/', pos: 'noun', level: 'A1', freq: 93, translations: ['школа'], examples: [{ en: 'Children go to school.', ru: 'Дети ходят в школу.' }], tags: ['education'] },
      { word: 'book', transcription: '/bʊk/', pos: 'noun', level: 'A1', freq: 92, translations: ['книга'], examples: [{ en: 'I am reading a book.', ru: 'Я читаю книгу.' }], tags: ['education'] },

      // A1 Level - More words
      { word: 'go', transcription: '/ɡəʊ/', pos: 'verb', level: 'A1', freq: 100, translations: ['идти', 'ехать'], examples: [{ en: 'I go to work by bus.', ru: 'Я езжу на работу на автобусе.' }], tags: ['everyday'], forms: ['go', 'goes', 'went', 'gone', 'going'] },
      { word: 'come', transcription: '/kʌm/', pos: 'verb', level: 'A1', freq: 99, translations: ['приходить', 'приезжать'], examples: [{ en: 'Come here, please.', ru: 'Подойди сюда, пожалуйста.' }], tags: ['everyday'], forms: ['come', 'comes', 'came', 'come', 'coming'] },
      { word: 'see', transcription: '/siː/', pos: 'verb', level: 'A1', freq: 98, translations: ['видеть', 'смотреть'], examples: [{ en: 'I see you tomorrow.', ru: 'Увидимся завтра.' }], tags: ['everyday'], forms: ['see', 'sees', 'saw', 'seen', 'seeing'] },
      { word: 'know', transcription: '/nəʊ/', pos: 'verb', level: 'A1', freq: 98, translations: ['знать'], examples: [{ en: 'I know the answer.', ru: 'Я знаю ответ.' }], tags: ['everyday'], forms: ['know', 'knows', 'knew', 'known', 'knowing'] },
      { word: 'want', transcription: '/wɒnt/', pos: 'verb', level: 'A1', freq: 97, translations: ['хотеть'], examples: [{ en: 'I want to eat.', ru: 'Я хочу есть.' }], tags: ['everyday'], forms: ['want', 'wants', 'wanted', 'wanted', 'wanting'] },
      { word: 'think', transcription: '/θɪŋk/', pos: 'verb', level: 'A1', freq: 97, translations: ['думать'], examples: [{ en: 'I think it is a good idea.', ru: 'Я думаю, это хорошая идея.' }], tags: ['everyday'], forms: ['think', 'thinks', 'thought', 'thought', 'thinking'] },
      { word: 'make', transcription: '/meɪk/', pos: 'verb', level: 'A1', freq: 96, translations: ['делать', 'создавать'], examples: [{ en: 'I make breakfast every morning.', ru: 'Я готовлю завтрак каждое утро.' }], tags: ['everyday'], forms: ['make', 'makes', 'made', 'made', 'making'] },
      { word: 'take', transcription: '/teɪk/', pos: 'verb', level: 'A1', freq: 96, translations: ['брать', 'взять'], examples: [{ en: 'Take this book.', ru: 'Возьми эту книгу.' }], tags: ['everyday'], forms: ['take', 'takes', 'took', 'taken', 'taking'] },
      { word: 'give', transcription: '/ɡɪv/', pos: 'verb', level: 'A1', freq: 95, translations: ['давать'], examples: [{ en: 'Give me the pen.', ru: 'Дай мне ручку.' }], tags: ['everyday'], forms: ['give', 'gives', 'gave', 'given', 'giving'] },
      { word: 'find', transcription: '/faɪnd/', pos: 'verb', level: 'A1', freq: 94, translations: ['находить'], examples: [{ en: 'I cannot find my keys.', ru: 'Я не могу найти свои ключи.' }], tags: ['everyday'], forms: ['find', 'finds', 'found', 'found', 'finding'] },

      // A1 - Numbers, Colors, Basic adjectives
      { word: 'one', transcription: '/wʌn/', pos: 'number', level: 'A1', freq: 100, translations: ['один'], examples: [{ en: 'I have one brother.', ru: 'У меня один брат.' }], tags: ['everyday'] },
      { word: 'two', transcription: '/tuː/', pos: 'number', level: 'A1', freq: 100, translations: ['два'], examples: [{ en: 'I have two cats.', ru: 'У меня две кошки.' }], tags: ['everyday'] },
      { word: 'three', transcription: '/θriː/', pos: 'number', level: 'A1', freq: 100, translations: ['три'], examples: [{ en: 'Three plus two is five.', ru: 'Три плюс два равно пять.' }], tags: ['everyday'] },
      { word: 'big', transcription: '/bɪɡ/', pos: 'adjective', level: 'A1', freq: 95, translations: ['большой'], examples: [{ en: 'This is a big house.', ru: 'Это большой дом.' }], tags: ['everyday'] },
      { word: 'small', transcription: '/smɔːl/', pos: 'adjective', level: 'A1', freq: 94, translations: ['маленький'], examples: [{ en: 'I have a small dog.', ru: 'У меня маленькая собака.' }], tags: ['everyday'] },
      { word: 'good', transcription: '/ɡʊd/', pos: 'adjective', level: 'A1', freq: 99, translations: ['хороший'], examples: [{ en: 'This is a good book.', ru: 'Это хорошая книга.' }], tags: ['everyday'] },
      { word: 'bad', transcription: '/bæd/', pos: 'adjective', level: 'A1', freq: 93, translations: ['плохой'], examples: [{ en: 'The weather is bad today.', ru: 'Сегодня плохая погода.' }], tags: ['everyday'] },
      { word: 'new', transcription: '/njuː/', pos: 'adjective', level: 'A1', freq: 97, translations: ['новый'], examples: [{ en: 'I bought a new phone.', ru: 'Я купил новый телефон.' }], tags: ['everyday'] },
      { word: 'old', transcription: '/əʊld/', pos: 'adjective', level: 'A1', freq: 96, translations: ['старый'], examples: [{ en: 'This is an old castle.', ru: 'Это старый замок.' }], tags: ['everyday'] },
      { word: 'red', transcription: '/red/', pos: 'adjective', level: 'A1', freq: 90, translations: ['красный'], examples: [{ en: 'The apple is red.', ru: 'Яблоко красное.' }], tags: ['everyday'] },
      { word: 'blue', transcription: '/bluː/', pos: 'adjective', level: 'A1', freq: 89, translations: ['синий', 'голубой'], examples: [{ en: 'The sky is blue.', ru: 'Небо голубое.' }], tags: ['everyday'] },
      { word: 'green', transcription: '/ɡriːn/', pos: 'adjective', level: 'A1', freq: 88, translations: ['зелёный'], examples: [{ en: 'Grass is green.', ru: 'Трава зелёная.' }], tags: ['nature'] },

      // A2 Level
      { word: 'beautiful', transcription: '/ˈbjuːtɪfl/', pos: 'adjective', level: 'A2', freq: 85, translations: ['красивый', 'прекрасный'], examples: [{ en: 'What a beautiful sunset!', ru: 'Какой красивый закат!' }], tags: ['everyday'] },
      { word: 'important', transcription: '/ɪmˈpɔːtnt/', pos: 'adjective', level: 'A2', freq: 90, translations: ['важный'], examples: [{ en: 'This is an important meeting.', ru: 'Это важная встреча.' }], tags: ['business'] },
      { word: 'different', transcription: '/ˈdɪfrənt/', pos: 'adjective', level: 'A2', freq: 88, translations: ['разный', 'отличающийся'], examples: [{ en: 'We have different opinions.', ru: 'У нас разные мнения.' }], tags: ['everyday'] },
      { word: 'problem', transcription: '/ˈprɒbləm/', pos: 'noun', level: 'A2', freq: 92, translations: ['проблема'], examples: [{ en: 'No problem!', ru: 'Без проблем!' }], tags: ['everyday'] },
      { word: 'question', transcription: '/ˈkwestʃən/', pos: 'noun', level: 'A2', freq: 91, translations: ['вопрос'], examples: [{ en: 'Can I ask a question?', ru: 'Можно задать вопрос?' }], tags: ['education'] },
      { word: 'answer', transcription: '/ˈɑːnsə/', pos: 'noun', level: 'A2', freq: 90, translations: ['ответ'], examples: [{ en: 'I know the answer.', ru: 'Я знаю ответ.' }], tags: ['education'] },
      { word: 'example', transcription: '/ɪɡˈzɑːmpl/', pos: 'noun', level: 'A2', freq: 85, translations: ['пример'], examples: [{ en: 'For example, I like reading.', ru: 'Например, я люблю читать.' }], tags: ['education'] },
      { word: 'country', transcription: '/ˈkʌntri/', pos: 'noun', level: 'A2', freq: 88, translations: ['страна'], examples: [{ en: 'Russia is a big country.', ru: 'Россия — большая страна.' }], tags: ['travel'] },
      { word: 'city', transcription: '/ˈsɪti/', pos: 'noun', level: 'A2', freq: 87, translations: ['город'], examples: [{ en: 'Moscow is a beautiful city.', ru: 'Москва — красивый город.' }], tags: ['travel'] },
      { word: 'money', transcription: '/ˈmʌni/', pos: 'noun', level: 'A2', freq: 92, translations: ['деньги'], examples: [{ en: 'I need more money.', ru: 'Мне нужно больше денег.' }], tags: ['business'] },
      { word: 'understand', transcription: '/ˌʌndəˈstænd/', pos: 'verb', level: 'A2', freq: 89, translations: ['понимать'], examples: [{ en: 'I understand you.', ru: 'Я понимаю тебя.' }], tags: ['everyday'], forms: ['understand', 'understands', 'understood', 'understood', 'understanding'] },
      { word: 'believe', transcription: '/bɪˈliːv/', pos: 'verb', level: 'A2', freq: 85, translations: ['верить'], examples: [{ en: 'I believe in you.', ru: 'Я верю в тебя.' }], tags: ['everyday'], forms: ['believe', 'believes', 'believed', 'believed', 'believing'] },
      { word: 'remember', transcription: '/rɪˈmembə/', pos: 'verb', level: 'A2', freq: 86, translations: ['помнить'], examples: [{ en: 'I remember your name.', ru: 'Я помню твоё имя.' }], tags: ['everyday'], forms: ['remember', 'remembers', 'remembered', 'remembered', 'remembering'] },
      { word: 'forget', transcription: '/fəˈɡet/', pos: 'verb', level: 'A2', freq: 84, translations: ['забывать'], examples: [{ en: 'Don\'t forget your keys.', ru: 'Не забудь свои ключи.' }], tags: ['everyday'], forms: ['forget', 'forgets', 'forgot', 'forgotten', 'forgetting'] },
      { word: 'learn', transcription: '/lɜːn/', pos: 'verb', level: 'A2', freq: 88, translations: ['учить', 'изучать'], examples: [{ en: 'I want to learn English.', ru: 'Я хочу учить английский.' }], tags: ['education'], forms: ['learn', 'learns', 'learned', 'learned', 'learning'] },
      { word: 'study', transcription: '/ˈstʌdi/', pos: 'verb', level: 'A2', freq: 87, translations: ['учиться', 'изучать'], examples: [{ en: 'I study at university.', ru: 'Я учусь в университете.' }], tags: ['education'], forms: ['study', 'studies', 'studied', 'studied', 'studying'] },
      { word: 'travel', transcription: '/ˈtrævl/', pos: 'verb', level: 'A2', freq: 83, translations: ['путешествовать'], examples: [{ en: 'I love to travel.', ru: 'Я люблю путешествовать.' }], tags: ['travel'], forms: ['travel', 'travels', 'traveled', 'traveled', 'traveling'] },
      { word: 'weather', transcription: '/ˈweðə/', pos: 'noun', level: 'A2', freq: 82, translations: ['погода'], examples: [{ en: 'The weather is nice today.', ru: 'Сегодня хорошая погода.' }], tags: ['nature'] },
      { word: 'often', transcription: '/ˈɒfn/', pos: 'adverb', level: 'A2', freq: 86, translations: ['часто'], examples: [{ en: 'I often read books.', ru: 'Я часто читаю книги.' }], tags: ['everyday'] },
      { word: 'sometimes', transcription: '/ˈsʌmtaɪmz/', pos: 'adverb', level: 'A2', freq: 85, translations: ['иногда'], examples: [{ en: 'Sometimes I go swimming.', ru: 'Иногда я хожу плавать.' }], tags: ['everyday'] },

      // B1 Level
      { word: 'experience', transcription: '/ɪkˈspɪəriəns/', pos: 'noun', level: 'B1', freq: 82, translations: ['опыт', 'впечатление'], examples: [{ en: 'I have five years of experience.', ru: 'У меня пять лет опыта.' }], tags: ['business'] },
      { word: 'opportunity', transcription: '/ˌɒpəˈtjuːnəti/', pos: 'noun', level: 'B1', freq: 78, translations: ['возможность'], examples: [{ en: 'This is a great opportunity.', ru: 'Это отличная возможность.' }], tags: ['business'] },
      { word: 'situation', transcription: '/ˌsɪtʃuˈeɪʃn/', pos: 'noun', level: 'B1', freq: 80, translations: ['ситуация'], examples: [{ en: 'It is a difficult situation.', ru: 'Это сложная ситуация.' }], tags: ['everyday'] },
      { word: 'decision', transcription: '/dɪˈsɪʒn/', pos: 'noun', level: 'B1', freq: 79, translations: ['решение'], examples: [{ en: 'I made an important decision.', ru: 'Я принял важное решение.' }], tags: ['business'] },
      { word: 'relationship', transcription: '/rɪˈleɪʃnʃɪp/', pos: 'noun', level: 'B1', freq: 77, translations: ['отношения'], examples: [{ en: 'They have a good relationship.', ru: 'У них хорошие отношения.' }], tags: ['everyday'] },
      { word: 'environment', transcription: '/ɪnˈvaɪrənmənt/', pos: 'noun', level: 'B1', freq: 75, translations: ['окружающая среда', 'среда'], examples: [{ en: 'We must protect the environment.', ru: 'Мы должны защищать окружающую среду.' }], tags: ['nature'] },
      { word: 'development', transcription: '/dɪˈveləpmənt/', pos: 'noun', level: 'B1', freq: 76, translations: ['развитие'], examples: [{ en: 'Technology development is fast.', ru: 'Развитие технологий идёт быстро.' }], tags: ['technology'] },
      { word: 'achieve', transcription: '/əˈtʃiːv/', pos: 'verb', level: 'B1', freq: 74, translations: ['достигать'], examples: [{ en: 'I want to achieve my goals.', ru: 'Я хочу достичь своих целей.' }], tags: ['business'], forms: ['achieve', 'achieves', 'achieved', 'achieved', 'achieving'] },
      { word: 'improve', transcription: '/ɪmˈpruːv/', pos: 'verb', level: 'B1', freq: 76, translations: ['улучшать', 'улучшаться'], examples: [{ en: 'I want to improve my English.', ru: 'Я хочу улучшить свой английский.' }], tags: ['education'], forms: ['improve', 'improves', 'improved', 'improved', 'improving'] },
      { word: 'consider', transcription: '/kənˈsɪdə/', pos: 'verb', level: 'B1', freq: 75, translations: ['рассматривать', 'считать'], examples: [{ en: 'I will consider your offer.', ru: 'Я рассмотрю ваше предложение.' }], tags: ['business'], forms: ['consider', 'considers', 'considered', 'considered', 'considering'] },
      { word: 'suggest', transcription: '/səˈdʒest/', pos: 'verb', level: 'B1', freq: 73, translations: ['предлагать'], examples: [{ en: 'I suggest we take a break.', ru: 'Я предлагаю сделать перерыв.' }], tags: ['everyday'], forms: ['suggest', 'suggests', 'suggested', 'suggested', 'suggesting'] },
      { word: 'require', transcription: '/rɪˈkwaɪə/', pos: 'verb', level: 'B1', freq: 72, translations: ['требовать'], examples: [{ en: 'This job requires experience.', ru: 'Эта работа требует опыта.' }], tags: ['business'], forms: ['require', 'requires', 'required', 'required', 'requiring'] },
      { word: 'provide', transcription: '/prəˈvaɪd/', pos: 'verb', level: 'B1', freq: 78, translations: ['предоставлять'], examples: [{ en: 'We provide quality services.', ru: 'Мы предоставляем качественные услуги.' }], tags: ['business'], forms: ['provide', 'provides', 'provided', 'provided', 'providing'] },
      { word: 'available', transcription: '/əˈveɪləbl/', pos: 'adjective', level: 'B1', freq: 77, translations: ['доступный'], examples: [{ en: 'Is this product available?', ru: 'Этот продукт доступен?' }], tags: ['business'] },
      { word: 'necessary', transcription: '/ˈnesəsəri/', pos: 'adjective', level: 'B1', freq: 74, translations: ['необходимый'], examples: [{ en: 'It is necessary to study.', ru: 'Необходимо учиться.' }], tags: ['education'] },
      { word: 'successful', transcription: '/səkˈsesfl/', pos: 'adjective', level: 'B1', freq: 73, translations: ['успешный'], examples: [{ en: 'He is a successful businessman.', ru: 'Он успешный бизнесмен.' }], tags: ['business'] },
      { word: 'probably', transcription: '/ˈprɒbəbli/', pos: 'adverb', level: 'B1', freq: 80, translations: ['вероятно'], examples: [{ en: 'I will probably come tomorrow.', ru: 'Я, вероятно, приду завтра.' }], tags: ['everyday'] },
      { word: 'actually', transcription: '/ˈæktʃuəli/', pos: 'adverb', level: 'B1', freq: 79, translations: ['на самом деле', 'вообще-то'], examples: [{ en: 'Actually, I changed my mind.', ru: 'Вообще-то, я передумал.' }], tags: ['everyday'] },
      { word: 'especially', transcription: '/ɪˈspeʃəli/', pos: 'adverb', level: 'B1', freq: 76, translations: ['особенно'], examples: [{ en: 'I like fruits, especially apples.', ru: 'Я люблю фрукты, особенно яблоки.' }], tags: ['food'] },
      { word: 'although', transcription: '/ɔːlˈðəʊ/', pos: 'conjunction', level: 'B1', freq: 75, translations: ['хотя'], examples: [{ en: 'Although it was late, I went out.', ru: 'Хотя было поздно, я вышел.' }], tags: ['everyday'] },

      // B2 Level
      { word: 'acknowledge', transcription: '/əkˈnɒlɪdʒ/', pos: 'verb', level: 'B2', freq: 60, translations: ['признавать', 'подтверждать'], examples: [{ en: 'I acknowledge my mistake.', ru: 'Я признаю свою ошибку.' }], tags: ['business'], forms: ['acknowledge', 'acknowledges', 'acknowledged', 'acknowledged', 'acknowledging'] },
      { word: 'anticipate', transcription: '/ænˈtɪsɪpeɪt/', pos: 'verb', level: 'B2', freq: 58, translations: ['предвидеть', 'ожидать'], examples: [{ en: 'We anticipate some problems.', ru: 'Мы предвидим некоторые проблемы.' }], tags: ['business'], forms: ['anticipate', 'anticipates', 'anticipated', 'anticipated', 'anticipating'] },
      { word: 'consequence', transcription: '/ˈkɒnsɪkwəns/', pos: 'noun', level: 'B2', freq: 62, translations: ['последствие'], examples: [{ en: 'Every action has consequences.', ru: 'У каждого действия есть последствия.' }], tags: ['everyday'] },
      { word: 'significant', transcription: '/sɪɡˈnɪfɪkənt/', pos: 'adjective', level: 'B2', freq: 65, translations: ['значительный', 'существенный'], examples: [{ en: 'This is a significant improvement.', ru: 'Это значительное улучшение.' }], tags: ['business'] },
      { word: 'approximately', transcription: '/əˈprɒksɪmətli/', pos: 'adverb', level: 'B2', freq: 55, translations: ['приблизительно'], examples: [{ en: 'It costs approximately $100.', ru: 'Это стоит приблизительно 100 долларов.' }], tags: ['everyday'] },
      { word: 'substantial', transcription: '/səbˈstænʃl/', pos: 'adjective', level: 'B2', freq: 56, translations: ['существенный', 'значительный'], examples: [{ en: 'We made substantial progress.', ru: 'Мы добились существенного прогресса.' }], tags: ['business'] },
      { word: 'ultimately', transcription: '/ˈʌltɪmətli/', pos: 'adverb', level: 'B2', freq: 54, translations: ['в конечном счёте'], examples: [{ en: 'Ultimately, you decide.', ru: 'В конечном счёте, ты решаешь.' }], tags: ['everyday'] },
      { word: 'comprehensive', transcription: '/ˌkɒmprɪˈhensɪv/', pos: 'adjective', level: 'B2', freq: 52, translations: ['всесторонний', 'исчерпывающий'], examples: [{ en: 'This is a comprehensive guide.', ru: 'Это исчерпывающее руководство.' }], tags: ['education'] },
      { word: 'demonstrate', transcription: '/ˈdemənstreɪt/', pos: 'verb', level: 'B2', freq: 58, translations: ['демонстрировать', 'показывать'], examples: [{ en: 'Let me demonstrate how it works.', ru: 'Позвольте продемонстрировать, как это работает.' }], tags: ['education'], forms: ['demonstrate', 'demonstrates', 'demonstrated', 'demonstrated', 'demonstrating'] },
      { word: 'efficient', transcription: '/ɪˈfɪʃnt/', pos: 'adjective', level: 'B2', freq: 60, translations: ['эффективный'], examples: [{ en: 'This is an efficient method.', ru: 'Это эффективный метод.' }], tags: ['business'] },

      // C1 Level
      { word: 'ambiguous', transcription: '/æmˈbɪɡjuəs/', pos: 'adjective', level: 'C1', freq: 40, translations: ['двусмысленный', 'неоднозначный'], examples: [{ en: 'His answer was ambiguous.', ru: 'Его ответ был двусмысленным.' }], tags: ['everyday'] },
      { word: 'articulate', transcription: '/ɑːˈtɪkjuleɪt/', pos: 'verb', level: 'C1', freq: 38, translations: ['чётко выражать', 'артикулировать'], examples: [{ en: 'She articulated her ideas clearly.', ru: 'Она чётко выразила свои идеи.' }], tags: ['education'], forms: ['articulate', 'articulates', 'articulated', 'articulated', 'articulating'] },
      { word: 'compelling', transcription: '/kəmˈpelɪŋ/', pos: 'adjective', level: 'C1', freq: 42, translations: ['убедительный', 'захватывающий'], examples: [{ en: 'This is a compelling argument.', ru: 'Это убедительный аргумент.' }], tags: ['business'] },
      { word: 'connotation', transcription: '/ˌkɒnəˈteɪʃn/', pos: 'noun', level: 'C1', freq: 35, translations: ['коннотация', 'скрытый смысл'], examples: [{ en: 'This word has a negative connotation.', ru: 'Это слово имеет негативную коннотацию.' }], tags: ['education'] },
      { word: 'elaborate', transcription: '/ɪˈlæbərət/', pos: 'adjective', level: 'C1', freq: 45, translations: ['детальный', 'сложный'], examples: [{ en: 'He gave an elaborate explanation.', ru: 'Он дал детальное объяснение.' }], tags: ['education'] },
      { word: 'inherent', transcription: '/ɪnˈhɪərənt/', pos: 'adjective', level: 'C1', freq: 38, translations: ['присущий', 'неотъемлемый'], examples: [{ en: 'There are inherent risks in this project.', ru: 'В этом проекте есть неотъемлемые риски.' }], tags: ['business'] },
      { word: 'nuance', transcription: '/ˈnjuːɑːns/', pos: 'noun', level: 'C1', freq: 36, translations: ['нюанс', 'оттенок'], examples: [{ en: 'I understand the nuances of this language.', ru: 'Я понимаю нюансы этого языка.' }], tags: ['education'] },
      { word: 'profound', transcription: '/prəˈfaʊnd/', pos: 'adjective', level: 'C1', freq: 40, translations: ['глубокий', 'основательный'], examples: [{ en: 'This had a profound effect on me.', ru: 'Это оказало на меня глубокое влияние.' }], tags: ['everyday'] },
      { word: 'scrutinize', transcription: '/ˈskruːtɪnaɪz/', pos: 'verb', level: 'C1', freq: 32, translations: ['тщательно изучать', 'внимательно рассматривать'], examples: [{ en: 'We need to scrutinize the data.', ru: 'Нам нужно тщательно изучить данные.' }], tags: ['business'], forms: ['scrutinize', 'scrutinizes', 'scrutinized', 'scrutinized', 'scrutinizing'] },
      { word: 'ubiquitous', transcription: '/juːˈbɪkwɪtəs/', pos: 'adjective', level: 'C1', freq: 30, translations: ['вездесущий', 'повсеместный'], examples: [{ en: 'Smartphones are ubiquitous today.', ru: 'Смартфоны сегодня повсеместны.' }], tags: ['technology'] },

      // Phrasal Verbs
      { word: 'look up', transcription: '/lʊk ʌp/', pos: 'phrasal verb', level: 'A2', freq: 75, translations: ['искать (в словаре)', 'смотреть вверх'], examples: [{ en: 'Look up this word in the dictionary.', ru: 'Посмотри это слово в словаре.' }], tags: ['phrasal_verb', 'education'] },
      { word: 'give up', transcription: '/ɡɪv ʌp/', pos: 'phrasal verb', level: 'A2', freq: 78, translations: ['сдаваться', 'бросать'], examples: [{ en: 'Never give up on your dreams.', ru: 'Никогда не сдавайся на пути к своим мечтам.' }], tags: ['phrasal_verb'] },
      { word: 'turn on', transcription: '/tɜːn ɒn/', pos: 'phrasal verb', level: 'A2', freq: 76, translations: ['включать'], examples: [{ en: 'Turn on the light, please.', ru: 'Включи свет, пожалуйста.' }], tags: ['phrasal_verb', 'everyday'] },
      { word: 'turn off', transcription: '/tɜːn ɒf/', pos: 'phrasal verb', level: 'A2', freq: 76, translations: ['выключать'], examples: [{ en: 'Turn off the TV.', ru: 'Выключи телевизор.' }], tags: ['phrasal_verb', 'everyday'] },
      { word: 'put off', transcription: '/pʊt ɒf/', pos: 'phrasal verb', level: 'B1', freq: 65, translations: ['откладывать'], examples: [{ en: 'Don\'t put off your homework.', ru: 'Не откладывай домашнее задание.' }], tags: ['phrasal_verb'] },
      { word: 'carry on', transcription: '/ˈkæri ɒn/', pos: 'phrasal verb', level: 'B1', freq: 68, translations: ['продолжать'], examples: [{ en: 'Carry on with your work.', ru: 'Продолжай свою работу.' }], tags: ['phrasal_verb'] },
      { word: 'figure out', transcription: '/ˈfɪɡər aʊt/', pos: 'phrasal verb', level: 'B1', freq: 70, translations: ['выяснить', 'понять'], examples: [{ en: 'I figured out the problem.', ru: 'Я выяснил, в чём проблема.' }], tags: ['phrasal_verb'] },
      { word: 'come across', transcription: '/kʌm əˈkrɒs/', pos: 'phrasal verb', level: 'B1', freq: 64, translations: ['наткнуться', 'встретить'], examples: [{ en: 'I came across an old photo.', ru: 'Я наткнулся на старую фотографию.' }], tags: ['phrasal_verb'] },
      { word: 'break down', transcription: '/breɪk daʊn/', pos: 'phrasal verb', level: 'B1', freq: 66, translations: ['сломаться', 'разбить на части'], examples: [{ en: 'My car broke down.', ru: 'Моя машина сломалась.' }], tags: ['phrasal_verb'] },
      { word: 'bring up', transcription: '/brɪŋ ʌp/', pos: 'phrasal verb', level: 'B2', freq: 58, translations: ['воспитывать', 'поднимать (тему)'], examples: [{ en: 'She brought up three children.', ru: 'Она воспитала троих детей.' }], tags: ['phrasal_verb'] },

      // Idioms
      { word: 'break the ice', transcription: '/breɪk ðə aɪs/', pos: 'idiom', level: 'B1', freq: 50, translations: ['сломать лёд', 'разрядить обстановку'], examples: [{ en: 'He told a joke to break the ice.', ru: 'Он рассказал шутку, чтобы разрядить обстановку.' }], tags: ['idiom'] },
      { word: 'piece of cake', transcription: '/piːs əv keɪk/', pos: 'idiom', level: 'B1', freq: 52, translations: ['пустяк', 'проще простого'], examples: [{ en: 'This exam was a piece of cake.', ru: 'Этот экзамен был проще простого.' }], tags: ['idiom'] },
      { word: 'once in a blue moon', transcription: '/wʌns ɪn ə bluː muːn/', pos: 'idiom', level: 'B2', freq: 40, translations: ['очень редко', 'в кои-то веки'], examples: [{ en: 'I see him once in a blue moon.', ru: 'Я вижу его очень редко.' }], tags: ['idiom'] },
      { word: 'hit the nail on the head', transcription: '/hɪt ðə neɪl ɒn ðə hed/', pos: 'idiom', level: 'B2', freq: 38, translations: ['попасть в точку'], examples: [{ en: 'You hit the nail on the head!', ru: 'Ты попал в точку!' }], tags: ['idiom'] },
      { word: 'cost an arm and a leg', transcription: '/kɒst ən ɑːm ənd ə leɡ/', pos: 'idiom', level: 'B2', freq: 36, translations: ['стоить целое состояние'], examples: [{ en: 'This car cost an arm and a leg.', ru: 'Эта машина стоила целое состояние.' }], tags: ['idiom'] },
    ];

    const insertWord = this.db.prepare(`
      INSERT INTO words (id, word, transcription, part_of_speech, level, frequency, forms, synonyms, antonyms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTranslation = this.db.prepare(`
      INSERT INTO translations (id, word_id, translation, is_primary)
      VALUES (?, ?, ?, ?)
    `);

    const insertExample = this.db.prepare(`
      INSERT INTO examples (id, word_id, english, russian, difficulty)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertWordTag = this.db.prepare(`
      INSERT OR IGNORE INTO word_tags (word_id, tag_id)
      VALUES (?, ?)
    `);

    const insertMany = this.db.transaction(() => {
      for (const data of wordsData) {
        const wordId = uuidv4();
        insertWord.run(
          wordId,
          data.word,
          data.transcription,
          data.pos,
          data.level,
          data.freq,
          JSON.stringify(data.forms || []),
          JSON.stringify([]),
          JSON.stringify([])
        );

        // Insert translations
        data.translations.forEach((trans, idx) => {
          insertTranslation.run(uuidv4(), wordId, trans, idx === 0 ? 1 : 0);
        });

        // Insert examples
        data.examples.forEach((ex) => {
          insertExample.run(uuidv4(), wordId, ex.en, ex.ru, 1);
        });

        // Insert tags
        data.tags.forEach((tag) => {
          insertWordTag.run(wordId, tag);
        });
      }
    });

    insertMany();
  }

  private seedWordsFromJson(jsonPath: string, targetLanguage: string = 'en'): void {
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const wordsJson = JSON.parse(content) as Array<{ id: number; en: string; ru: string; tr: string }>;

    const getCEFRLevel = (i: number) => i <= 500 ? 'A1' : i <= 1500 ? 'A2' : i <= 3500 ? 'B1' : i <= 6000 ? 'B2' : i <= 8000 ? 'C1' : 'C2';
    const getPos = (w: string) => {
      if (w.endsWith('tion') || w.endsWith('ness') || w.endsWith('ment')) return 'noun';
      if (w.endsWith('ly')) return 'adverb';
      if (w.endsWith('ful') || w.endsWith('ous') || w.endsWith('able')) return 'adjective';
      return 'noun';
    };

    const insertWord = this.db.prepare(`INSERT INTO words (id, word, transcription, part_of_speech, level, frequency, forms, synonyms, antonyms, target_language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertTranslation = this.db.prepare(`INSERT INTO translations (id, word_id, translation, is_primary) VALUES (?, ?, ?, ?)`);

    const transaction = this.db.transaction(() => {
      let count = 0;
      for (let i = 0; i < wordsJson.length; i++) {
        const item = wordsJson[i];
        if (!item.en || !item.ru) continue;
        const wordId = uuidv4();
        try {
          insertWord.run(wordId, item.en.toLowerCase().trim(), item.tr || '', getPos(item.en), getCEFRLevel(i + 1), Math.max(1, 100 - Math.floor(i / 80)), '[]', '[]', '[]', targetLanguage);
          item.ru.split(/[,;]/).forEach((t, idx) => t.trim() && insertTranslation.run(uuidv4(), wordId, t.trim(), idx === 0 ? 1 : 0));
          count++;
        } catch (e) { /* skip duplicates */ }
      }
      console.log(`Inserted ${count} ${targetLanguage} words`);
    });
    transaction();
  }

  private seedItalianWordsFromJson(jsonPath: string): void {
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const wordsJson = JSON.parse(content) as Array<{ id: number; it: string; ru: string; en: string; tr: string }>;

    const getCEFRLevel = (i: number) => i <= 200 ? 'A1' : i <= 500 ? 'A2' : i <= 800 ? 'B1' : 'B2';
    const getPos = (w: string) => {
      if (w.endsWith('zione') || w.endsWith('tà') || w.endsWith('mento')) return 'noun';
      if (w.endsWith('mente')) return 'adverb';
      if (w.endsWith('oso') || w.endsWith('bile') || w.endsWith('ale')) return 'adjective';
      return 'noun';
    };

    const insertWord = this.db.prepare(`INSERT INTO words (id, word, transcription, part_of_speech, level, frequency, forms, synonyms, antonyms, target_language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertTranslation = this.db.prepare(`INSERT INTO translations (id, word_id, translation, is_primary) VALUES (?, ?, ?, ?)`);

    const transaction = this.db.transaction(() => {
      let count = 0;
      for (let i = 0; i < wordsJson.length; i++) {
        const item = wordsJson[i];
        if (!item.it || !item.ru) continue;
        const wordId = uuidv4();
        try {
          insertWord.run(wordId, item.it.toLowerCase().trim(), item.tr || '', getPos(item.it), getCEFRLevel(i + 1), Math.max(1, 100 - Math.floor(i / 10)), '[]', '[]', '[]', 'it');
          item.ru.split(/[,;]/).forEach((t, idx) => t.trim() && insertTranslation.run(uuidv4(), wordId, t.trim(), idx === 0 ? 1 : 0));
          count++;
        } catch (e) { /* skip duplicates */ }
      }
      console.log(`Inserted ${count} Italian words`);
    });
    transaction();
  }

  // Word methods
  getWords(filters?: any): Word[] {
    let query = `
      SELECT w.*,
        GROUP_CONCAT(DISTINCT t.translation) as translations_str,
        GROUP_CONCAT(DISTINCT tg.name) as tags_str
      FROM words w
      LEFT JOIN translations t ON w.id = t.word_id
      LEFT JOIN word_tags wt ON w.id = wt.word_id
      LEFT JOIN tags tg ON wt.tag_id = tg.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.level) {
      conditions.push('w.level = ?');
      params.push(filters.level);
    }
    if (filters?.category) {
      conditions.push('tg.id = ?');
      params.push(filters.category);
    }
    if (filters?.search) {
      conditions.push('(w.word LIKE ? OR t.translation LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY w.id ORDER BY w.frequency DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.mapWordRow);
  }

  // Get words with their learning progress
  getWordsWithProgress(filters?: any): any[] {
    let query = `
      SELECT w.*,
        GROUP_CONCAT(DISTINCT t.translation) as translations_str,
        GROUP_CONCAT(DISTINCT tg.name) as tags_str,
        up.status as progress_status,
        up.correct_count,
        up.wrong_count,
        up.repetitions,
        up.next_review,
        up.last_review
      FROM words w
      LEFT JOIN translations t ON w.id = t.word_id
      LEFT JOIN word_tags wt ON w.id = wt.word_id
      LEFT JOIN tags tg ON wt.tag_id = tg.id
      LEFT JOIN user_progress up ON w.id = up.word_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Always filter by target language (default to 'en' for English)
    conditions.push('w.target_language = ?');
    params.push(filters?.targetLanguage || 'en');

    if (filters?.level) {
      conditions.push('w.level = ?');
      params.push(filters.level);
    }
    if (filters?.category) {
      conditions.push('tg.id = ?');
      params.push(filters.category);
    }
    if (filters?.search) {
      conditions.push('(w.word LIKE ? OR t.translation LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters?.status) {
      if (filters.status === 'new') {
        conditions.push('up.status IS NULL');
      } else {
        conditions.push('up.status = ?');
        params.push(filters.status);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY w.id ORDER BY w.frequency DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => ({
      ...this.mapWordRow(row),
      progress: row.progress_status ? {
        status: row.progress_status,
        correctCount: row.correct_count || 0,
        wrongCount: row.wrong_count || 0,
        repetitions: row.repetitions || 0,
        nextReview: row.next_review,
        lastReview: row.last_review,
      } : null,
    }));
  }

  // Get word status counts for statistics
  getWordStatusCounts(): { status: string; count: number }[] {
    const result = this.db.prepare(`
      SELECT
        COALESCE(up.status, 'new') as status,
        COUNT(*) as count
      FROM words w
      LEFT JOIN user_progress up ON w.id = up.word_id
      GROUP BY COALESCE(up.status, 'new')
      ORDER BY
        CASE COALESCE(up.status, 'new')
          WHEN 'new' THEN 1
          WHEN 'learning' THEN 2
          WHEN 'review' THEN 3
          WHEN 'learned' THEN 4
        END
    `).all() as any[];
    return result;
  }

  getWordById(id: string): Word | null {
    const row = this.db.prepare(`
      SELECT w.*,
        GROUP_CONCAT(DISTINCT t.translation) as translations_str,
        GROUP_CONCAT(DISTINCT tg.name) as tags_str
      FROM words w
      LEFT JOIN translations t ON w.id = t.word_id
      LEFT JOIN word_tags wt ON w.id = wt.word_id
      LEFT JOIN tags tg ON wt.tag_id = tg.id
      WHERE w.id = ?
      GROUP BY w.id
    `).get(id) as any;

    if (!row) return null;

    // Get full translations
    const translations = this.db.prepare(
      'SELECT * FROM translations WHERE word_id = ?'
    ).all(id) as any[];

    // Get examples
    const examples = this.db.prepare(
      'SELECT * FROM examples WHERE word_id = ?'
    ).all(id) as any[];

    const word = this.mapWordRow(row);
    word.translations = translations.map(t => ({
      id: t.id,
      wordId: t.word_id,
      translation: t.translation,
      meaning: t.meaning,
      isPrimary: t.is_primary === 1
    }));
    word.examples = examples.map(e => ({
      id: e.id,
      wordId: e.word_id,
      english: e.english,
      russian: e.russian,
      difficulty: e.difficulty
    }));

    return word;
  }

  searchWords(query: string): Word[] {
    const rows = this.db.prepare(`
      SELECT w.*,
        GROUP_CONCAT(DISTINCT t.translation) as translations_str,
        GROUP_CONCAT(DISTINCT tg.name) as tags_str
      FROM words w
      LEFT JOIN translations t ON w.id = t.word_id
      LEFT JOIN word_tags wt ON w.id = wt.word_id
      LEFT JOIN tags tg ON wt.tag_id = tg.id
      WHERE w.word LIKE ? OR t.translation LIKE ?
      GROUP BY w.id
      ORDER BY w.frequency DESC
      LIMIT 50
    `).all(`%${query}%`, `%${query}%`) as any[];

    return rows.map(this.mapWordRow);
  }

  getWordsByLevel(level: string): Word[] {
    return this.getWords({ level });
  }

  getWordsByCategory(category: string): Word[] {
    return this.getWords({ category });
  }

  getCategories(): { id: string; name: string; count: number }[] {
    return this.db.prepare(`
      SELECT t.id, t.name, COUNT(wt.word_id) as count
      FROM tags t
      LEFT JOIN word_tags wt ON t.id = wt.tag_id
      WHERE t.category = 'topic'
      GROUP BY t.id
      ORDER BY count DESC
    `).all() as any[];
  }

  getLevels(targetLanguage: string = 'en'): { level: string; count: number }[] {
    return this.db.prepare(`
      SELECT level, COUNT(*) as count
      FROM words
      WHERE target_language = ?
      GROUP BY level
      ORDER BY
        CASE level
          WHEN 'A1' THEN 1
          WHEN 'A2' THEN 2
          WHEN 'B1' THEN 3
          WHEN 'B2' THEN 4
          WHEN 'C1' THEN 5
          WHEN 'C2' THEN 6
        END
    `).all(targetLanguage) as any[];
  }

  private mapWordRow(row: any): Word {
    return {
      id: row.id,
      word: row.word,
      transcription: row.transcription,
      partOfSpeech: row.part_of_speech,
      level: row.level,
      frequency: row.frequency,
      translations: row.translations_str ? row.translations_str.split(',').map((t: string) => ({ translation: t })) : [],
      examples: [],
      forms: row.forms ? JSON.parse(row.forms) : [],
      synonyms: row.synonyms ? JSON.parse(row.synonyms) : [],
      antonyms: row.antonyms ? JSON.parse(row.antonyms) : [],
      tags: row.tags_str ? row.tags_str.split(',') : [],
      audioPath: row.audio_path
    };
  }

  // Progress methods
  getWordProgress(wordId: string): WordProgress | null {
    const row = this.db.prepare(
      'SELECT * FROM user_progress WHERE word_id = ?'
    ).get(wordId) as any;

    if (!row) return null;

    return {
      wordId: row.word_id,
      status: row.status,
      easeFactor: row.ease_factor,
      interval: row.interval,
      repetitions: row.repetitions,
      nextReview: row.next_review,
      lastReview: row.last_review,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count
    };
  }

  updateWordProgress(wordId: string, data: Partial<WordProgress>): void {
    const existing = this.getWordProgress(wordId);

    if (existing) {
      this.db.prepare(`
        UPDATE user_progress SET
          status = COALESCE(?, status),
          ease_factor = COALESCE(?, ease_factor),
          interval = COALESCE(?, interval),
          repetitions = COALESCE(?, repetitions),
          next_review = COALESCE(?, next_review),
          last_review = COALESCE(?, last_review),
          correct_count = COALESCE(?, correct_count),
          wrong_count = COALESCE(?, wrong_count)
        WHERE word_id = ?
      `).run(
        data.status,
        data.easeFactor,
        data.interval,
        data.repetitions,
        data.nextReview,
        data.lastReview,
        data.correctCount,
        data.wrongCount,
        wordId
      );
    } else {
      this.db.prepare(`
        INSERT INTO user_progress (word_id, status, ease_factor, interval, repetitions, next_review, last_review, correct_count, wrong_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        wordId,
        data.status || 'new',
        data.easeFactor || 2.5,
        data.interval || 0,
        data.repetitions || 0,
        data.nextReview,
        data.lastReview,
        data.correctCount || 0,
        data.wrongCount || 0
      );
    }
  }

  getUserStats(): UserStats {
    const totalWords = (this.db.prepare('SELECT COUNT(*) as count FROM words').get() as any).count;
    const learnedWords = (this.db.prepare("SELECT COUNT(*) as count FROM user_progress WHERE status = 'learned'").get() as any).count;
    const learningWords = (this.db.prepare("SELECT COUNT(*) as count FROM user_progress WHERE status = 'learning'").get() as any).count;
    const wordsReviewed = (this.db.prepare('SELECT COALESCE(SUM(words_reviewed), 0) as total FROM daily_stats').get() as any).total;
    const totalXP = (this.db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get() as any).total;
    const streak = this.db.prepare('SELECT * FROM streak WHERE id = 1').get() as any;
    const totalTime = (this.db.prepare('SELECT COALESCE(SUM(time_spent), 0) as total FROM daily_stats').get() as any).total;
    const sessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NOT NULL').get() as any).count;

    return {
      totalWords,
      learnedWords,
      learningWords,
      wordsReviewed,
      totalXP,
      currentStreak: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      totalTimeSpent: totalTime,
      sessionsCompleted: sessions
    };
  }

  getDailyGoal(): any {
    const profile = this.db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = this.db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(today) as any;

    return {
      type: profile?.daily_goal_type || 'cards',
      target: profile?.daily_goal_target || 50,
      current: dailyStats ? (profile?.daily_goal_type === 'time' ? dailyStats.time_spent / 60 : dailyStats.words_reviewed + dailyStats.words_learned) : 0
    };
  }

  updateDailyGoal(goal: { type: string; target: number }): void {
    this.db.prepare(`
      UPDATE user_profile SET
        daily_goal_type = ?,
        daily_goal_target = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(goal.type, goal.target);
  }

  // XP methods
  getTotalXP(): number {
    const result = this.db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get() as any;
    return result.total;
  }

  addXP(amount: number, source: string): number {
    this.db.prepare('INSERT INTO xp_log (id, amount, source) VALUES (?, ?, ?)').run(uuidv4(), amount, source);

    const today = new Date().toISOString().split('T')[0];
    this.db.prepare(`
      INSERT INTO daily_stats (date, xp_earned) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET xp_earned = xp_earned + ?
    `).run(today, amount, amount);

    return this.getTotalXP();
  }

  // Streak methods
  getStreak(): { current: number; longest: number; lastActivity: string | null } {
    const streak = this.db.prepare('SELECT * FROM streak WHERE id = 1').get() as any;
    return {
      current: streak?.current_streak || 0,
      longest: streak?.longest_streak || 0,
      lastActivity: streak?.last_activity_date
    };
  }

  updateStreak(): { current: number; longest: number; extended: boolean } {
    const today = new Date().toISOString().split('T')[0];
    const streak = this.db.prepare('SELECT * FROM streak WHERE id = 1').get() as any;

    let newStreak = 1;
    let extended = false;

    if (streak?.last_activity_date) {
      const lastDate = new Date(streak.last_activity_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already updated today
        return { current: streak.current_streak, longest: streak.longest_streak, extended: false };
      } else if (diffDays === 1) {
        // Consecutive day
        newStreak = streak.current_streak + 1;
        extended = true;
      }
      // If diffDays > 1, streak resets to 1
    }

    const newLongest = Math.max(newStreak, streak?.longest_streak || 0);

    this.db.prepare(`
      UPDATE streak SET
        current_streak = ?,
        longest_streak = ?,
        last_activity_date = ?
      WHERE id = 1
    `).run(newStreak, newLongest, today);

    return { current: newStreak, longest: newLongest, extended };
  }

  // Achievement methods
  getAchievements(): Achievement[] {
    const rows = this.db.prepare('SELECT * FROM achievements').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      condition: row.condition_type,
      unlockedAt: row.unlocked_at,
      progress: row.progress,
      target: row.condition_value
    }));
  }

  checkAndUnlockAchievements(): Achievement[] {
    const stats = this.getUserStats();
    const unlocked: Achievement[] = [];

    const achievements = this.db.prepare('SELECT * FROM achievements WHERE unlocked_at IS NULL').all() as any[];

    for (const achievement of achievements) {
      let shouldUnlock = false;
      let progress = 0;

      switch (achievement.condition_type) {
        case 'words_learned':
          progress = stats.learnedWords;
          shouldUnlock = progress >= achievement.condition_value;
          break;
        case 'streak':
          progress = stats.currentStreak;
          shouldUnlock = progress >= achievement.condition_value;
          break;
        case 'xp':
          progress = stats.totalXP;
          shouldUnlock = progress >= achievement.condition_value;
          break;
        case 'sessions':
          progress = stats.sessionsCompleted;
          shouldUnlock = progress >= achievement.condition_value;
          break;
      }

      // Update progress
      this.db.prepare('UPDATE achievements SET progress = ? WHERE id = ?').run(progress, achievement.id);

      if (shouldUnlock) {
        const now = new Date().toISOString();
        this.db.prepare('UPDATE achievements SET unlocked_at = ? WHERE id = ?').run(now, achievement.id);
        unlocked.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          condition: achievement.condition_type,
          unlockedAt: now,
          progress: progress,
          target: achievement.condition_value
        });
      }
    }

    return unlocked;
  }

  getUserLevel(): { level: number; xp: number; xpForNext: number } {
    const totalXP = this.getTotalXP();
    // XP required per level increases: 100, 200, 300, etc.
    let level = 1;
    let xpRequired = 100;
    let accumulatedXP = 0;

    while (accumulatedXP + xpRequired <= totalXP) {
      accumulatedXP += xpRequired;
      level++;
      xpRequired = level * 100;
    }

    return {
      level,
      xp: totalXP - accumulatedXP,
      xpForNext: xpRequired
    };
  }

  // Session methods
  startSession(type: string): string {
    const id = uuidv4();
    this.db.prepare('INSERT INTO sessions (id, type) VALUES (?, ?)').run(id, type);
    return id;
  }

  endSession(sessionId: string, stats: any): void {
    this.db.prepare(`
      UPDATE sessions SET
        ended_at = CURRENT_TIMESTAMP,
        words_count = ?,
        correct_count = ?,
        wrong_count = ?,
        xp_earned = ?,
        time_spent = ?
      WHERE id = ?
    `).run(stats.wordsCount || 0, stats.correctCount || 0, stats.wrongCount || 0, stats.xpEarned || 0, stats.timeSpent || 0, sessionId);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    this.db.prepare(`
      INSERT INTO daily_stats (date, words_reviewed, correct_answers, wrong_answers, xp_earned, time_spent, sessions_count)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(date) DO UPDATE SET
        words_reviewed = words_reviewed + ?,
        correct_answers = correct_answers + ?,
        wrong_answers = wrong_answers + ?,
        xp_earned = xp_earned + ?,
        time_spent = time_spent + ?,
        sessions_count = sessions_count + 1
    `).run(
      today,
      stats.wordsCount || 0,
      stats.correctCount || 0,
      stats.wrongCount || 0,
      stats.xpEarned || 0,
      stats.timeSpent || 0,
      stats.wordsCount || 0,
      stats.correctCount || 0,
      stats.wrongCount || 0,
      stats.xpEarned || 0,
      stats.timeSpent || 0
    );

    // Check for perfect session achievement
    if (stats.wrongCount === 0 && stats.wordsCount > 0) {
      const achievement = this.db.prepare("SELECT * FROM achievements WHERE id = 'perfect_session' AND unlocked_at IS NULL").get();
      if (achievement) {
        this.db.prepare("UPDATE achievements SET unlocked_at = CURRENT_TIMESTAMP, progress = 1 WHERE id = 'perfect_session'").run();
      }
    }
  }

  getSessionHistory(limit?: number): any[] {
    return this.db.prepare(`
      SELECT * FROM sessions
      WHERE ended_at IS NOT NULL
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit || 20);
  }

  // Statistics methods
  getDailyStats(days?: number): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM daily_stats
      ORDER BY date DESC
      LIMIT ?
    `).all(days || 30) as any[];

    // Map snake_case to camelCase for frontend
    return rows.map(row => ({
      date: row.date,
      wordsLearned: row.words_learned || 0,
      wordsReviewed: row.words_reviewed || 0,
      correctAnswers: row.correct_answers || 0,
      wrongAnswers: row.wrong_answers || 0,
      xpEarned: row.xp_earned || 0,
      timeSpent: row.time_spent || 0,
      sessionsCount: row.sessions_count || 0,
    }));
  }

  getWeeklyStats(): any {
    const rows = this.db.prepare(`
      SELECT
        SUM(words_learned) as wordsLearned,
        SUM(words_reviewed) as wordsReviewed,
        SUM(correct_answers) as correctAnswers,
        SUM(wrong_answers) as wrongAnswers,
        SUM(xp_earned) as xpEarned,
        SUM(time_spent) as timeSpent,
        SUM(sessions_count) as sessionsCount
      FROM daily_stats
      WHERE date >= date('now', '-7 days')
    `).get();
    return rows;
  }

  getMonthlyStats(): any {
    const rows = this.db.prepare(`
      SELECT
        SUM(words_learned) as wordsLearned,
        SUM(words_reviewed) as wordsReviewed,
        SUM(correct_answers) as correctAnswers,
        SUM(wrong_answers) as wrongAnswers,
        SUM(xp_earned) as xpEarned,
        SUM(time_spent) as timeSpent,
        SUM(sessions_count) as sessionsCount
      FROM daily_stats
      WHERE date >= date('now', '-30 days')
    `).get();
    return rows;
  }

  getOverallStats(): any {
    return this.getUserStats();
  }

  // Settings methods
  getSettings(): any {
    return this.db.prepare('SELECT * FROM settings WHERE id = 1').get();
  }

  updateSettings(settings: any): void {
    const columns = Object.keys(settings).filter(k => k !== 'id');
    const values = columns.map(k => settings[k]);

    if (columns.length === 0) return;

    const setClause = columns.map(c => `${c} = ?`).join(', ');
    this.db.prepare(`UPDATE settings SET ${setClause} WHERE id = 1`).run(...values);
  }

  // User profile methods
  getUserProfile(): any {
    return this.db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  }

  updateUserProfile(profile: any): void {
    this.db.prepare(`
      UPDATE user_profile SET
        name = COALESCE(?, name),
        target_level = COALESCE(?, target_level),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(profile.name, profile.targetLevel);
  }

  // Export/Import
  exportData(): any {
    const words = this.db.prepare('SELECT * FROM user_progress').all();
    const xpLog = this.db.prepare('SELECT * FROM xp_log').all();
    const sessions = this.db.prepare('SELECT * FROM sessions').all();
    const achievements = this.db.prepare('SELECT * FROM achievements').all();
    const dailyStats = this.db.prepare('SELECT * FROM daily_stats').all();
    const streak = this.db.prepare('SELECT * FROM streak WHERE id = 1').get();
    const profile = this.db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    const settings = this.db.prepare('SELECT * FROM settings WHERE id = 1').get();

    return {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      data: {
        userProgress: words,
        xpLog,
        sessions,
        achievements,
        dailyStats,
        streak,
        profile,
        settings
      }
    };
  }

  importData(data: any): boolean {
    try {
      const importTransaction = this.db.transaction(() => {
        // Clear existing user data
        this.db.exec('DELETE FROM user_progress');
        this.db.exec('DELETE FROM xp_log');
        this.db.exec('DELETE FROM sessions');
        this.db.exec('DELETE FROM daily_stats');

        // Import user progress
        const insertProgress = this.db.prepare(`
          INSERT INTO user_progress (word_id, status, ease_factor, interval, repetitions, next_review, last_review, correct_count, wrong_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of data.data.userProgress || []) {
          insertProgress.run(row.word_id, row.status, row.ease_factor, row.interval, row.repetitions, row.next_review, row.last_review, row.correct_count, row.wrong_count);
        }

        // Import XP log
        const insertXP = this.db.prepare('INSERT INTO xp_log (id, amount, source, created_at) VALUES (?, ?, ?, ?)');
        for (const row of data.data.xpLog || []) {
          insertXP.run(row.id, row.amount, row.source, row.created_at);
        }

        // Import sessions
        const insertSession = this.db.prepare(`
          INSERT INTO sessions (id, type, started_at, ended_at, words_count, correct_count, wrong_count, xp_earned, time_spent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of data.data.sessions || []) {
          insertSession.run(row.id, row.type, row.started_at, row.ended_at, row.words_count, row.correct_count, row.wrong_count, row.xp_earned, row.time_spent);
        }

        // Import daily stats
        const insertDaily = this.db.prepare(`
          INSERT INTO daily_stats (date, words_learned, words_reviewed, correct_answers, wrong_answers, xp_earned, time_spent, sessions_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of data.data.dailyStats || []) {
          insertDaily.run(row.date, row.words_learned, row.words_reviewed, row.correct_answers, row.wrong_answers, row.xp_earned, row.time_spent, row.sessions_count);
        }

        // Update streak
        if (data.data.streak) {
          this.db.prepare(`
            UPDATE streak SET current_streak = ?, longest_streak = ?, last_activity_date = ?
            WHERE id = 1
          `).run(data.data.streak.current_streak, data.data.streak.longest_streak, data.data.streak.last_activity_date);
        }

        // Update profile
        if (data.data.profile) {
          this.db.prepare(`
            UPDATE user_profile SET name = ?, target_level = ?, daily_goal_type = ?, daily_goal_target = ?
            WHERE id = 1
          `).run(data.data.profile.name, data.data.profile.target_level, data.data.profile.daily_goal_type, data.data.profile.daily_goal_target);
        }

        // Update achievements
        for (const row of data.data.achievements || []) {
          this.db.prepare('UPDATE achievements SET unlocked_at = ?, progress = ? WHERE id = ?').run(row.unlocked_at, row.progress, row.id);
        }
      });

      importTransaction();
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }
}
