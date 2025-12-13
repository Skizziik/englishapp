import { GeminiService } from './gemini-service';
import { DatabaseManager } from './database';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { app } from 'electron';

export interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

export interface ExtractedWord {
  word: string;
  frequency: number; // How many times it appears in the video
  contexts: string[]; // Sentences where it appears
}

export interface ProcessedWord extends ExtractedWord {
  level: string;
  translation: string;
  transcription?: string;
  partOfSpeech?: string;
  exists: boolean; // Already in dictionary
  inProgress: boolean; // User already learning this word
}

export interface YouTubeImportResult {
  success: boolean;
  error?: string;
  videoTitle?: string;
  videoId?: string;
  language?: string;
  totalWords?: number;
  uniqueWords?: number;
  newWords?: ProcessedWord[];
  existingWords?: ProcessedWord[];
}

// Common words to exclude (stop words)
const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'if', 'because', 'while', 'although', 'though', 'after', 'before', 'since', 'until',
  'unless', 'about', 'into', 'through', 'during', 'above', 'below', 'between', 'under',
  'again', 'further', 'once', 'any', 'anything', 'everything', 'nothing', 'something',
  'anyone', 'everyone', 'someone', 'nobody', 'up', 'down', 'out', 'off', 'over',
  'like', 'get', 'got', 'go', 'going', 'gone', 'come', 'came', 'make', 'made',
  'take', 'took', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'say', 'said',
  'tell', 'told', 'give', 'gave', 'find', 'found', 'let', 'put', 'thing', 'things',
  'well', 'back', 'way', 'even', 'new', 'want', 'first', 'last', 'long', 'great',
  'little', 'own', 'old', 'right', 'big', 'high', 'different', 'small', 'large',
  'next', 'early', 'young', 'important', 'public', 'bad', 'same', 'able', 'okay', 'ok',
  'yeah', 'yes', 'no', 'oh', 'uh', 'um', 'ah', 'hey', 'hi', 'hello', 'bye', 'please',
  'thank', 'thanks', 'sorry', 'really', 'actually', 'probably', 'maybe', 'definitely',
  'always', 'never', 'sometimes', 'often', 'usually', 'already', 'still', 'yet', "don't",
  "doesn't", "didn't", "won't", "wouldn't", "couldn't", "shouldn't", "can't", "isn't",
  "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't", "i'm", "you're", "he's",
  "she's", "it's", "we're", "they're", "i've", "you've", "we've", "they've", "i'll",
  "you'll", "he'll", "she'll", "we'll", "they'll", "i'd", "you'd", "he'd", "she'd",
  "we'd", "they'd", "that's", "there's", "here's", "what's", "who's", "let's", "gonna",
  "gotta", "wanna", "kinda", "sorta", "dunno", "cause", "'cause", "cuz", "em", "'em"
]);

const STOP_WORDS_IT = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'o', 'ma', 'se', 'che',
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'non', 'più', 'anche',
  'come', 'dove', 'quando', 'perché', 'cosa', 'chi', 'quale', 'quanto', 'questo',
  'quello', 'qui', 'qua', 'là', 'lì', 'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro',
  'mi', 'ti', 'ci', 'vi', 'si', 'ne', 'lo', 'la', 'li', 'le', 'mio', 'tuo', 'suo',
  'nostro', 'vostro', 'loro', 'essere', 'avere', 'fare', 'dire', 'andare', 'venire',
  'vedere', 'sapere', 'potere', 'volere', 'dovere', 'stare', 'è', 'sono', 'sei', 'siamo',
  'siete', 'era', 'ero', 'eravamo', 'hanno', 'ha', 'ho', 'hai', 'abbiamo', 'avete',
  'bene', 'male', 'molto', 'poco', 'troppo', 'tanto', 'tutto', 'niente', 'nulla',
  'qualcosa', 'qualcuno', 'nessuno', 'ognuno', 'altro', 'stesso', 'proprio', 'solo',
  'già', 'ancora', 'sempre', 'mai', 'ora', 'adesso', 'poi', 'prima', 'dopo', 'così',
  'allora', 'quindi', 'però', 'dunque', 'oppure', 'cioè', 'infatti', 'comunque',
  'sì', 'no', 'forse', 'magari', 'ecco', 'oh', 'ah', 'eh', 'beh', 'ciao', 'grazie',
  'prego', 'scusa', 'scusi'
]);

export class YouTubeImportService {
  private geminiService: GeminiService;
  private database: DatabaseManager;

  constructor(geminiService: GeminiService, database: DatabaseManager) {
    this.geminiService = geminiService;
    this.database = database;
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Get yt-dlp executable path
   */
  private getYtDlpPath(): string {
    // Check if yt-dlp is bundled with the app
    const resourcesPath = app.isPackaged
      ? path.join(process.resourcesPath, 'yt-dlp')
      : path.join(__dirname, '..', 'resources', 'yt-dlp');

    const isWin = process.platform === 'win32';
    const ytdlpExe = isWin ? 'yt-dlp.exe' : 'yt-dlp';

    // Check bundled path
    const bundledPath = path.join(resourcesPath, ytdlpExe);
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }

    // Fallback to system-installed yt-dlp
    return ytdlpExe;
  }

  /**
   * Fetch transcript from YouTube video using yt-dlp
   */
  async fetchTranscript(url: string, targetLanguage: string): Promise<{ success: boolean; transcript?: TranscriptItem[]; language?: string; error?: string }> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return { success: false, error: 'Неверная ссылка на YouTube видео' };
      }

      const ytdlpPath = this.getYtDlpPath();
      const tempDir = os.tmpdir();
      const outputBase = path.join(tempDir, `youtube_subs_${videoId}_${Date.now()}`);

      // Determine subtitle language preferences
      const subLangs = targetLanguage === 'it'
        ? 'it,en,it-orig,en-orig'
        : 'en,en-orig,en-US,en-GB,it,it-orig';

      return new Promise((resolve) => {
        // First, try to get manual subtitles
        const args = [
          '--write-subs',
          '--write-auto-subs',
          '--sub-langs', subLangs,
          '--sub-format', 'json3',
          '--skip-download',
          '-o', outputBase,
          `https://www.youtube.com/watch?v=${videoId}`
        ];

        console.log('Running yt-dlp with args:', args.join(' '));

        const ytdlp = spawn(ytdlpPath, args, {
          windowsHide: true,
          timeout: 60000
        });

        let stderr = '';
        let stdout = '';

        ytdlp.stdout.on('data', (data) => {
          stdout += data.toString();
          console.log('yt-dlp stdout:', data.toString());
        });

        ytdlp.stderr.on('data', (data) => {
          stderr += data.toString();
          console.log('yt-dlp stderr:', data.toString());
        });

        ytdlp.on('error', (error) => {
          console.error('yt-dlp spawn error:', error);
          if (error.message.includes('ENOENT')) {
            resolve({
              success: false,
              error: 'yt-dlp не найден. Установите yt-dlp: https://github.com/yt-dlp/yt-dlp#installation'
            });
          } else {
            resolve({ success: false, error: `Ошибка запуска yt-dlp: ${error.message}` });
          }
        });

        ytdlp.on('close', async (code) => {
          console.log('yt-dlp exited with code:', code);

          // Find the downloaded subtitle file
          const files = fs.readdirSync(tempDir).filter(f =>
            f.startsWith(`youtube_subs_${videoId}`) && f.endsWith('.json3')
          );

          if (files.length === 0) {
            // Try vtt format as fallback
            const vttFiles = fs.readdirSync(tempDir).filter(f =>
              f.startsWith(`youtube_subs_${videoId}`) && (f.endsWith('.vtt') || f.endsWith('.srt'))
            );

            if (vttFiles.length === 0) {
              resolve({
                success: false,
                error: 'Субтитры для этого видео недоступны. Попробуйте видео с субтитрами.'
              });
              return;
            }

            // Parse VTT/SRT
            const vttPath = path.join(tempDir, vttFiles[0]);
            const transcript = this.parseVttSubtitles(vttPath);
            this.cleanupTempFiles(tempDir, videoId);

            if (transcript.length === 0) {
              resolve({ success: false, error: 'Субтитры пусты' });
              return;
            }

            const sampleText = transcript.slice(0, 20).map(t => t.text).join(' ');
            const language = this.detectLanguage(sampleText);

            resolve({ success: true, transcript, language });
            return;
          }

          // Parse JSON3 subtitles
          const subPath = path.join(tempDir, files[0]);
          try {
            const content = fs.readFileSync(subPath, 'utf8');
            const data = JSON.parse(content);

            const transcript: TranscriptItem[] = [];

            if (data.events) {
              for (const event of data.events) {
                if (event.segs) {
                  const text = event.segs
                    .map((seg: any) => seg.utf8 || '')
                    .join('')
                    .trim();

                  if (text && text !== '\n') {
                    transcript.push({
                      text: text.replace(/\n/g, ' ').trim(),
                      offset: (event.tStartMs || 0) / 1000,
                      duration: ((event.dDurationMs || 0) / 1000)
                    });
                  }
                }
              }
            }

            this.cleanupTempFiles(tempDir, videoId);

            if (transcript.length === 0) {
              resolve({ success: false, error: 'Субтитры пусты' });
              return;
            }

            const sampleText = transcript.slice(0, 20).map(t => t.text).join(' ');
            const language = this.detectLanguage(sampleText);

            resolve({ success: true, transcript, language });
          } catch (parseError) {
            console.error('Subtitle parse error:', parseError);
            this.cleanupTempFiles(tempDir, videoId);
            resolve({ success: false, error: 'Ошибка парсинга субтитров' });
          }
        });
      });
    } catch (error: any) {
      console.error('YouTube transcript error:', error);
      return { success: false, error: error.message || 'Неизвестная ошибка' };
    }
  }

  /**
   * Parse VTT/SRT subtitle file
   */
  private parseVttSubtitles(filePath: string): TranscriptItem[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const transcript: TranscriptItem[] = [];

      // Simple VTT/SRT parser
      const lines = content.split('\n');
      let currentText = '';
      let currentTime = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip WEBVTT header and empty lines
        if (!trimmedLine || trimmedLine === 'WEBVTT' || /^\d+$/.test(trimmedLine)) {
          continue;
        }

        // Parse timestamp line
        const timeMatch = trimmedLine.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->/);
        if (timeMatch) {
          // Save previous text if exists
          if (currentText) {
            transcript.push({
              text: currentText.trim(),
              offset: currentTime,
              duration: 0
            });
          }

          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const ms = parseInt(timeMatch[4]);
          currentTime = hours * 3600 + minutes * 60 + seconds + ms / 1000;
          currentText = '';
          continue;
        }

        // Also handle mm:ss format
        const shortTimeMatch = trimmedLine.match(/(\d{2}):(\d{2})[.,](\d{3})\s*-->/);
        if (shortTimeMatch) {
          if (currentText) {
            transcript.push({
              text: currentText.trim(),
              offset: currentTime,
              duration: 0
            });
          }

          const minutes = parseInt(shortTimeMatch[1]);
          const seconds = parseInt(shortTimeMatch[2]);
          const ms = parseInt(shortTimeMatch[3]);
          currentTime = minutes * 60 + seconds + ms / 1000;
          currentText = '';
          continue;
        }

        // Text line
        if (trimmedLine && !trimmedLine.includes('-->')) {
          // Remove formatting tags
          const cleanText = trimmedLine
            .replace(/<[^>]+>/g, '')
            .replace(/\{[^}]+\}/g, '');
          if (cleanText) {
            currentText += (currentText ? ' ' : '') + cleanText;
          }
        }
      }

      // Add last text
      if (currentText) {
        transcript.push({
          text: currentText.trim(),
          offset: currentTime,
          duration: 0
        });
      }

      return transcript;
    } catch (error) {
      console.error('VTT parse error:', error);
      return [];
    }
  }

  /**
   * Clean up temporary subtitle files
   */
  private cleanupTempFiles(tempDir: string, videoId: string): void {
    try {
      const files = fs.readdirSync(tempDir).filter(f =>
        f.startsWith(`youtube_subs_${videoId}`)
      );
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Simple language detection based on common words
   */
  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();

    // Count Italian specific words
    const italianWords = ['che', 'sono', 'della', 'nella', 'questo', 'quello', 'perché', 'quando', 'anche', 'come', 'essere', 'fare', 'dire'];
    const italianCount = italianWords.filter(w => new RegExp(`\\b${w}\\b`).test(lowerText)).length;

    // Count English specific words
    const englishWords = ['the', 'and', 'that', 'this', 'what', 'have', 'with', 'from', 'they', 'been', 'would', 'could'];
    const englishCount = englishWords.filter(w => new RegExp(`\\b${w}\\b`).test(lowerText)).length;

    return italianCount > englishCount ? 'it' : 'en';
  }

  /**
   * Extract unique words from transcript
   */
  extractWords(transcript: TranscriptItem[], language: string): ExtractedWord[] {
    const wordMap = new Map<string, { frequency: number; contexts: Set<string> }>();
    const stopWords = language === 'it' ? STOP_WORDS_IT : STOP_WORDS_EN;

    for (const item of transcript) {
      // Clean and tokenize text
      const text = item.text
        .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
        .replace(/♪/g, '')
        .replace(/&#39;/g, "'") // Fix HTML entities
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/[^\p{L}\s'-]/gu, ' ') // Keep letters, spaces, apostrophes, hyphens
        .toLowerCase();

      const words = text.split(/\s+/).filter(w => w.length > 2);

      for (const word of words) {
        // Skip stop words and numbers
        if (stopWords.has(word) || /^\d+$/.test(word)) continue;

        // Skip words with weird characters
        if (!/^[\p{L}'-]+$/u.test(word)) continue;

        if (!wordMap.has(word)) {
          wordMap.set(word, { frequency: 0, contexts: new Set() });
        }

        const entry = wordMap.get(word)!;
        entry.frequency++;

        // Add context sentence (limit to 3)
        if (entry.contexts.size < 3) {
          const cleanContext = item.text
            .replace(/\[.*?\]/g, '')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .trim();
          if (cleanContext.length > 10) {
            entry.contexts.add(cleanContext);
          }
        }
      }
    }

    // Convert to array and sort by frequency
    return Array.from(wordMap.entries())
      .map(([word, data]) => ({
        word,
        frequency: data.frequency,
        contexts: Array.from(data.contexts)
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Check which words already exist in the database
   */
  async checkExistingWords(words: string[], targetLanguage: string): Promise<{ existing: Set<string>; inProgress: Set<string> }> {
    const existing = new Set<string>();
    const inProgress = new Set<string>();

    // Get all words from database for this language
    const dbWords = this.database.getWords({ targetLanguage, limit: 50000 });
    const dbWordSet = new Set(dbWords.map(w => w.word.toLowerCase()));

    // Get words user is currently learning
    const progressWords = this.database['db'].prepare(`
      SELECT w.word FROM words w
      INNER JOIN user_progress up ON w.id = up.word_id
      WHERE w.target_language = ?
    `).all(targetLanguage) as any[];
    const progressSet = new Set(progressWords.map(w => w.word.toLowerCase()));

    for (const word of words) {
      const lowerWord = word.toLowerCase();
      if (dbWordSet.has(lowerWord)) {
        existing.add(lowerWord);
      }
      if (progressSet.has(lowerWord)) {
        inProgress.add(lowerWord);
      }
    }

    return { existing, inProgress };
  }

  /**
   * Process words with Gemini to get translations and levels
   * Processes in batches of 25 words to avoid token limits
   */
  async processWordsWithAI(words: ExtractedWord[], targetLanguage: string): Promise<ProcessedWord[]> {
    if (!this.geminiService.isConfigured()) {
      throw new Error('Gemini API не настроен. Настройте его в разделе Настройки.');
    }

    const BATCH_SIZE = 25;
    const aiMap = new Map<string, { level: string; translation: string; partOfSpeech: string; transcription: string }>();

    // Process words in batches
    const wordList = words.map(w => w.word);
    const totalBatches = Math.ceil(wordList.length / BATCH_SIZE);

    console.log(`Processing ${wordList.length} words in ${totalBatches} batches...`);

    for (let i = 0; i < wordList.length; i += BATCH_SIZE) {
      const batch = wordList.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`Processing batch ${batchNum}/${totalBatches}: ${batch.length} words`);

      try {
        const response = await this.geminiService.processWordsBatch(batch, targetLanguage);

        if (!response.success || !response.data) {
          console.error(`Batch ${batchNum} failed:`, response.error);
          continue;
        }

        // Parse response - clean up any markdown formatting
        let cleanedData = response.data
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        // Try to extract JSON array if there's extra text
        const jsonMatch = cleanedData.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          cleanedData = jsonMatch[0];
        }

        try {
          const aiResults = JSON.parse(cleanedData) as Array<{
            word: string;
            level: string;
            translation: string;
            partOfSpeech: string;
            transcription: string;
          }>;

          console.log(`Batch ${batchNum} parsed successfully: ${aiResults.length} words`);

          // Add to map
          for (const result of aiResults) {
            if (result.word && result.translation) {
              aiMap.set(result.word.toLowerCase(), {
                level: result.level || 'B1',
                translation: result.translation,
                partOfSpeech: result.partOfSpeech || 'other',
                transcription: result.transcription || ''
              });
            }
          }
        } catch (parseError) {
          console.error(`Batch ${batchNum} JSON parse error:`, parseError);
          console.error('Raw response:', response.data.substring(0, 500));
        }

        // Add small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < wordList.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        console.error(`Batch ${batchNum} error:`, error);
      }
    }

    console.log(`AI processing complete. Got translations for ${aiMap.size}/${wordList.length} words`);

    // Merge AI results with extracted words
    return words.map(extractedWord => {
      const ai = aiMap.get(extractedWord.word.toLowerCase());
      return {
        ...extractedWord,
        level: ai?.level || 'B1',
        translation: ai?.translation || '',
        transcription: ai?.transcription || '',
        partOfSpeech: ai?.partOfSpeech || 'other',
        exists: false,
        inProgress: false
      };
    });
  }

  /**
   * Full import process
   */
  async importFromYouTube(url: string, targetLanguage: string): Promise<YouTubeImportResult> {
    try {
      // 1. Fetch transcript
      const transcriptResult = await this.fetchTranscript(url, targetLanguage);
      if (!transcriptResult.success || !transcriptResult.transcript) {
        return { success: false, error: transcriptResult.error };
      }

      // 2. Extract words
      const extractedWords = this.extractWords(transcriptResult.transcript, targetLanguage);
      if (extractedWords.length === 0) {
        return { success: false, error: 'Не удалось извлечь слова из субтитров' };
      }

      // 3. Check existing words
      const wordStrings = extractedWords.map(w => w.word);
      const { existing, inProgress } = await this.checkExistingWords(wordStrings, targetLanguage);

      // 4. Filter new words (not in database)
      const newExtractedWords = extractedWords.filter(w => !existing.has(w.word.toLowerCase()));
      const existingExtractedWords = extractedWords.filter(w => existing.has(w.word.toLowerCase()));

      // 5. Process new words with AI
      let processedNewWords: ProcessedWord[] = [];
      if (newExtractedWords.length > 0) {
        processedNewWords = await this.processWordsWithAI(newExtractedWords, targetLanguage);
        // Mark which ones are in progress
        processedNewWords.forEach(w => {
          w.inProgress = inProgress.has(w.word.toLowerCase());
        });
      }

      // 6. Mark existing words
      const processedExistingWords: ProcessedWord[] = existingExtractedWords.map(w => ({
        ...w,
        level: '',
        translation: '',
        exists: true,
        inProgress: inProgress.has(w.word.toLowerCase())
      }));

      return {
        success: true,
        videoId: this.extractVideoId(url) || undefined,
        language: transcriptResult.language,
        totalWords: extractedWords.reduce((sum, w) => sum + w.frequency, 0),
        uniqueWords: extractedWords.length,
        newWords: processedNewWords,
        existingWords: processedExistingWords
      };
    } catch (error: any) {
      console.error('YouTube import error:', error);
      return { success: false, error: error.message || 'Неизвестная ошибка' };
    }
  }

  /**
   * Add selected words to the dictionary
   */
  async addWordsToDictionary(words: ProcessedWord[], targetLanguage: string, source: string = 'youtube'): Promise<{ success: boolean; added: number; error?: string }> {
    try {
      let added = 0;

      for (const word of words) {
        if (!word.translation) continue; // Skip words without translation

        // Check if word already exists
        const existingWords = this.database.getWords({
          search: word.word,
          targetLanguage,
          limit: 1
        });

        if (existingWords.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
          continue; // Skip existing
        }

        // Add word to database
        this.database.addWord({
          word: word.word,
          transcription: word.transcription || '',
          partOfSpeech: word.partOfSpeech || 'other',
          level: word.level,
          frequency: word.frequency,
          targetLanguage,
          translations: [word.translation],
          examples: word.contexts.slice(0, 2).map(ctx => ({
            sentence: ctx,
            translation: '' // Would need another AI call to translate
          })),
          tags: [source],
          synonyms: [],
          antonyms: [],
          forms: []
        });

        added++;
      }

      return { success: true, added };
    } catch (error: any) {
      console.error('Add words error:', error);
      return { success: false, added: 0, error: error.message };
    }
  }
}
