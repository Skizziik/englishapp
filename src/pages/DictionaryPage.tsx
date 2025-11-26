import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, BookOpen, Volume2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  SearchInput,
  LevelBadge,
  Badge,
} from '@/components/ui';
import { WordCard } from '@/components/learning';
import type { Word, Category, Level } from '@/types';
import { cn } from '@/lib/utils';

export const DictionaryPage: React.FC = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Selected word
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    if (window.electronAPI) {
      const [wordsData, categoriesData, levelsData] = await Promise.all([
        window.electronAPI.words.getAll({ limit: 500 }),
        window.electronAPI.words.getCategories(),
        window.electronAPI.words.getLevels(),
      ]);
      setWords(wordsData);
      setCategories(categoriesData);
      setLevels(levelsData);
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
    }

    setIsLoading(false);
  };

  const filteredWords = useMemo(() => {
    return words.filter((word) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesWord = word.word.toLowerCase().includes(query);
        const matchesTranslation = word.translations.some((t) =>
          t.translation.toLowerCase().includes(query)
        );
        if (!matchesWord && !matchesTranslation) return false;
      }

      // Level filter
      if (selectedLevel && word.level !== selectedLevel) return false;

      // Category filter
      if (selectedCategory && !word.tags.includes(selectedCategory)) return false;

      return true;
    });
  }, [words, searchQuery, selectedLevel, selectedCategory]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLevel(null);
    setSelectedCategory(null);
  };

  const hasFilters = searchQuery || selectedLevel || selectedCategory;

  const playAudio = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
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
                    <div className="flex items-center gap-2 ml-2">
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
            <WordCard word={selectedWord} variant="full" />
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
function getMockWords(): Word[] {
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
    },
  ];
}
