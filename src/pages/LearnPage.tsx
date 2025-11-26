import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Settings, Shuffle, Play } from 'lucide-react';
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

type LearningPhase = 'setup' | 'preview' | 'quiz' | 'complete';
type QuizType = 'multipleChoice' | 'typing' | 'reverse';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const WORD_COUNTS = [5, 10, 15, 20];

export const LearnPage: React.FC = () => {
  const { refreshData } = useAppStore();

  // Setup state
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [wordCount, setWordCount] = useState(10);
  const [includeTyping, setIncludeTyping] = useState(true);

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

  // Load words for options
  useEffect(() => {
    const loadAllWords = async () => {
      if (window.electronAPI) {
        const words = await window.electronAPI.words.getAll({ limit: 100 });
        setAllWords(words);
      } else {
        // Mock data for development
        setAllWords(getMockWords());
      }
    };
    loadAllWords();
  }, []);

  const startSession = async () => {
    let newCards: ReviewCard[] = [];

    if (window.electronAPI) {
      newCards = await window.electronAPI.srs.getNewWords(wordCount, selectedLevel);
    } else {
      // Mock data for development
      newCards = getMockWords()
        .filter((w) => w.level === selectedLevel)
        .slice(0, wordCount)
        .map((w) => ({ word: w, progress: null, isNew: true }));
    }

    if (newCards.length === 0) {
      alert('Нет новых слов для изучения на этом уровне');
      return;
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

      // Update streak and check achievements
      let streakResult = null;
      let newAchievements: any[] = [];

      if (window.electronAPI) {
        streakResult = await window.electronAPI.gamification.updateStreak();
        newAchievements = await window.electronAPI.gamification.checkAchievements();
      }

      setSessionResult({
        wordsCount: cards.length,
        correctCount: correctCount + (correct ? 1 : 0),
        wrongCount: wrongCount + (correct ? 0 : 1),
        xpEarned: xpEarned + (correct ? 10 : 2),
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
                <h1 className="text-2xl font-bold">Изучение новых слов</h1>
                <p className="text-muted-foreground">
                  Выберите параметры сессии обучения
                </p>
              </div>
            </div>

            <div className="space-y-6">
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

            <WordCard word={cards[previewIndex].word} variant="full" />

            <div className="flex justify-end mt-6">
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
