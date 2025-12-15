import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Zap,
  Trophy,
  Clock,
  Target,
  Flame,
  CheckCircle,
  XCircle,
  Volume2,
  Crown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, LevelBadge } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import type { Word } from '@/types';
import { cn } from '@/lib/utils';
import { speak } from '@/lib/tts';

type SprintPhase = 'setup' | 'countdown' | 'playing' | 'complete';

const SPRINT_DURATION = 60; // seconds
const TIME_OPTIONS = [30, 60, 90, 120];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface SprintResult {
  score: number;
  correctCount: number;
  wrongCount: number;
  combo: number;
  maxCombo: number;
  xpEarned: number;
  timeElapsed: number;
  wordsPerMinute: number;
}

export const SprintPage: React.FC = () => {
  const { refreshData, targetLanguage, profile } = useAppStore();

  // Setup state
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [sprintDuration, setSprintDuration] = useState(SPRINT_DURATION);

  // Game state
  const [phase, setPhase] = useState<SprintPhase>('setup');
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPRINT_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<'correct' | 'wrong' | null>(null);
  const [displayedTranslation, setDisplayedTranslation] = useState('');
  const [isCorrectTranslation, setIsCorrectTranslation] = useState(true);
  const [result, setResult] = useState<SprintResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to track current values for the timer callback
  const scoreRef = useRef(0);
  const correctCountRef = useRef(0);
  const wrongCountRef = useRef(0);
  const maxComboRef = useRef(0);
  const sprintDurationRef = useRef(sprintDuration);

  // Update sprintDurationRef when sprintDuration changes
  useEffect(() => {
    sprintDurationRef.current = sprintDuration;
  }, [sprintDuration]);

  // Ref to hold the endGame function for timer callback
  const endGameRef = useRef<() => void>(() => {});

  // Load words for sprint
  useEffect(() => {
    const loadWords = async () => {
      if (window.electronAPI) {
        const loadedWords = await window.electronAPI.words.getAll({
          level: selectedLevel,
          limit: 200,
          targetLanguage,
        });
        setWords(shuffleArray(loadedWords));
      } else {
        setWords(getMockWords());
      }
    };
    loadWords();
  }, [selectedLevel, targetLanguage]);

  // Setup new question
  const setupQuestion = useCallback(() => {
    if (words.length === 0) return;

    const wordIndex = currentIndex % words.length;
    const word = words[wordIndex];
    const correctTranslation =
      word.translations.find((t) => t.isPrimary)?.translation ||
      word.translations[0]?.translation ||
      '';

    // 50% chance of showing correct translation
    const showCorrect = Math.random() > 0.5;

    if (showCorrect) {
      setDisplayedTranslation(correctTranslation);
      setIsCorrectTranslation(true);
    } else {
      // Get a random wrong translation from other words
      const otherWords = words.filter((_, i) => i !== wordIndex);
      const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
      const wrongTranslation =
        randomWord?.translations.find((t) => t.isPrimary)?.translation ||
        randomWord?.translations[0]?.translation ||
        'неправильно';
      setDisplayedTranslation(wrongTranslation);
      setIsCorrectTranslation(false);
    }
  }, [words, currentIndex]);

  // Start countdown
  const startCountdown = () => {
    setPhase('countdown');
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start the game
  const startGame = () => {
    setPhase('playing');
    setTimeLeft(sprintDuration);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setCurrentIndex(0);
    setLastAnswer(null);

    // Reset refs
    scoreRef.current = 0;
    correctCountRef.current = 0;
    wrongCountRef.current = 0;
    maxComboRef.current = 0;

    // Shuffle words again
    setWords((prev) => shuffleArray([...prev]));

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Use ref to call the latest endGame function
          endGameRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle answer
  const handleAnswer = async (userSaysCorrect: boolean) => {
    const isCorrect = userSaysCorrect === isCorrectTranslation;

    if (isCorrect) {
      // Correct answer
      const comboMultiplier = Math.min(Math.floor(combo / 5) + 1, 5);
      const points = 10 * comboMultiplier;

      setScore((prev) => {
        const newScore = prev + points;
        scoreRef.current = newScore;
        return newScore;
      });
      setCombo((prev) => {
        const newCombo = prev + 1;
        setMaxCombo((max) => {
          const newMax = Math.max(max, newCombo);
          maxComboRef.current = newMax;
          return newMax;
        });
        return newCombo;
      });
      setCorrectCount((prev) => {
        const newCount = prev + 1;
        correctCountRef.current = newCount;
        return newCount;
      });
      setLastAnswer('correct');
    } else {
      // Wrong answer
      setCombo(0);
      setWrongCount((prev) => {
        const newCount = prev + 1;
        wrongCountRef.current = newCount;
        return newCount;
      });
      setLastAnswer('wrong');
    }

    // Move to next word
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setLastAnswer(null);
    }, 150);
  };

  // Update question when index changes
  useEffect(() => {
    if (phase === 'playing') {
      setupQuestion();
    }
  }, [currentIndex, phase, setupQuestion]);

  // End game - called when timer reaches 0
  const endGame = useCallback(async () => {
    setPhase('complete');

    // Use refs for accurate values (state may be stale in timer callback)
    const finalScore = scoreRef.current;
    const finalCorrect = correctCountRef.current;
    const finalWrong = wrongCountRef.current;
    const finalMaxCombo = maxComboRef.current;
    const duration = sprintDurationRef.current;

    const totalAnswers = finalCorrect + finalWrong;
    const xpEarned = Math.floor(finalScore / 10) + finalCorrect * 2;
    const wordsPerMinute = totalAnswers > 0 ? Math.round((totalAnswers / duration) * 60) : 0;

    const gameResult: SprintResult = {
      score: finalScore,
      correctCount: finalCorrect,
      wrongCount: finalWrong,
      combo: finalMaxCombo,
      maxCombo: finalMaxCombo,
      xpEarned,
      timeElapsed: duration,
      wordsPerMinute,
    };

    setResult(gameResult);

    // Save XP
    if (window.electronAPI && xpEarned > 0) {
      await window.electronAPI.gamification.addXP(xpEarned, 'sprint');
      await window.electronAPI.gamification.updateStreak();
    }

    refreshData();
  }, [refreshData]);

  // Keep endGameRef updated with latest endGame function
  useEffect(() => {
    endGameRef.current = endGame;
  }, [endGame]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleAnswer(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleAnswer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isCorrectTranslation]);

  const currentWord = words[currentIndex % words.length];

  const playAudio = () => {
    if (!currentWord) return;
    speak(currentWord.word);
  };

  const resetGame = () => {
    setPhase('setup');
    setResult(null);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
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
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Режим Спринт
                </h1>
                <p className="text-muted-foreground">
                  Отвечайте как можно быстрее за ограниченное время
                </p>
              </div>
            </div>

            {/* Game Rules */}
            <Card className="mb-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  Как играть
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Вам показывается слово и перевод
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    Решите, верный это перевод или нет
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Серия правильных ответов увеличивает множитель очков
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Успейте набрать максимум очков за отведённое время
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Settings */}
            <div className="space-y-6">
              {/* Level Selection */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Уровень сложности</h3>
                  <div className="grid grid-cols-6 gap-3">
                    {LEVELS.map((level) => (
                      <Button
                        key={level}
                        variant={selectedLevel === level ? 'default' : 'outline'}
                        className={cn(
                          'h-14',
                          selectedLevel === level &&
                            'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        )}
                        onClick={() => setSelectedLevel(level)}
                      >
                        <LevelBadge level={level} />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Time Selection */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Длительность</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {TIME_OPTIONS.map((time) => (
                      <Button
                        key={time}
                        variant={sprintDuration === time ? 'default' : 'outline'}
                        className={cn(
                          'h-14',
                          sprintDuration === time &&
                            'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        )}
                        onClick={() => setSprintDuration(time)}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {time} сек
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Start Button */}
              <Button
                variant="glow"
                size="xl"
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={startCountdown}
                disabled={words.length === 0}
              >
                <Zap className="w-5 h-5 mr-2" />
                Начать Спринт!
              </Button>
            </div>
          </motion.div>
        )}

        {/* Countdown Phase */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-bold text-primary"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}

        {/* Playing Phase */}
        {phase === 'playing' && currentWord && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header Stats */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                {/* Timer */}
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl',
                    timeLeft <= 10
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-primary/20 text-primary'
                  )}
                >
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold tabular-nums">{timeLeft}</span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400">
                  <Trophy className="w-5 h-5" />
                  <span className="text-2xl font-bold tabular-nums">{score}</span>
                </div>
              </div>

              {/* Combo */}
              {combo > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400"
                >
                  <Flame className="w-5 h-5" />
                  <span className="font-bold">x{Math.min(Math.floor(combo / 5) + 1, 5)}</span>
                  <span className="text-sm">({combo} combo)</span>
                </motion.div>
              )}
            </div>

            {/* Progress Bar (time) */}
            <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / sprintDuration) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Word Card */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'relative',
                lastAnswer === 'correct' && 'animate-pulse',
                lastAnswer === 'wrong' && 'animate-shake'
              )}
            >
              <Card
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  lastAnswer === 'correct' && 'border-green-500 bg-green-500/10',
                  lastAnswer === 'wrong' && 'border-red-500 bg-red-500/10'
                )}
              >
                <CardContent className="p-8">
                  {/* Word */}
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <LevelBadge level={currentWord.level} />
                      <Button variant="ghost" size="icon" onClick={playAudio}>
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <h2 className="text-5xl font-bold mb-2">{currentWord.word}</h2>
                    <p className="text-xl text-muted-foreground">
                      {currentWord.transcription}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-muted-foreground text-sm">это</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Translation */}
                  <div className="text-center mb-8">
                    <p className="text-4xl font-semibold text-primary">
                      {displayedTranslation}
                    </p>
                  </div>

                  {/* Answer Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      size="xl"
                      className="h-20 text-xl border-2 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400"
                      onClick={() => handleAnswer(false)}
                    >
                      <XCircle className="w-8 h-8 mr-3" />
                      Неверно
                    </Button>
                    <Button
                      variant="outline"
                      size="xl"
                      className="h-20 text-xl border-2 hover:bg-green-500/20 hover:border-green-500 hover:text-green-400"
                      onClick={() => handleAnswer(true)}
                    >
                      <CheckCircle className="w-8 h-8 mr-3" />
                      Верно
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Keyboard hint */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              ← или A — Неверно • → или D — Верно
            </p>
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && result && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-8 text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Crown className="w-16 h-16 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Спринт завершён!</h2>
                <p className="text-white/80">Отличная работа, {profile?.name || 'Чемпион'}!</p>
              </div>

              <CardContent className="p-8">
                {/* Score */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                    className="text-6xl font-bold text-primary mb-2"
                  >
                    {result.score}
                  </motion.div>
                  <p className="text-muted-foreground">очков</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-400">{result.correctCount}</div>
                    <div className="text-sm text-muted-foreground">правильных</div>
                  </div>

                  <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/20">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-400">{result.wrongCount}</div>
                    <div className="text-sm text-muted-foreground">ошибок</div>
                  </div>

                  <div className="bg-orange-500/10 rounded-xl p-4 text-center border border-orange-500/20">
                    <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-400">{result.maxCombo}</div>
                    <div className="text-sm text-muted-foreground">макс. комбо</div>
                  </div>

                  <div className="bg-blue-500/10 rounded-xl p-4 text-center border border-blue-500/20">
                    <Zap className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-400">{result.wordsPerMinute}</div>
                    <div className="text-sm text-muted-foreground">слов/мин</div>
                  </div>
                </div>

                {/* XP Earned */}
                <div className="bg-gradient-to-r from-primary/20 to-green-500/20 rounded-xl p-4 text-center mb-8 border border-primary/30">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    <span className="text-2xl font-bold text-primary">+{result.xpEarned} XP</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={resetGame}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Настройки
                  </Button>
                  <Button
                    variant="glow"
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500"
                    onClick={startCountdown}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Играть ещё
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
      examples: [],
      forms: [],
      synonyms: [],
      antonyms: [],
      tags: [],
    },
    {
      id: '2',
      word: 'world',
      transcription: '/wɜːld/',
      partOfSpeech: 'noun',
      level: 'A1',
      frequency: 95,
      translations: [{ translation: 'мир', isPrimary: true }],
      examples: [],
      forms: [],
      synonyms: [],
      antonyms: [],
      tags: [],
    },
    {
      id: '3',
      word: 'beautiful',
      transcription: '/ˈbjuːtɪfl/',
      partOfSpeech: 'adjective',
      level: 'A2',
      frequency: 85,
      translations: [{ translation: 'красивый', isPrimary: true }],
      examples: [],
      forms: [],
      synonyms: [],
      antonyms: [],
      tags: [],
    },
  ];
}
