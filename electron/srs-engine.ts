import { DatabaseManager, Word, WordProgress } from './database';

/**
 * SRS Engine based on SM-2 algorithm (SuperMemo 2)
 *
 * Quality ratings:
 * 0 - Complete blackout, no recall
 * 1 - Incorrect response, but upon seeing correct answer, felt familiar
 * 2 - Incorrect response, but upon seeing correct answer, seemed easy to remember
 * 3 - Correct response with serious difficulty
 * 4 - Correct response with some hesitation
 * 5 - Perfect response with no hesitation
 */

export interface ReviewCard {
  word: Word;
  progress: WordProgress | null;
  isNew: boolean;
}

export interface SRSStats {
  dueToday: number;
  newAvailable: number;
  reviewedToday: number;
  correctToday: number;
  wrongToday: number;
}

export class SRSEngine {
  private db: DatabaseManager;

  // Default intervals in days
  private readonly INITIAL_INTERVALS = [1, 3]; // Learning steps
  private readonly GRADUATING_INTERVAL = 7; // First interval after learning
  private readonly EASY_BONUS = 1.3; // Bonus multiplier for easy responses
  private readonly MIN_EASE = 1.3; // Minimum ease factor
  private readonly MAX_EASE = 2.5; // Maximum ease factor
  private readonly DEFAULT_EASE = 2.5; // Starting ease factor

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Get words due for review
   */
  getNextReviewWords(count: number, targetLanguage: string = 'en'): ReviewCard[] {
    const now = new Date().toISOString();

    // Get words that are due for review, filtered by target language
    const dueWords = this.db['db'].prepare(`
      SELECT w.*, up.*
      FROM words w
      INNER JOIN user_progress up ON w.id = up.word_id
      WHERE up.next_review <= ? AND up.status IN ('learning', 'review')
        AND w.target_language = ?
      ORDER BY up.next_review ASC
      LIMIT ?
    `).all(now, targetLanguage, count) as any[];

    return dueWords.map(row => ({
      word: this.mapWordFromRow(row),
      progress: this.mapProgressFromRow(row),
      isNew: false
    }));
  }

  /**
   * Get new words to learn
   */
  getNewWordsToLearn(count: number, level?: string, category?: string, targetLanguage: string = 'en'): ReviewCard[] {
    let query = `
      SELECT w.*,
        GROUP_CONCAT(DISTINCT t.translation) as translations_str,
        GROUP_CONCAT(DISTINCT tg.name) as tags_str
      FROM words w
      LEFT JOIN translations t ON w.id = t.word_id
      LEFT JOIN word_tags wt ON w.id = wt.word_id
      LEFT JOIN tags tg ON wt.tag_id = tg.id
      LEFT JOIN user_progress up ON w.id = up.word_id
      WHERE up.word_id IS NULL AND w.target_language = ?
    `;

    const params: any[] = [targetLanguage];

    if (level) {
      query += ' AND w.level = ?';
      params.push(level);
    }

    if (category) {
      query += ' AND tg.id = ?';
      params.push(category);
    }

    query += `
      GROUP BY w.id
      ORDER BY w.frequency DESC,
        CASE w.level
          WHEN 'A1' THEN 1
          WHEN 'A2' THEN 2
          WHEN 'B1' THEN 3
          WHEN 'B2' THEN 4
          WHEN 'C1' THEN 5
          WHEN 'C2' THEN 6
        END
      LIMIT ?
    `;
    params.push(count);

    const words = this.db['db'].prepare(query).all(...params) as any[];

    return words.map(row => ({
      word: {
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
      },
      progress: null,
      isNew: true
    }));
  }

  /**
   * Record user's answer and update SRS parameters
   * Quality: 0-5 (SM-2 standard)
   * Mapped from UI: "Забыл"=0, "С трудом"=2, "Нормально"=4, "Легко"=5
   */
  recordAnswer(wordId: string, quality: number): {
    nextReview: string;
    interval: number;
    easeFactor: number;
    isGraduated: boolean;
  } {
    let progress = this.db.getWordProgress(wordId);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Initialize progress for new words
    if (!progress) {
      progress = {
        wordId,
        status: 'learning',
        easeFactor: this.DEFAULT_EASE,
        interval: 0,
        repetitions: 0,
        nextReview: now.toISOString(),
        lastReview: undefined,
        correctCount: 0,
        wrongCount: 0
      };
    }

    // Update correct/wrong counts
    if (quality >= 3) {
      progress.correctCount++;
    } else {
      progress.wrongCount++;
    }

    // Calculate new parameters using SM-2 algorithm
    const result = this.calculateSM2(progress, quality);

    // Update progress in database
    this.db.updateWordProgress(wordId, {
      status: result.status,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReview: result.nextReview,
      lastReview: now.toISOString(),
      correctCount: progress.correctCount,
      wrongCount: progress.wrongCount
    });

    // Update daily statistics
    this.updateDailyStats(quality >= 3);

    return {
      nextReview: result.nextReview,
      interval: result.interval,
      easeFactor: result.easeFactor,
      isGraduated: result.status === 'learned' || result.status === 'review'
    };
  }

  /**
   * SM-2 Algorithm Implementation
   */
  private calculateSM2(progress: WordProgress, quality: number): {
    status: 'new' | 'learning' | 'learned' | 'review';
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string;
  } {
    let { easeFactor, interval, repetitions, status } = progress;
    const now = new Date();

    // If quality < 3, card failed - reset to learning
    if (quality < 3) {
      return {
        status: 'learning',
        easeFactor: Math.max(this.MIN_EASE, easeFactor - 0.2),
        interval: this.INITIAL_INTERVALS[0],
        repetitions: 0,
        nextReview: this.addDays(now, this.INITIAL_INTERVALS[0]).toISOString()
      };
    }

    // Calculate new ease factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(this.MIN_EASE, Math.min(this.MAX_EASE, easeFactor));

    repetitions++;

    // Calculate new interval
    if (status === 'learning' || status === 'new') {
      // Learning phase
      if (repetitions < this.INITIAL_INTERVALS.length) {
        interval = this.INITIAL_INTERVALS[repetitions];
        status = 'learning';
      } else {
        // Graduate to review
        interval = this.GRADUATING_INTERVAL;
        status = 'review';

        // Apply easy bonus if quality is 5
        if (quality === 5) {
          interval = Math.round(interval * this.EASY_BONUS);
        }
      }
    } else {
      // Review phase
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }

      // Apply easy bonus
      if (quality === 5) {
        interval = Math.round(interval * this.EASY_BONUS);
      }

      // Mark as learned if interval > 21 days
      if (interval > 21) {
        status = 'learned';
      }
    }

    // Cap maximum interval at 365 days
    interval = Math.min(interval, 365);

    return {
      status,
      easeFactor,
      interval,
      repetitions,
      nextReview: this.addDays(now, interval).toISOString()
    };
  }

  /**
   * Get review statistics
   */
  getReviewStats(targetLanguage: string = 'en'): SRSStats {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Count due cards for specific language
    const dueToday = (this.db['db'].prepare(`
      SELECT COUNT(*) as count
      FROM user_progress up
      INNER JOIN words w ON up.word_id = w.id
      WHERE up.next_review <= ? AND up.status IN ('learning', 'review')
        AND w.target_language = ?
    `).get(now, targetLanguage) as any).count;

    // Count available new cards for specific language
    const newAvailable = (this.db['db'].prepare(`
      SELECT COUNT(*) as count
      FROM words w
      LEFT JOIN user_progress up ON w.id = up.word_id
      WHERE up.word_id IS NULL AND w.target_language = ?
    `).get(targetLanguage) as any).count;

    // Get today's stats
    const todayStats = this.db['db'].prepare(`
      SELECT * FROM daily_stats WHERE date = ?
    `).get(today) as any;

    return {
      dueToday,
      newAvailable,
      reviewedToday: todayStats?.words_reviewed || 0,
      correctToday: todayStats?.correct_answers || 0,
      wrongToday: todayStats?.wrong_answers || 0
    };
  }

  /**
   * Get count of due reviews
   */
  getDueReviewCount(targetLanguage: string = 'en'): number {
    const now = new Date().toISOString();
    const result = this.db['db'].prepare(`
      SELECT COUNT(*) as count
      FROM user_progress up
      INNER JOIN words w ON up.word_id = w.id
      WHERE up.next_review <= ? AND up.status IN ('learning', 'review')
        AND w.target_language = ?
    `).get(now, targetLanguage) as any;
    return result.count;
  }

  /**
   * Helper: Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Helper: Update daily statistics
   */
  private updateDailyStats(correct: boolean): void {
    const today = new Date().toISOString().split('T')[0];

    if (correct) {
      this.db['db'].prepare(`
        INSERT INTO daily_stats (date, words_reviewed, correct_answers)
        VALUES (?, 1, 1)
        ON CONFLICT(date) DO UPDATE SET
          words_reviewed = words_reviewed + 1,
          correct_answers = correct_answers + 1
      `).run(today);
    } else {
      this.db['db'].prepare(`
        INSERT INTO daily_stats (date, words_reviewed, wrong_answers)
        VALUES (?, 1, 1)
        ON CONFLICT(date) DO UPDATE SET
          words_reviewed = words_reviewed + 1,
          wrong_answers = wrong_answers + 1
      `).run(today);
    }
  }

  /**
   * Helper: Map database row to Word object
   */
  private mapWordFromRow(row: any): Word {
    return {
      id: row.id,
      word: row.word,
      transcription: row.transcription,
      partOfSpeech: row.part_of_speech,
      level: row.level,
      frequency: row.frequency,
      translations: [],
      examples: [],
      forms: row.forms ? JSON.parse(row.forms) : [],
      synonyms: row.synonyms ? JSON.parse(row.synonyms) : [],
      antonyms: row.antonyms ? JSON.parse(row.antonyms) : [],
      tags: [],
      audioPath: row.audio_path
    };
  }

  /**
   * Helper: Map database row to WordProgress object
   */
  private mapProgressFromRow(row: any): WordProgress {
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
}
