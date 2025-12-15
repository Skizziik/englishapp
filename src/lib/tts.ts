/**
 * TTS Service - Chatterbox-Turbo озвучивание слов
 */

interface TTSStatus {
  available: boolean;
  modelLoaded: boolean;
  device: string;
}

class TTSService {
  private status: TTSStatus | null = null;
  private isInitializing: boolean = false;
  private audioCache: Map<string, string> = new Map(); // text -> base64 audio
  private currentAudio: HTMLAudioElement | null = null;
  private autoStart: boolean = false; // Don't auto-start, user must enable in settings

  /**
   * Проверить статус TTS сервера
   */
  async checkStatus(): Promise<TTSStatus> {
    if (!window.electronAPI?.tts) {
      return { available: false, modelLoaded: false, device: 'none' };
    }

    try {
      this.status = await window.electronAPI.tts.getStatus();
      return this.status;
    } catch {
      this.status = { available: false, modelLoaded: false, device: 'none' };
      return this.status;
    }
  }

  /**
   * Инициализировать TTS сервер (запустить Python процесс)
   */
  async initialize(): Promise<boolean> {
    if (this.isInitializing) {
      return false;
    }

    if (!window.electronAPI?.tts) {
      console.error('TTS API not available');
      return false;
    }

    this.isInitializing = true;

    try {
      const result = await window.electronAPI.tts.start();
      this.isInitializing = false;

      if (result.success) {
        this.status = await this.checkStatus();
        return true;
      } else {
        console.error('Failed to start TTS:', result.error);
        return false;
      }
    } catch (error) {
      console.error('TTS initialization error:', error);
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Предзагрузить модель (для быстрого первого использования)
   */
  async preload(): Promise<boolean> {
    if (!window.electronAPI?.tts) {
      return false;
    }

    try {
      const result = await window.electronAPI.tts.preload();
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Воспроизвести base64 аудио
   */
  private async playBase64Audio(base64: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Останавливаем текущее аудио если есть
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          resolve(true);
        };

        audio.onerror = () => {
          this.currentAudio = null;
          resolve(false);
        };

        audio.play().catch(() => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Озвучить текст используя Chatterbox-Turbo
   * Закэшированные файлы воспроизводятся без сервера!
   */
  async speak(text: string): Promise<boolean> {
    if (!window.electronAPI?.tts) {
      console.error('TTS API not available');
      return false;
    }

    // Проверяем кэш в памяти
    const cached = this.audioCache.get(text);
    if (cached) {
      return this.playBase64Audio(cached);
    }

    // Пробуем получить аудио - electron сначала проверит файловый кэш
    // Если файл есть на диске - воспроизведёт без сервера
    try {
      const result = await window.electronAPI.tts.speak(text);

      if (result.success && result.audio) {
        // Кэшируем результат в памяти
        this.audioCache.set(text, result.audio);
        return this.playBase64Audio(result.audio);
      } else {
        // Нет кэша и сервер не запущен - тихо возвращаем false
        return false;
      }
    } catch (error) {
      // Ошибка - вероятно сервер не запущен и кэша нет
      return false;
    }
  }

  /**
   * Остановить текущее воспроизведение
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  /**
   * Очистить кэш аудио
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * Получить статус TTS
   */
  getStatus(): TTSStatus | null {
    return this.status;
  }

  /**
   * Проверить доступен ли Chatterbox
   */
  isAvailable(): boolean {
    return this.status?.available || false;
  }
}

// Синглтон
export const tts = new TTSService();

/**
 * Хелпер-функция для быстрого использования
 */
export async function speak(text: string): Promise<boolean> {
  return tts.speak(text);
}

/**
 * Хелпер для остановки воспроизведения
 */
export function stopSpeaking(): void {
  tts.stop();
}

/**
 * Извлечь только английский текст из ответа LLM
 * Удаляет русский текст в скобках, эмодзи, и другие не-английские части
 */
export function extractEnglishText(text: string): string {
  // Удаляем текст в скобках (обычно русский перевод)
  let result = text.replace(/\([^)]*[а-яА-ЯёЁ][^)]*\)/g, '');

  // Удаляем строки содержащие только кириллицу
  result = result.split('\n')
    .filter(line => {
      // Пропускаем строки которые содержат преимущественно кириллицу
      const cyrillicMatches = line.match(/[а-яА-ЯёЁ]/g) || [];
      const latinMatches = line.match(/[a-zA-Z]/g) || [];
      // Если кириллицы больше чем латиницы - пропускаем
      return latinMatches.length >= cyrillicMatches.length || latinMatches.length > 0;
    })
    .join('\n');

  // Удаляем оставшиеся кириллические слова
  result = result.replace(/[а-яА-ЯёЁ]+/g, '');

  // Удаляем эмодзи
  result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '');

  // Удаляем markdown форматирование
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
  result = result.replace(/\*([^*]+)\*/g, '$1'); // *italic*

  // Очищаем лишние пробелы и пунктуацию
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/^\s*[,.:;!?-]+\s*/g, '');
  result = result.replace(/\s*[,.:;!?-]+\s*$/g, '');

  return result;
}

/**
 * Озвучить текст без кеширования (для динамических ответов LLM)
 */
export async function speakWithoutCache(text: string): Promise<boolean> {
  if (!window.electronAPI?.tts) {
    return false;
  }

  try {
    // Напрямую запрашиваем озвучку без проверки/сохранения в кэш
    const result = await window.electronAPI.tts.speakNoCache?.(text);

    if (result?.success && result.audio) {
      // Воспроизводим напрямую без кеширования
      return new Promise((resolve) => {
        try {
          const audio = new Audio(`data:audio/wav;base64,${result.audio}`);
          audio.onended = () => resolve(true);
          audio.onerror = () => resolve(false);
          audio.play().catch(() => resolve(false));
        } catch {
          resolve(false);
        }
      });
    }

    // Fallback: используем обычный speak если speakNoCache не доступен
    return tts.speak(text);
  } catch {
    return false;
  }
}

/**
 * Разбить текст на предложения
 */
function splitIntoSentences(text: string): string[] {
  // Разбиваем по точкам, вопросам, восклицаниям, но сохраняем знаки
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

/**
 * Озвучить ответ LLM по предложениям (для более быстрого отклика)
 * Генерирует и воспроизводит предложения последовательно с перекрытием:
 * - Генерируем предложение 1
 * - Начинаем воспроизводить 1, одновременно генерируем 2
 * - Когда 1 закончилось, воспроизводим 2, генерируем 3
 * - и т.д.
 */
export async function speakLLMResponse(text: string): Promise<boolean> {
  const englishOnly = extractEnglishText(text);
  if (!englishOnly || englishOnly.length < 3) {
    return false;
  }

  if (!window.electronAPI?.tts) {
    return false;
  }

  const sentences = splitIntoSentences(englishOnly);
  if (sentences.length === 0) {
    return false;
  }

  // Воспроизвести аудио (возвращает Promise который резолвится когда закончится)
  const playAudio = (audio: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audioEl = new Audio(`data:audio/wav;base64,${audio}`);
        audioEl.onended = () => resolve();
        audioEl.onerror = () => resolve();
        audioEl.play().catch(() => resolve());
      } catch {
        resolve();
      }
    });
  };

  // Генерировать аудио для предложения
  const generateAudio = async (sentence: string): Promise<string | null> => {
    try {
      const result = await window.electronAPI!.tts.speakNoCache?.(sentence);
      if (result?.success && result.audio) {
        return result.audio;
      }
    } catch {
      // Ошибка генерации
    }
    return null;
  };

  // Пайплайн: генерируем следующее пока воспроизводится текущее
  let currentPlayPromise: Promise<void> | null = null;
  let nextAudioPromise: Promise<string | null> | null = null;

  for (let i = 0; i < sentences.length; i++) {
    // Если это первое предложение - просто генерируем
    // Если нет - используем заранее запущенную генерацию
    let audio: string | null;

    if (nextAudioPromise) {
      audio = await nextAudioPromise;
    } else {
      audio = await generateAudio(sentences[i]);
    }

    // Запускаем генерацию следующего предложения пока будем воспроизводить текущее
    if (i + 1 < sentences.length) {
      nextAudioPromise = generateAudio(sentences[i + 1]);
    } else {
      nextAudioPromise = null;
    }

    // Ждём окончания предыдущего воспроизведения
    if (currentPlayPromise) {
      await currentPlayPromise;
    }

    // Воспроизводим текущее (не ждём окончания, чтобы генерация следующего шла параллельно)
    if (audio) {
      currentPlayPromise = playAudio(audio);
    }
  }

  // Ждём окончания последнего воспроизведения
  if (currentPlayPromise) {
    await currentPlayPromise;
  }

  return true;
}
