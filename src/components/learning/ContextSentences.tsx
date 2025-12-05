import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book,
  Film,
  Tv,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Quote,
  Calendar,
  User,
  Info,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

interface ContextSentence {
  sentence: string;
  translation: string;
  source: string;
  sourceType: 'book' | 'movie' | 'series';
  character: string | null;
  year: string;
  note: string;
}

interface ContextSentencesProps {
  word: string;
  className?: string;
  variant?: 'compact' | 'full';
}

const sourceIcons = {
  book: Book,
  movie: Film,
  series: Tv,
};

const sourceColors = {
  book: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  movie: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
  series: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    icon: 'text-purple-400',
  },
};

export const ContextSentences: React.FC<ContextSentencesProps> = ({
  word,
  className,
  variant = 'full',
}) => {
  const { targetLanguage } = useAppStore();
  const [contexts, setContexts] = useState<ContextSentence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(variant === 'full');
  const [selectedContext, setSelectedContext] = useState<number | null>(null);

  const loadContexts = async () => {
    if (!window.electronAPI) {
      // Mock data for development
      setContexts(getMockContexts(targetLanguage));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isConfigured = await window.electronAPI.gemini.isConfigured();
      if (!isConfigured) {
        setError('Настройте Gemini API в настройках для получения контекстных предложений');
        return;
      }

      const response = await window.electronAPI.gemini.getContextSentences(word, targetLanguage);

      if (!response.success) {
        setError(response.error || 'Ошибка загрузки контекстов');
        return;
      }

      try {
        // Try to parse JSON response
        const cleanedData = response.data?.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedData || '{}');
        if (parsed.contexts && Array.isArray(parsed.contexts)) {
          setContexts(parsed.contexts);
        } else {
          setError('Неверный формат ответа');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        setError('Ошибка обработки ответа');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && contexts.length === 0 && !isLoading && !error) {
      loadContexts();
    }
  }, [isExpanded, word]);

  if (variant === 'compact') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Quote className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Контекст из кино и книг</h3>
              <p className="text-xs text-muted-foreground">
                Примеры из популярных произведений
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 border-t border-border pt-4">
                <ContextContent
                  contexts={contexts}
                  isLoading={isLoading}
                  error={error}
                  onRefresh={loadContexts}
                  selectedContext={selectedContext}
                  onSelectContext={setSelectedContext}
                  targetLanguage={targetLanguage}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Quote className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Контекст из кино и книг</h3>
              <p className="text-sm text-muted-foreground">
                Как слово «{word}» используется в популярных произведениях
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadContexts}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        <ContextContent
          contexts={contexts}
          isLoading={isLoading}
          error={error}
          onRefresh={loadContexts}
          selectedContext={selectedContext}
          onSelectContext={setSelectedContext}
          targetLanguage={targetLanguage}
        />
      </CardContent>
    </Card>
  );
};

interface ContextContentProps {
  contexts: ContextSentence[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  selectedContext: number | null;
  onSelectContext: (index: number | null) => void;
  targetLanguage: string;
}

const ContextContent: React.FC<ContextContentProps> = ({
  contexts,
  isLoading,
  error,
  onRefresh,
  selectedContext,
  onSelectContext,
  targetLanguage,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Sparkles className="w-8 h-8 text-primary animate-pulse mb-3" />
        <p className="text-muted-foreground text-sm">Ищем примеры в книгах и фильмах...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <Info className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="text-center py-6">
        <Quote className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Нажмите для загрузки контекстов</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRefresh}>
          <Sparkles className="w-4 h-4 mr-2" />
          Загрузить примеры
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contexts.map((context, index) => {
        const SourceIcon = sourceIcons[context.sourceType] || Book;
        const colors = sourceColors[context.sourceType] || sourceColors.book;
        const isSelected = selectedContext === index;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <button
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                colors.bg,
                colors.border,
                isSelected && 'ring-2 ring-primary',
                'hover:scale-[1.01] active:scale-[0.99]'
              )}
              onClick={() => onSelectContext(isSelected ? null : index)}
            >
              {/* Source Info */}
              <div className="flex items-center gap-2 mb-3">
                <SourceIcon className={cn('w-4 h-4', colors.icon)} />
                <span className={cn('font-medium text-sm', colors.text)}>
                  {context.source}
                </span>
                {context.year && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {context.year}
                  </Badge>
                )}
              </div>

              {/* Quote */}
              <div className="relative pl-4 border-l-2 border-current/20">
                <p className="text-foreground mb-2">
                  {targetLanguage === 'it' ? '🇮🇹' : '🇬🇧'} {context.sentence}
                </p>
                <p className="text-muted-foreground text-sm">
                  🇷🇺 {context.translation}
                </p>
              </div>

              {/* Character if present */}
              {context.character && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{context.character}</span>
                </div>
              )}

              {/* Expanded Note */}
              <AnimatePresence>
                {isSelected && context.note && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 pt-3 border-t border-current/10"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{context.note}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};

// Mock data for development
function getMockContexts(targetLanguage: string): ContextSentence[] {
  if (targetLanguage === 'it') {
    return [
      {
        sentence: 'La vita è bella quando hai qualcuno da amare.',
        translation: 'Жизнь прекрасна, когда есть кого любить.',
        source: 'La vita è bella',
        sourceType: 'movie',
        character: 'Guido Orefice',
        year: '1997',
        note: 'Эта фраза отражает основную тему фильма - красоту жизни даже в самых трудных обстоятельствах.',
      },
      {
        sentence: 'Nel mezzo del cammin di nostra vita...',
        translation: 'На середине жизненного пути...',
        source: 'La Divina Commedia',
        sourceType: 'book',
        character: 'Dante',
        year: '1320',
        note: 'Знаменитое начало "Божественной комедии" Данте, одно из самых узнаваемых произведений итальянской литературы.',
      },
    ];
  }

  return [
    {
      sentence: "After all this time? Always.",
      translation: 'После стольких лет? Всегда.',
      source: 'Harry Potter and the Deathly Hallows',
      sourceType: 'book',
      character: 'Severus Snape',
      year: '2007',
      note: 'Одна из самых эмоциональных цитат серии, показывающая вечную любовь Снейпа к Лили Поттер.',
    },
    {
      sentence: "Life is like a box of chocolates. You never know what you're gonna get.",
      translation: 'Жизнь как коробка шоколадных конфет. Никогда не знаешь, что тебе попадётся.',
      source: 'Forrest Gump',
      sourceType: 'movie',
      character: 'Forrest Gump',
      year: '1994',
      note: 'Философская фраза о непредсказуемости жизни, ставшая крылатым выражением.',
    },
    {
      sentence: "Winter is coming.",
      translation: 'Зима близко.',
      source: 'Game of Thrones',
      sourceType: 'series',
      character: 'House Stark',
      year: '2011',
      note: 'Девиз дома Старков, предупреждающий о грядущих трудностях. Стало популярным мемом.',
    },
    {
      sentence: "How you doin'?",
      translation: 'Как дела?',
      source: 'Friends',
      sourceType: 'series',
      character: 'Joey Tribbiani',
      year: '1994',
      note: 'Фирменная фраза Джоуи для флирта, произносимая с характерной интонацией.',
    },
  ];
}
