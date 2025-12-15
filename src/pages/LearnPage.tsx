import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Settings,
  Shuffle,
  Play,
  Sparkles,
  BookMarked,
  Clock,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LevelBadge,
  Progress,
} from '@/components/ui';
import { WordCard, QuizCard, SessionComplete } from '@/components/learning';
import { useAppStore } from '@/stores/appStore';
import type { Word, ReviewCard, SessionResult } from '@/types';
import { cn } from '@/lib/utils';
import { speak } from '@/lib/tts';

type LearningPhase = 'setup' | 'preview' | 'quiz' | 'complete';
type QuizType = 'multipleChoice' | 'typing' | 'reverse';
type LearningMode = 'new' | 'learning' | 'review' | 'learned' | 'all';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const WORD_COUNTS = [5, 10, 15, 20];

const LEARNING_MODES = [
  {
    id: 'new' as LearningMode,
    label: 'Новые слова',
    description: 'Слова, которые вы ещё не изучали',
    icon: Sparkles,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    id: 'learning' as LearningMode,
    label: 'Изучаю',
    description: 'Слова в процессе изучения',
    icon: BookMarked,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    gradient: 'from-yellow-500/20 to-orange-500/10',
  },
  {
    id: 'review' as LearningMode,
    label: 'На повторении',
    description: 'Слова, которые нужно повторить',
    icon: Clock,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
    gradient: 'from-orange-500/20 to-red-500/10',
  },
  {
    id: 'learned' as LearningMode,
    label: 'Выученные',
    description: 'Повторите выученные слова',
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
    gradient: 'from-green-500/20 to-emerald-500/10',
  },
  {
    id: 'all' as LearningMode,
    label: 'Все слова',
    description: 'Смешанный режим',
    icon: GraduationCap,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    gradient: 'from-purple-500/20 to-pink-500/10',
  },
];

export const LearnPage: React.FC = () => {
  const { refreshData, targetLanguage, settings } = useAppStore();

  // Setup state
  const [learningMode, setLearningMode] = useState<LearningMode>('new');
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [wordCount, setWordCount] = useState(10);
  const [includeTyping, setIncludeTyping] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Session state
  const [phase, setPhase] = useState<LearningPhase>('setup');
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load words for options and status counts
  useEffect(() => {
    const loadData = async () => {
      if (window.electronAPI) {
        const [words, counts] = await Promise.all([
          window.electronAPI.words.getAll({ limit: 100, targetLanguage }),
          window.electronAPI.words.getStatusCounts(targetLanguage),
        ]);
        setAllWords(words);
        // Convert counts array to object
        const countsMap: Record<string, number> = {};
        counts.forEach((c: { status: string; count: number }) => {
          countsMap[c.status] = c.count;
        });
        setStatusCounts(countsMap);
      } else {
        // Mock data for development
        setAllWords(getMockWords());
        setStatusCounts({ new: 100, learning: 25, review: 10, learned: 50 });
      }
    };
    loadData();
  }, [targetLanguage]);

  // Auto-speak word in preview phase when card changes
  useEffect(() => {
    if (phase === 'preview' && cards.length > 0) {
      const word = cards[previewIndex]?.word?.word;
      if (word) {
        speak(word);
      }
    }
  }, [phase, previewIndex, cards]);

  // Auto-speak word in quiz phase when card changes
  useEffect(() => {
    if (phase === 'quiz' && cards.length > 0) {
      const word = cards[currentIndex]?.word?.word;
      if (word) {
        speak(word);
      }
    }
  }, [phase, currentIndex, cards]);

  const startSession = async () => {
    let newCards: ReviewCard[] = [];

    if (window.electronAPI) {
      if (learningMode === 'new') {
        // Get new words that haven't been studied yet
        newCards = await window.electronAPI.srs.getNewWords(wordCount, selectedLevel, undefined, targetLanguage);
      } else if (learningMode === 'review') {
        // Get words due for review (SRS)
        newCards = await window.electronAPI.srs.getNextWords(wordCount, targetLanguage);
      } else {
        // Get words by status (learning, learned, or all)
        const statusFilter = learningMode === 'all' ? undefined : learningMode;
        const wordsWithProgress = await window.electronAPI.words.getWithProgress({
          status: statusFilter,
          level: selectedLevel !== 'all' ? selectedLevel : undefined,
          limit: wordCount,
          targetLanguage,
        });
        newCards = wordsWithProgress.map((w: any) => ({
          word: w,
          progress: w.progress,
          isNew: !w.progress,
        }));
      }
    } else {
      // Mock data for development
      newCards = getMockWords()
        .filter((w) => w.level === selectedLevel)
        .slice(0, wordCount)
        .map((w) => ({ word: w, progress: null, isNew: true }));
    }

    const modeLabel = LEARNING_MODES.find(m => m.id === learningMode)?.label || 'слов';
    if (newCards.length === 0) {
      alert(`Нет ${modeLabel.toLowerCase()} для изучения`);
      return;
    }

    // Start session in database
    let newSessionId: string | null = null;
    if (window.electronAPI) {
      newSessionId = await window.electronAPI.session.start(learningMode);
      setSessionId(newSessionId);
    }

    setCards(newCards);
    setCurrentIndex(0);
    setPreviewIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setXpEarned(0);
    setSessionStartTime(Date.now());
    setPhase('preview');
  };

  const handlePreviewNext = () => {
    if (previewIndex < cards.length - 1) {
      setPreviewIndex(previewIndex + 1);
    } else {
      // Start quiz phase
      setCurrentIndex(0);
      setPhase('quiz');
    }
  };

  const handleQuizAnswer = async (correct: boolean, quality: number) => {
    const card = cards[currentIndex];

    if (correct) {
      setCorrectCount((c) => c + 1);
      setXpEarned((x) => x + 10);
    } else {
      setWrongCount((c) => c + 1);
      setXpEarned((x) => x + 2); // Small XP for wrong answer (learning)
    }

    // Record answer in SRS
    if (window.electronAPI) {
      await window.electronAPI.srs.recordAnswer(card.word.id, quality);
      await window.electronAPI.gamification.addXP(correct ? 10 : 2, 'learn');
    }

    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 500);
    } else {
      // Session complete
      const timeSpent = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime) / 1000)
        : 0;

      const finalCorrectCount = correctCount + (correct ? 1 : 0);
      const finalWrongCount = wrongCount + (correct ? 0 : 1);
      const finalXpEarned = xpEarned + (correct ? 10 : 2);

      // End session and save stats to database
      if (window.electronAPI && sessionId) {
        await window.electronAPI.session.end(sessionId, {
          wordsCount: cards.length,
          correctCount: finalCorrectCount,
          wrongCount: finalWrongCount,
          xpEarned: finalXpEarned,
          timeSpent,
        });
      }

      // Update streak and check achievements
      let streakResult = null;
      let newAchievements: any[] = [];

      if (window.electronAPI) {
        streakResult = await window.electronAPI.gamification.updateStreak();
        newAchievements = await window.electronAPI.gamification.checkAchievements();
      }

      setSessionResult({
        wordsCount: cards.length,
        correctCount: finalCorrectCount,
        wrongCount: finalWrongCount,
        xpEarned: finalXpEarned,
        timeSpent,
        newWordsLearned: cards.filter((c) => c.isNew).length,
        streak: streakResult || undefined,
        achievements: newAchievements,
      });

      setPhase('complete');
      refreshData();
    }
  };

  const resetSession = () => {
    setPhase('setup');
    setCards([]);
    setCurrentIndex(0);
    setPreviewIndex(0);
    setSessionId(null);
    setCorrectCount(0);
    setWrongCount(0);
    setXpEarned(0);
    setSessionStartTime(null);
    setSessionResult(null);
  };

  // Determine quiz type for current card
  const getQuizType = (): QuizType => {
    if (!includeTyping) return 'multipleChoice';
    const types: QuizType[] = ['multipleChoice', 'multipleChoice', 'typing', 'reverse'];
    return types[currentIndex % types.length];
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Setup Phase */}
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Обучение</h1>
                <p className="text-muted-foreground">
                  Выберите режим и параметры сессии
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Learning Mode Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Режим обучения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LEARNING_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const count = mode.id === 'all'
                        ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                        : statusCounts[mode.id] || 0;
                      const isSelected = learningMode === mode.id;

                      return (
                        <button
                          key={mode.id}
                          onClick={() => setLearningMode(mode.id)}
                          className={cn(
                            'relative p-4 rounded-xl border-2 text-left transition-all',
                            'hover:scale-[1.02] active:scale-[0.98]',
                            isSelected
                              ? `${mode.border} bg-gradient-to-br ${mode.gradient}`
                              : 'border-border bg-card hover:border-muted-foreground/30'
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              mode.bg
                            )}>
                              <Icon className={cn('w-5 h-5', mode.color)} />
                            </div>
                            <span className={cn(
                              'text-xs font-medium px-2 py-1 rounded-full',
                              mode.bg, mode.color
                            )}>
                              {count}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1">{mode.label}</h3>
                          <p className="text-xs text-muted-foreground">{mode.description}</p>

                          {isSelected && (
                            <motion.div
                              layoutId="selectedMode"
                              className={cn(
                                'absolute inset-0 rounded-xl border-2',
                                mode.border
                              )}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Level Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Уровень CEFR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-3">
                    {LEVELS.map((level) => (
                      <Button
                        key={level}
                        variant={selectedLevel === level ? 'default' : 'outline'}
                        className={cn(
                          'h-14',
                          selectedLevel === level && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        )}
                        onClick={() => setSelectedLevel(level)}
                      >
                        <LevelBadge level={level} />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Word Count */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shuffle className="w-5 h-5" />
                    Количество слов
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {WORD_COUNTS.map((count) => (
                      <Button
                        key={count}
                        variant={wordCount === count ? 'default' : 'outline'}
                        className={cn(
                          'h-14',
                          wordCount === count && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        )}
                        onClick={() => setWordCount(count)}
                      >
                        {count} слов
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Настройки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTyping}
                      onChange={(e) => setIncludeTyping(e.target.checked)}
                      className="w-5 h-5 rounded border-border bg-background"
                    />
                    <span>Включить задания с вводом текста</span>
                  </label>
                </CardContent>
              </Card>

              {/* Start Button */}
              <Button
                variant="glow"
                size="xl"
                className="w-full"
                onClick={startSession}
              >
                <Play className="w-5 h-5 mr-2" />
                Начать обучение
              </Button>
            </div>
          </motion.div>
        )}

        {/* Preview Phase */}
        {phase === 'preview' && cards.length > 0 && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={resetSession}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">Знакомство со словами</h2>
                  <p className="text-sm text-muted-foreground">
                    Изучите карточки перед тестом
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {previewIndex + 1} / {cards.length}
              </span>
            </div>

            <Progress
              value={((previewIndex + 1) / cards.length) * 100}
              className="mb-6"
            />

            {/* Card container with min-height to prevent button jumping */}
            <div className="min-h-[350px]">
              <WordCard word={cards[previewIndex].word} variant="full" />
            </div>

            {/* Fixed position button at the bottom */}
            <div className="flex justify-end mt-6 pt-4 border-t border-border">
              <Button variant="glow" size="lg" onClick={handlePreviewNext}>
                {previewIndex < cards.length - 1 ? 'Далее' : 'Начать тест'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Quiz Phase */}
        {phase === 'quiz' && cards.length > 0 && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={resetSession}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">Проверка знаний</h2>
                  <p className="text-sm text-muted-foreground">
                    Правильно: {correctCount} • Ошибок: {wrongCount}
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {cards.length}
              </span>
            </div>

            <Progress
              value={((currentIndex + 1) / cards.length) * 100}
              className="mb-8"
            />

            <QuizCard
              word={cards[currentIndex].word}
              type={getQuizType()}
              allWords={allWords}
              onAnswer={handleQuizAnswer}
            />
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && sessionResult && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SessionComplete result={sessionResult} onRestart={resetSession} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mock data for development
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
      word: 'world',
      transcription: '/wɜːld/',
      partOfSpeech: 'noun',
      level: 'A1',
      frequency: 95,
      translations: [{ translation: 'мир', isPrimary: true }],
      examples: [{ english: 'Hello, world!', russian: 'Привет, мир!' }],
      forms: ['worlds'],
      synonyms: ['earth', 'globe'],
      antonyms: [],
      tags: ['everyday'],
    },
    {
      id: '3',
      word: 'thank',
      transcription: '/θæŋk/',
      partOfSpeech: 'verb',
      level: 'A1',
      frequency: 90,
      translations: [{ translation: 'благодарить', isPrimary: true }],
      examples: [{ english: 'Thank you!', russian: 'Спасибо!' }],
      forms: ['thanks', 'thanked', 'thanking'],
      synonyms: ['appreciate'],
      antonyms: [],
      tags: ['everyday'],
    },
  ];
}
