import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, BookOpen, Volume2, CheckCircle, BookMarked, Clock, Sparkles, Youtube, Trash2, Edit2, Save } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  SearchInput,
  LevelBadge,
} from '@/components/ui';
import { WordCard, ContextSentences } from '@/components/learning';
import type { Word, Category, Level } from '@/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

interface Source {
  id: string;
  name: string;
  count: number;
}

interface WordWithProgress extends Word {
  progress: {
    status: 'new' | 'learning' | 'learned' | 'review';
    correctCount: number;
    wrongCount: number;
    repetitions: number;
    nextReview: string | null;
    lastReview: string | null;
  } | null;
}

interface StatusCount {
  status: string;
  count: number;
}

const STATUS_CONFIG = {
  new: { label: 'Новые', icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  learning: { label: 'Изучаю', icon: BookMarked, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  review: { label: 'На повторении', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  learned: { label: 'Выучено', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
};

export const DictionaryPage: React.FC = () => {
  const { targetLanguage } = useAppStore();
  const [words, setWords] = useState<WordWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Selected word
  const [selectedWord, setSelectedWord] = useState<WordWithProgress | null>(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editTranslation, setEditTranslation] = useState('');
  const [editLevel, setEditLevel] = useState('');

  useEffect(() => {
    loadInitialData();
  }, [targetLanguage]);

  // Reload words when filters change
  useEffect(() => {
    loadWords();
  }, [selectedLevel, selectedCategory, selectedStatus, selectedSource, searchQuery, targetLanguage]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setSelectedLevel(null); // Reset level filter when language changes
    setSelectedSource(null); // Reset source filter when language changes

    if (window.electronAPI) {
      const [categoriesData, levelsData, statusCountsData, sourcesData] = await Promise.all([
        window.electronAPI.words.getCategories(),
        window.electronAPI.words.getLevels(targetLanguage),
        window.electronAPI.words.getStatusCounts(),
        window.electronAPI.words.getSources(targetLanguage),
      ]);
      setCategories(categoriesData);
      setLevels(levelsData);
      setStatusCounts(statusCountsData);
      setSources(sourcesData);
      await loadWords();
    } else {
      // Mock data
      setWords(getMockWords());
      setCategories([
        { id: 'everyday', name: 'Повседневная жизнь', count: 50 },
        { id: 'business', name: 'Бизнес', count: 30 },
        { id: 'travel', name: 'Путешествия', count: 25 },
        { id: 'food', name: 'Еда', count: 20 },
      ]);
      setLevels([
        { level: 'A1', count: 40 },
        { level: 'A2', count: 35 },
        { level: 'B1', count: 30 },
        { level: 'B2', count: 20 },
        { level: 'C1', count: 10 },
      ]);
      setStatusCounts([
        { status: 'new', count: 100 },
        { status: 'learning', count: 20 },
        { status: 'review', count: 10 },
        { status: 'learned', count: 5 },
      ]);
    }

    setIsLoading(false);
  };

  const loadWords = async () => {
    if (!window.electronAPI) return;

    const filters: any = { targetLanguage };
    if (selectedLevel) filters.level = selectedLevel;
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedStatus) filters.status = selectedStatus;
    if (selectedSource) filters.source = selectedSource;
    if (searchQuery) filters.search = searchQuery;

    // Limit to 3000 words max for performance, 100 if no filters
    filters.limit = (selectedLevel || selectedCategory || selectedStatus || selectedSource || searchQuery) ? 3000 : 100;

    const wordsData = await window.electronAPI.words.getWithProgress(filters);
    setWords(wordsData);
  };

  // Words are now loaded with filters from backend, just return them
  const filteredWords = words;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLevel(null);
    setSelectedCategory(null);
    setSelectedStatus(null);
    setSelectedSource(null);
  };

  const hasFilters = searchQuery || selectedLevel || selectedCategory || selectedStatus || selectedSource;

  // Delete word handler
  const handleDeleteWord = async (wordId: string) => {
    if (!window.electronAPI) return;

    const confirmed = window.confirm('Вы уверены, что хотите удалить это слово?');
    if (!confirmed) return;

    const success = await window.electronAPI.words.delete(wordId);
    if (success) {
      setWords(words.filter(w => w.id !== wordId));
      if (selectedWord?.id === wordId) {
        setSelectedWord(null);
      }
      // Reload sources count
      const sourcesData = await window.electronAPI.words.getSources(targetLanguage);
      setSources(sourcesData);
    }
  };

  // Edit word handler
  const handleEditWord = () => {
    if (!selectedWord) return;
    setEditTranslation(selectedWord.translations[0]?.translation || '');
    setEditLevel(selectedWord.level);
    setIsEditing(true);
  };

  // Save edited word
  const handleSaveEdit = async () => {
    if (!selectedWord || !window.electronAPI) return;

    const success = await window.electronAPI.words.update(selectedWord.id, {
      translation: editTranslation,
      level: editLevel,
    });

    if (success) {
      // Update local state
      const updatedWords = words.map(w => {
        if (w.id === selectedWord.id) {
          return {
            ...w,
            level: editLevel,
            translations: [{ ...w.translations[0], translation: editTranslation }],
          };
        }
        return w;
      });
      setWords(updatedWords);
      setSelectedWord({
        ...selectedWord,
        level: editLevel,
        translations: [{ ...selectedWord.translations[0], translation: editTranslation }],
      });
      setIsEditing(false);
    }
  };

  const playAudio = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  const getStatusBadge = (progress: WordWithProgress['progress']) => {
    const status = progress?.status || 'new';
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    const Icon = config.icon;

    return (
      <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', config.bg, config.color)}>
        <Icon className="w-3 h-3" />
        <span className="hidden sm:inline">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Word List */}
      <div className="w-96 border-r border-border flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Поиск слов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant={showFilters ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Статус изучения
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                        const count = statusCounts.find(s => s.status === status)?.count || 0;
                        const Icon = config.icon;
                        return (
                          <button
                            key={status}
                            onClick={() =>
                              setSelectedStatus(
                                selectedStatus === status ? null : status
                              )
                            }
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
                              selectedStatus === status
                                ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-offset-background`
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            )}
                            style={selectedStatus === status ? { '--tw-ring-color': config.color.replace('text-', '') } as any : {}}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Уровень CEFR
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {levels.map((l) => (
                        <button
                          key={l.level}
                          onClick={() =>
                            setSelectedLevel(
                              selectedLevel === l.level ? null : l.level
                            )
                          }
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium transition-all',
                            selectedLevel === l.level
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {l.level} ({l.count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Категория
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() =>
                            setSelectedCategory(
                              selectedCategory === c.id ? null : c.id
                            )
                          }
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium transition-all',
                            selectedCategory === c.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Filter (YouTube imports) */}
                  {sources.length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                        <Youtube className="w-3 h-3 text-red-500" />
                        Импорт из YouTube
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setSelectedSource(
                              selectedSource === 'youtube' ? null : 'youtube'
                            )
                          }
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
                            selectedSource === 'youtube'
                              ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30 ring-offset-1 ring-offset-background'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Youtube className="w-3 h-3" />
                          Все из YouTube ({sources.reduce((sum, s) => sum + s.count, 0)})
                        </button>
                        {sources.map((s) => (
                          <button
                            key={s.id}
                            onClick={() =>
                              setSelectedSource(
                                selectedSource === s.id ? null : s.id
                              )
                            }
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-medium transition-all',
                              selectedSource === s.id
                                ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30 ring-offset-1 ring-offset-background'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {s.name} ({s.count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filters */}
          {hasFilters && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">
                Найдено: {filteredWords.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Сбросить
              </Button>
            </div>
          )}
        </div>

        {/* Word List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Загрузка...
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Слова не найдены</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredWords.map((word) => (
                <motion.button
                  key={word.id}
                  onClick={() => setSelectedWord(word)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-accent transition-colors',
                    selectedWord?.id === word.id && 'bg-accent'
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{word.word}</span>
                        <span className="text-xs text-muted-foreground">
                          {word.transcription}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {word.translations[0]?.translation}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {getStatusBadge(word.progress)}
                      <LevelBadge level={word.level} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => playAudio(word.word, e)}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Word Details */}
      <div className="flex-1 overflow-y-auto">
        {selectedWord ? (
          <div className="p-6">
            {/* Edit/Delete Actions */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedWord.word}</h2>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Отмена
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveEdit}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Сохранить
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditWord}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Изменить
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDeleteWord(selectedWord.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Удалить
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Edit Form */}
            {isEditing ? (
              <Card className="mb-4">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Перевод
                    </label>
                    <input
                      type="text"
                      value={editTranslation}
                      onChange={(e) => setEditTranslation(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Уровень CEFR
                    </label>
                    <div className="flex gap-2">
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setEditLevel(level)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium transition-all',
                            editLevel === level
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <WordCard word={selectedWord} variant="full" />
            )}

            {/* Progress Stats */}
            {selectedWord.progress && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <BookMarked className="w-4 h-4" />
                    Статистика изучения
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">
                        {selectedWord.progress.correctCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Правильных</div>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">
                        {selectedWord.progress.wrongCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Ошибок</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">
                        {selectedWord.progress.repetitions}
                      </div>
                      <div className="text-xs text-muted-foreground">Повторений</div>
                    </div>
                    <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">
                        {selectedWord.progress.correctCount + selectedWord.progress.wrongCount > 0
                          ? Math.round((selectedWord.progress.correctCount / (selectedWord.progress.correctCount + selectedWord.progress.wrongCount)) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Точность</div>
                    </div>
                  </div>
                  {selectedWord.progress.lastReview && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Последнее повторение: {new Date(selectedWord.progress.lastReview).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Context Sentences from Books/Movies */}
            <ContextSentences word={selectedWord.word} className="mt-4" variant="compact" />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-xl font-semibold mb-2">Выберите слово</h2>
              <p className="text-muted-foreground">
                Нажмите на слово в списке слева, чтобы увидеть подробности
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mock data
function getMockWords(): WordWithProgress[] {
  return [
    {
      id: '1',
      word: 'hello',
      transcription: '/həˈləʊ/',
      partOfSpeech: 'interjection',
      level: 'A1',
      frequency: 100,
      translations: [{ translation: 'привет', isPrimary: true }],
      examples: [{ english: 'Hello! How are you?', russian: 'Привет! Как дела?' }],
      forms: [],
      synonyms: ['hi', 'hey'],
      antonyms: ['goodbye'],
      tags: ['everyday'],
      progress: { status: 'learned', correctCount: 10, wrongCount: 2, repetitions: 5, nextReview: null, lastReview: '2024-01-15' },
    },
    {
      id: '2',
      word: 'beautiful',
      transcription: '/ˈbjuːtɪfl/',
      partOfSpeech: 'adjective',
      level: 'A2',
      frequency: 85,
      translations: [
        { translation: 'красивый', isPrimary: true },
        { translation: 'прекрасный', isPrimary: false },
      ],
      examples: [{ english: 'What a beautiful sunset!', russian: 'Какой красивый закат!' }],
      forms: [],
      synonyms: ['pretty', 'lovely'],
      antonyms: ['ugly'],
      tags: ['everyday'],
      progress: { status: 'learning', correctCount: 3, wrongCount: 1, repetitions: 2, nextReview: '2024-01-20', lastReview: '2024-01-18' },
    },
    {
      id: '3',
      word: 'experience',
      transcription: '/ɪkˈspɪəriəns/',
      partOfSpeech: 'noun',
      level: 'B1',
      frequency: 82,
      translations: [
        { translation: 'опыт', isPrimary: true },
        { translation: 'впечатление', isPrimary: false },
      ],
      examples: [{ english: 'I have five years of experience.', russian: 'У меня пять лет опыта.' }],
      forms: ['experiences'],
      synonyms: [],
      antonyms: [],
      tags: ['business'],
      progress: null,
    },
    {
      id: '4',
      word: 'travel',
      transcription: '/ˈtrævl/',
      partOfSpeech: 'verb',
      level: 'A2',
      frequency: 83,
      translations: [{ translation: 'путешествовать', isPrimary: true }],
      examples: [{ english: 'I love to travel.', russian: 'Я люблю путешествовать.' }],
      forms: ['travels', 'traveled', 'traveling'],
      synonyms: ['journey'],
      antonyms: [],
      tags: ['travel'],
      progress: { status: 'review', correctCount: 5, wrongCount: 3, repetitions: 4, nextReview: '2024-01-19', lastReview: '2024-01-16' },
    },
    {
      id: '5',
      word: 'food',
      transcription: '/fuːd/',
      partOfSpeech: 'noun',
      level: 'A1',
      frequency: 93,
      translations: [{ translation: 'еда', isPrimary: true }, { translation: 'пища', isPrimary: false }],
      examples: [{ english: 'The food is delicious.', russian: 'Еда очень вкусная.' }],
      forms: ['foods'],
      synonyms: ['meal'],
      antonyms: [],
      tags: ['food', 'everyday'],
      progress: null,
    },
  ];
}
