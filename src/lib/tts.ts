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
