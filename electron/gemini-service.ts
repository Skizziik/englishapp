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
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent';

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

  private async makeRequest(prompt: string, maxTokens: number = 1024): Promise<GeminiResponse> {
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
            temperature: 0.3,
            maxOutputTokens: maxTokens,
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

  /**
   * Generate context sentences from famous books and movies
   */
  async generateContextSentences(word: string, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    const langFlag = targetLanguage === 'it' ? '🇮🇹' : '🇬🇧';

    const booksAndMovies = targetLanguage === 'it'
      ? `
Famous Italian sources:
- Books: "Il nome della rosa" (Umberto Eco), "La Divina Commedia" (Dante), "Il Gattopardo" (Giuseppe di Lampedusa), "Se questo è un uomo" (Primo Levi), "I Promessi Sposi" (Manzoni)
- Movies: "La vita è bella", "Cinema Paradiso", "La dolce vita", "Il Padrino", "Caro Diario"
- TV Series: "Gomorra", "Suburra", "L'amica geniale", "Baby", "DOC - Nelle tue mani"
`
      : `
Famous English sources:
- Books: "Harry Potter" (J.K. Rowling), "The Lord of the Rings" (Tolkien), "Pride and Prejudice" (Austen), "1984" (Orwell), "The Great Gatsby" (Fitzgerald), "To Kill a Mockingbird" (Harper Lee), "Sherlock Holmes" (Doyle)
- Movies: "The Shawshank Redemption", "Forrest Gump", "The Godfather", "Pulp Fiction", "Titanic", "Star Wars", "The Dark Knight", "Inception"
- TV Series: "Friends", "Game of Thrones", "Breaking Bad", "The Office", "Stranger Things", "Sherlock", "The Crown"
`;

    const prompt = `You are a ${langName} literature and cinema expert. Find or create authentic-feeling example sentences with the word "${word}" that could appear in famous books, movies, or TV series.
${booksAndMovies}
Generate 4 context sentences in this exact JSON format:
{
  "contexts": [
    {
      "sentence": "[${langName} sentence with the word]",
      "translation": "[Russian translation]",
      "source": "[Name of the book/movie/series]",
      "sourceType": "book|movie|series",
      "character": "[Character name if applicable, or null]",
      "year": "[Year of release/publication]",
      "note": "[Brief explanation in Russian why this context is interesting for learning]"
    }
  ]
}

Rules:
- Create sentences that feel authentic to the source's style and era
- Include at least one from a book, one from a movie, and one from a TV series
- Make sentences that demonstrate how the word is used in natural context
- Sentences should be memorable and help learn the word better
- Character quotes should match their personality
- Respond ONLY with valid JSON, no markdown formatting`;

    return this.makeRequest(prompt);
  }

  /**
   * Get word usage statistics and interesting facts
   */
  async getWordInsights(word: string, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';
    const prompt = `You are a ${langName} language expert. Provide interesting insights about the word "${word}".

Respond in Russian with this structure:
📊 **Частота использования**: [common/rare/very common]
📜 **Происхождение**: [brief etymology]
🎭 **Интересный факт**: [an interesting fact about this word]
🔄 **Эволюция значения**: [how the meaning changed over time, if applicable]
⚠️ **Важно знать**: [cultural context or usage warnings]

Keep it concise and engaging.`;

    return this.makeRequest(prompt);
  }

  /**
   * Analyze user's learning patterns and provide personalized recommendations
   */
  async analyzeProgress(stats: {
    totalWords: number;
    learnedWords: number;
    learningWords: number;
    totalXP: number;
    streak: number;
    accuracy: number;
    difficultWords: string[];
    strongCategories: string[];
    weakCategories: string[];
    averageSessionTime: number;
    sessionsPerWeek: number;
  }, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';

    const prompt = `You are a personalized ${langName} learning coach for a Russian-speaking student. Analyze their learning progress and provide personalized recommendations.

Student's current progress:
- Total words in vocabulary: ${stats.totalWords}
- Words learned: ${stats.learnedWords}
- Words in progress: ${stats.learningWords}
- Total XP: ${stats.totalXP}
- Current streak: ${stats.streak} days
- Overall accuracy: ${stats.accuracy}%
- Average session time: ${stats.averageSessionTime} minutes
- Sessions per week: ${stats.sessionsPerWeek}
- Words they struggle with: ${stats.difficultWords.join(', ') || 'none identified'}
- Strong categories: ${stats.strongCategories.join(', ') || 'none yet'}
- Weak categories: ${stats.weakCategories.join(', ') || 'none identified'}

Provide a personalized analysis in Russian in this JSON format:
{
  "level": "beginner|intermediate|advanced",
  "strengths": ["strength 1", "strength 2"],
  "areasToImprove": ["area 1", "area 2"],
  "recommendations": [
    {
      "type": "focus|practice|habit|tip",
      "title": "Short title",
      "description": "Detailed recommendation",
      "priority": "high|medium|low"
    }
  ],
  "weeklyGoal": {
    "wordsToLearn": number,
    "reviewSessions": number,
    "focusArea": "category or skill to focus on"
  },
  "motivation": "A short motivational message personalized to their progress",
  "nextMilestone": {
    "description": "Next achievement to aim for",
    "wordsNeeded": number
  }
}

Base your recommendations on their actual stats. Be encouraging but realistic.
Respond ONLY with valid JSON, no markdown formatting.`;

    return this.makeRequest(prompt);
  }

  /**
   * Generate personalized learning tips based on specific mistakes
   */
  async analyzeMistakes(mistakes: Array<{
    word: string;
    correctAnswer: string;
    userAnswer: string;
    timestamp: string;
  }>, targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';

    const mistakesList = mistakes
      .map(m => `- "${m.word}": expected "${m.correctAnswer}", user answered "${m.userAnswer}"`)
      .join('\n');

    const prompt = `You are a ${langName} teacher analyzing a student's mistakes. Here are their recent errors:

${mistakesList}

Analyze patterns in these mistakes and provide advice in Russian in this JSON format:
{
  "patterns": [
    {
      "type": "spelling|meaning|confusion|grammar",
      "description": "Description of the pattern",
      "affectedWords": ["word1", "word2"],
      "tip": "How to avoid this mistake"
    }
  ],
  "commonConfusions": [
    {
      "words": ["word1", "word2"],
      "explanation": "Why these are often confused",
      "mnemonic": "Memory trick to remember the difference"
    }
  ],
  "practiceRecommendation": "What to practice to improve"
}

Respond ONLY with valid JSON, no markdown formatting.`;

    return this.makeRequest(prompt);
  }

  /**
   * Voice chat mode - conversational English practice with short responses
   * Designed for real-time voice conversation with TTS
   */
  async voiceChat(messages: GeminiMessage[], targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'Italian' : 'English';

    // Build conversation context
    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are a friendly ${langName} conversation partner and tutor for a Russian-speaking student practicing speaking.

CRITICAL RULES FOR VOICE CONVERSATION:
1. Keep responses SHORT (1-3 sentences max) - this is a voice chat, not text
2. Speak ONLY in ${langName} - no Russian translations
3. Be natural and conversational, like a native friend
4. Gently correct errors by rephrasing correctly, don't explain grammar
5. Ask follow-up questions to keep the conversation flowing
6. Match student's energy - if they're casual, be casual
7. Use simple vocabulary appropriate to their level
8. If they struggle, simplify your language
9. React naturally to what they say (surprise, interest, agreement)
10. NO bullet points, NO lists, NO formatted text - just natural speech

CONVERSATION STYLE:
- Like chatting with a friendly native speaker
- Encourage them to speak more
- Be warm and supportive
- Use contractions and natural speech patterns
- React emotionally to their stories

Conversation so far:
${conversationHistory}

Respond as the tutor (remember: SHORT, natural, ${langName} only):`;

    // Lower max tokens for shorter responses
    return this.makeRequest(systemPrompt, 150);
  }

  /**
   * Process a batch of words for YouTube import
   * Returns translations, levels, and transcriptions
   */
  async processWordsBatch(words: string[], targetLanguage: string = 'en'): Promise<GeminiResponse> {
    const langName = targetLanguage === 'it' ? 'итальянского' : 'английского';

    const prompt = `Проанализируй следующие слова ${langName} языка и верни JSON массив.
Для каждого слова определи:
- word: само слово (как в списке)
- level: уровень CEFR (A1, A2, B1, B2, C1, C2) - определи реальный уровень сложности
- translation: перевод на русский (основное значение, одно-два слова)
- partOfSpeech: часть речи на английском (noun, verb, adjective, adverb, preposition, conjunction, other)
- transcription: транскрипция (для английского в формате IPA типа /wɜːrd/, для итальянского с ударением)

Слова для анализа: ${words.join(', ')}

ВАЖНО:
- Верни ТОЛЬКО валидный JSON массив без markdown и без \`\`\`
- Каждое слово должно быть в результате
- Уровень определяй реально: простые слова (cat, dog, house) = A1, сложные (sophisticated, eloquent) = C1/C2

Формат ответа:
[{"word":"example","level":"B1","translation":"пример","partOfSpeech":"noun","transcription":"/ɪɡˈzɑːmpl/"}]`;

    // Увеличенный лимит токенов для обработки слов
    return this.makeRequest(prompt, 4096);
  }
}
