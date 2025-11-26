import Store from 'electron-store';

interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

interface GeminiResponse {
  success: boolean;
  data?: string;
  error?: string;
}

const store = new Store({
  encryptionKey: 'english-learning-app-key-2024'
});

export class GeminiService {
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  constructor() {
    // Load API key from secure storage
    this.apiKey = store.get('geminiApiKey') as string | null;
  }

  setApiKey(apiKey: string): boolean {
    try {
      this.apiKey = apiKey;
      store.set('geminiApiKey', apiKey);
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async makeRequest(prompt: string): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'API ключ не настроен' };
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        return {
          success: false,
          error: error.error?.message || 'Ошибка API запроса'
        };
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>
          }
        }>
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return { success: false, error: 'Пустой ответ от API' };
      }

      return { success: true, data: text };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Explain a word in simple terms for Russian speakers
   */
  async explainWord(word: string): Promise<GeminiResponse> {
    const prompt = `Объясни значение английского слова "${word}" для русскоязычного ученика.

Формат ответа:
1. **Основное значение**: (краткое объяснение на русском)
2. **Часть речи**: (noun/verb/adjective и т.д.)
3. **Как запомнить**: (мнемоника или ассоциация)
4. **Типичные ошибки**: (на что обратить внимание)
5. **Похожие слова**: (синонимы или слова, которые часто путают)

Отвечай кратко и понятно, используй простой русский язык.`;

    return this.makeRequest(prompt);
  }

  /**
   * Generate example sentences with translations
   */
  async generateExamples(word: string, count: number = 3): Promise<GeminiResponse> {
    const prompt = `Создай ${count} примера предложений с английским словом "${word}".

Требования:
- Предложения должны быть естественными и полезными
- Разная сложность: простое, среднее, сложное
- Показать разные контексты использования

Формат каждого примера:
🇬🇧 [английское предложение]
🇷🇺 [перевод на русский]
💡 [краткий комментарий о контексте]

Начни сразу с примеров без лишних вступлений.`;

    return this.makeRequest(prompt);
  }

  /**
   * Check grammar and provide corrections
   */
  async checkGrammar(text: string): Promise<GeminiResponse> {
    const prompt = `Проверь грамматику этого английского текста и дай обратную связь на русском языке:

"${text}"

Формат ответа:
1. **Оценка**: (хорошо/есть ошибки/нужна доработка)
2. **Исправленный текст**: (если есть ошибки)
3. **Ошибки**:
   - [ошибка 1]: объяснение и правило
   - [ошибка 2]: объяснение и правило
4. **Советы**: (как улучшить текст)

Если ошибок нет, похвали и предложи как сделать текст ещё лучше.`;

    return this.makeRequest(prompt);
  }

  /**
   * Have a conversation for practice
   */
  async chat(messages: GeminiMessage[]): Promise<GeminiResponse> {
    // Build conversation context
    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'Ученик' : 'Учитель'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Ты — дружелюбный учитель английского языка для русскоязычных учеников.

Правила:
- Отвечай на английском языке, но можешь добавлять пояснения на русском в скобках
- Исправляй ошибки ученика мягко и с объяснениями
- Поддерживай разговор, задавай вопросы
- Используй словарный запас, соответствующий уровню ученика
- Если ученик пишет на русском, попроси его перевести на английский

История разговора:
${conversationHistory}

Продолжи разговор как учитель:`;

    return this.makeRequest(systemPrompt);
  }

  /**
   * Generate a personalized word list based on user interests
   */
  async generateWordList(topic: string, level: string, count: number = 10): Promise<GeminiResponse> {
    const prompt = `Создай список из ${count} английских слов по теме "${topic}" для уровня ${level}.

Формат для каждого слова:
📝 **[слово]** /транскрипция/
   Перевод: [русский перевод]
   Пример: [короткое предложение]

Выбирай полезные, часто используемые слова. Начни с более простых.`;

    return this.makeRequest(prompt);
  }
}
