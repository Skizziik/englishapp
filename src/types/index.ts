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
  id?: string;
  wordId?: string;
  translation: string;
  meaning?: string;
  isPrimary?: boolean;
}

export interface Example {
  id?: string;
  wordId?: string;
  english: string;
  russian: string;
  difficulty?: number;
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

export interface ReviewCard {
  word: Word;
  progress: WordProgress | null;
  isNew: boolean;
}

export interface UserStats {
  totalWords: number;
  learnedWords: number;
  learningWords: number;
  wordsReviewed: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalTimeSpent: number;
  sessionsCompleted: number;
}

export interface DailyGoal {
  type: 'time' | 'cards';
  target: number;
  current: number;
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

export interface Session {
  id: string;
  type: string;
  startedAt: string;
  endedAt?: string;
  wordsCount: number;
  correctCount: number;
  wrongCount: number;
  xpEarned: number;
  timeSpent: number;
}

export interface DailyStats {
  date: string;
  wordsLearned: number;
  wordsReviewed: number;
  correctAnswers: number;
  wrongAnswers: number;
  xpEarned: number;
  timeSpent: number;
  sessionsCount: number;
}

export interface UserProfile {
  id: number;
  name: string;
  targetLevel: string;
  dailyGoalType: 'time' | 'cards';
  dailyGoalTarget: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoPlayAudio: boolean;
  srsNewCardsPerDay: number;
  srsReviewCardsPerDay: number;
  geminiApiKey?: string;
  geminiEnabled: boolean;
  language: string;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Level {
  level: string;
  count: number;
}

export type AnswerQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface QuizQuestion {
  type: 'multipleChoice' | 'typing' | 'listening' | 'match';
  word: Word;
  correctAnswer: string;
  options?: string[];
}

export interface SessionResult {
  wordsCount: number;
  correctCount: number;
  wrongCount: number;
  xpEarned: number;
  timeSpent: number;
  newWordsLearned: number;
  streak?: {
    current: number;
    extended: boolean;
  };
  achievements?: Achievement[];
}
