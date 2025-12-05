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
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

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

  getMaskedApiKey(): string | null {
    if (!this.apiKey) return null;
    // Show first 4 and last 4 characters, mask the rest
    if (this.apiKey.length <= 8) {
      return '••••••••';
    }
    const first = this.apiKey.slice(0, 4);
    const last = this.apiKey.slice(-4);
    return `${first}${'•'.repeat(20)}${last}`;
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
  async explainWord(word: string, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    const prompt = `You are a ${langName} teacher for Russian-speaking students. Explain the ${langName} word "${word}".

Respond in Russian. Format your answer as:
1. **Основное значение**: (brief explanation in Russian)
2. **Часть речи**: (noun/verb/adjective etc.)
3. **Произношение**: (phonetic transcription)
4. **Как запомнить**: (mnemonic or association)
5. **Типичные ошибки**: (common mistakes to avoid)
6. **Похожие слова**: (synonyms or commonly confused words)

Be concise and use simple Russian language.`;

    return this.makeRequest(prompt);
  }

  /**
   * Generate example sentences with translations
   */
  async generateExamples(word: string, count: number = 3, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    const langFlag = targetLanguage === 'it' ? '🇮🇹' : '🇬🇧';
    const prompt = `You are a ${langName} teacher. Create ${count} example sentences using the ${langName} word "${word}".

Requirements:
- Natural, useful sentences
- Different difficulty levels: easy, medium, advanced
- Show different contexts of usage

Format each example as:
${langFlag} [${langName} sentence]
🇷🇺 [Russian translation]
💡 [brief context note in Russian]

Start directly with examples, no introduction needed.`;

    return this.makeRequest(prompt);
  }

  /**
   * Check grammar and provide corrections
   */
  async checkGrammar(text: string, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    const prompt = `You are a ${langName} grammar checker for Russian-speaking students. Check the grammar in this text:

"${text}"

Respond in Russian. Format:
1. **Оценка**: (хорошо/есть ошибки/нужна доработка)
2. **Исправленный текст**: (corrected version if needed)
3. **Ошибки**:
   - [error]: explanation and grammar rule
4. **Советы**: (tips to improve)

If no errors, praise and suggest improvements.`;

    return this.makeRequest(prompt);
  }

  /**
   * Have a conversation for practice
   */
  async chat(messages: GeminiMessage[], targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    // Build conversation context
    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'Student' : 'Teacher'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are a friendly ${langName} teacher for Russian-speaking students.

Rules:
- Respond primarily in ${langName}, but add brief Russian explanations in parentheses when helpful
- Gently correct student errors with explanations
- Keep the conversation going, ask follow-up questions
- Adapt vocabulary to student's level
- If student writes in Russian, encourage them to try in ${langName}
- Be supportive and encouraging

Conversation history:
${conversationHistory}

Continue as the teacher:`;

    return this.makeRequest(systemPrompt);
  }

  /**
   * Generate a personalized word list based on user interests
   */
  async generateWordList(topic: string, level: string, count: number = 10, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    const prompt = `You are a ${langName} teacher. Create a list of ${count} ${langName} words about "${topic}" for ${level} level students.

Format each word as:
📝 **[word]** /phonetic transcription/
   Перевод: [Russian translation]
   Пример: [short example sentence]

Choose useful, commonly used words. Start with easier ones.`;

    return this.makeRequest(prompt);
  }
}
