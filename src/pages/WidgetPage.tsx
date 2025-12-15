import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  CheckCircle,
  XCircle,
  Trophy,
  Flame,
  GripVertical,
  Play,
  RotateCcw,
  Pin,
  PinOff,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { gbFlag, itFlag } from '@/assets/flags';
import { cn } from '@/lib/utils';

type WidgetPhase = 'setup' | 'playing' | 'complete';

const BUNDLE_SIZES = [3, 5, 10];

interface WidgetWord {
  id: string;
  word: string;
  transcription?: string;
  translation: string;
}

interface QuizQuestion {
  word: WidgetWord;
  options: string[];
  correctAnswer: string;
}

export const WidgetPage: React.FC = () => {
  // Setup state
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'it'>('en');
  const [bundleSize, setBundleSize] = useState(5);

  // Game state
  const [phase, setPhase] = useState<WidgetPhase>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Always on top state
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);

  // Load initial always on top state
  useEffect(() => {
    const loadAlwaysOnTop = async () => {
      if (window.widgetAPI) {
        const isOnTop = await window.widgetAPI.isAlwaysOnTop();
        setAlwaysOnTop(isOnTop);
      }
    };
    loadAlwaysOnTop();
  }, []);

  const toggleAlwaysOnTop = async () => {
    if (window.widgetAPI) {
      const newValue = !alwaysOnTop;
      await window.widgetAPI.setAlwaysOnTop(newValue);
      setAlwaysOnTop(newValue);
    }
  };

  // Window controls
  const handleClose = async () => {
    if (window.widgetAPI) {
      await window.widgetAPI.close();
    }
  };

  const handleMinimize = async () => {
    if (window.widgetAPI) {
      await window.widgetAPI.minimize();
    }
  };

  // Start game
  const startGame = async () => {
    if (!window.widgetAPI) {
      // Mock for development
      setQuestions(getMockQuestions(bundleSize));
      setPhase('playing');
      return;
    }

    try {
      const reviewCards = await window.widgetAPI.getWords(bundleSize, targetLanguage);

      if (reviewCards.length === 0) {
        return;
      }

      // Build questions with answer options
      const questionsData: QuizQuestion[] = [];

      for (const card of reviewCards) {
        // Extract translation from ReviewCard structure
        const wordData = card.word || card;
        const primaryTranslation = wordData.translations?.find((t: any) => t.isPrimary);
        const correctAnswer = primaryTranslation?.translation || wordData.translations?.[0]?.translation || '';

        if (!correctAnswer) continue;

        const options = await window.widgetAPI.getAnswerOptions(correctAnswer, targetLanguage);

        questionsData.push({
          word: {
            id: wordData.id,
            word: wordData.word,
            transcription: wordData.transcription,
            translation: correctAnswer,
          },
          options,
          correctAnswer,
        });
      }

      setQuestions(questionsData);
      setCurrentIndex(0);
      setCorrectCount(0);
      setWrongCount(0);
      setCombo(0);
      setMaxCombo(0);
      setXpEarned(0);
      setPhase('playing');
    } catch (error) {
      console.error('Failed to load words:', error);
    }
  };

  // Handle answer
  const handleAnswer = async (answer: string) => {
    if (showResult || !questions[currentIndex]) return;

    const question = questions[currentIndex];
    const isCorrect = answer === question.correctAnswer;

    setSelectedAnswer(answer);
    setShowResult(true);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
      setCorrectCount((prev) => prev + 1);

      // Calculate XP with combo bonus
      const comboBonus = Math.min(Math.floor(newCombo / 3), 3);
      const earnedXP = 5 + comboBonus;
      setXpEarned((prev) => prev + earnedXP);

      // Record answer in SRS
      if (window.widgetAPI) {
        await window.widgetAPI.recordAnswer(question.word.id, 4); // Good answer
        await window.widgetAPI.addXP(earnedXP);
      }
    } else {
      setCombo(0);
      setWrongCount((prev) => prev + 1);

      // Record wrong answer in SRS
      if (window.widgetAPI) {
        await window.widgetAPI.recordAnswer(question.word.id, 1); // Wrong answer
      }
    }

    // Move to next question after delay
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowResult(false);

      if (currentIndex + 1 >= questions.length) {
        endGame();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 800);
  };

  // End game
  const endGame = async () => {
    setPhase('complete');

    if (window.widgetAPI) {
      await window.widgetAPI.updateStreak();
    }
  };

  // Reset game
  const resetGame = () => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setCombo(0);
    setMaxCombo(0);
    setXpEarned(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing' || showResult) return;

      const key = e.key;
      if (['1', '2', '3', '4'].includes(key)) {
        const index = parseInt(key) - 1;
        const question = questions[currentIndex];
        if (question && question.options[index]) {
          handleAnswer(question.options[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, questions, showResult]);

  // Custom drag implementation for frameless window
  useEffect(() => {
    const dragHandle = dragRef.current;
    if (!dragHandle) return;

    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      startX = e.screenX;
      startY = e.screenY;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;
        startX = e.screenX;
        startY = e.screenY;

        window.moveBy(deltaX, deltaY);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    dragHandle.addEventListener('mousedown', handleMouseDown);
    return () => dragHandle.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const currentQuestion = questions[currentIndex];

  return (
    <div className="h-screen bg-[#1a1a2e] text-white flex flex-col overflow-hidden select-none">
      {/* Title Bar */}
      <div
        ref={dragRef}
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-[#16162a] border-b border-white/10",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">Quick Learn</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAlwaysOnTop}
            className={cn(
              "p-1.5 rounded transition-colors",
              alwaysOnTop ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10 text-white/60"
            )}
            title={alwaysOnTop ? "Поверх всех окон (вкл)" : "Поверх всех окон (выкл)"}
          >
            {alwaysOnTop ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <Minus className="w-4 h-4 text-white/60" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/60 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Setup Phase */}
          {phase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col"
            >
              {/* Language Selection */}
              <div className="mb-6">
                <label className="text-xs text-white/50 mb-2 block">Язык</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetLanguage('en')}
                    className={cn(
                      "flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center",
                      targetLanguage === 'en'
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <img src={gbFlag} alt="English" className="w-8 h-8" />
                  </button>
                  <button
                    onClick={() => setTargetLanguage('it')}
                    className={cn(
                      "flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center",
                      targetLanguage === 'it'
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <img src={itFlag} alt="Italian" className="w-8 h-8" />
                  </button>
                </div>
              </div>

              {/* Bundle Size */}
              <div className="mb-6">
                <label className="text-xs text-white/50 mb-2 block">Количество слов</label>
                <div className="flex gap-2">
                  {BUNDLE_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setBundleSize(size)}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-2 font-bold transition-all",
                        bundleSize === size
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : "border-white/10 hover:border-white/30 text-white/70"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <div className="flex-1" />
              <button
                onClick={startGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Play className="w-5 h-5" />
                Начать
              </button>
            </motion.div>
          )}

          {/* Playing Phase */}
          {phase === 'playing' && currentQuestion && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Progress & Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/50">
                    {currentIndex + 1}/{questions.length}
                  </span>
                  {combo > 2 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400"
                    >
                      <Flame className="w-3 h-3" />
                      <span className="text-xs font-bold">{combo}</span>
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-sm">{correctCount}</span>
                  <span className="text-white/30">/</span>
                  <span className="text-red-400 text-sm">{wrongCount}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Word */}
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center mb-6"
              >
                <div className="text-3xl font-bold mb-1">{currentQuestion.word.word}</div>
                {currentQuestion.word.transcription && (
                  <div className="text-sm text-white/40">{currentQuestion.word.transcription}</div>
                )}
              </motion.div>

              {/* Answer Options */}
              <div className="flex-1 flex flex-col gap-2">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = option === currentQuestion.correctAnswer;
                  const isSelected = option === selectedAnswer;

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleAnswer(option)}
                      disabled={showResult}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                        showResult && isCorrect && "border-green-500 bg-green-500/20",
                        showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/20",
                        !showResult && "border-white/10 hover:border-white/30 hover:bg-white/5",
                        showResult && !isSelected && !isCorrect && "opacity-50"
                      )}
                    >
                      <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                        {index + 1}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Keyboard Hint */}
              <div className="text-center text-xs text-white/30 mt-3">
                Клавиши 1-4 для быстрого ответа
              </div>
            </motion.div>
          )}

          {/* Complete Phase */}
          {phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-6">Готово!</h2>

              {/* Stats */}
              <div className="w-full grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-400">{correctCount}</div>
                  <div className="text-xs text-white/50">правильно</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-red-400">{wrongCount}</div>
                  <div className="text-xs text-white/50">ошибок</div>
                </div>
              </div>

              {/* XP & Combo */}
              <div className="w-full flex gap-3 mb-6">
                <div className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-purple-400">+{xpEarned}</div>
                  <div className="text-xs text-white/50">XP</div>
                </div>
                <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-orange-400">{maxCombo}</div>
                  <div className="text-xs text-white/50">макс. комбо</div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="w-full bg-white/5 rounded-xl p-3 text-center mb-6">
                <div className="text-3xl font-bold">
                  {questions.length > 0
                    ? Math.round((correctCount / questions.length) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-white/50">точность</div>
              </div>

              {/* Actions */}
              <div className="w-full flex gap-3">
                <button
                  onClick={resetGame}
                  className="flex-1 py-3 rounded-xl border-2 border-white/10 hover:border-white/30 flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Назад
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-4 h-4" />
                  Ещё раз
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Mock data for development
function getMockQuestions(count: number): QuizQuestion[] {
  const mockWords: WidgetWord[] = [
    { id: '1', word: 'hello', transcription: '/həˈləʊ/', translation: 'привет' },
    { id: '2', word: 'world', transcription: '/wɜːld/', translation: 'мир' },
    { id: '3', word: 'beautiful', transcription: '/ˈbjuːtɪfl/', translation: 'красивый' },
    { id: '4', word: 'language', transcription: '/ˈlæŋɡwɪdʒ/', translation: 'язык' },
    { id: '5', word: 'study', transcription: '/ˈstʌdi/', translation: 'учиться' },
    { id: '6', word: 'time', transcription: '/taɪm/', translation: 'время' },
    { id: '7', word: 'friend', transcription: '/frend/', translation: 'друг' },
    { id: '8', word: 'music', transcription: '/ˈmjuːzɪk/', translation: 'музыка' },
    { id: '9', word: 'book', transcription: '/bʊk/', translation: 'книга' },
    { id: '10', word: 'water', transcription: '/ˈwɔːtər/', translation: 'вода' },
  ];

  const allTranslations = mockWords.map(w => w.translation);

  return mockWords.slice(0, count).map((word) => {
    const wrongOptions = allTranslations
      .filter(t => t !== word.translation)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [...wrongOptions, word.translation].sort(() => Math.random() - 0.5);

    return {
      word,
      options,
      correctAnswer: word.translation,
    };
  });
}
