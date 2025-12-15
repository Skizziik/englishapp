import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Progress, LevelBadge } from '@/components/ui';
import { SRSButtons, SessionComplete } from '@/components/learning';
import { useAppStore } from '@/stores/appStore';
import type { ReviewCard, SessionResult, Word } from '@/types';
import { cn } from '@/lib/utils';
import { speak } from '@/lib/tts';

export const ReviewPage: React.FC = () => {
  const { refreshData, targetLanguage, settings } = useAppStore();

  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    loadReviewCards();
  }, [targetLanguage]);

  // Auto-speak word when card changes
  useEffect(() => {
    if (cards.length > 0 && !isComplete) {
      const word = cards[currentIndex]?.word?.word;
      if (word) {
        speak(word);
      }
    }
  }, [currentIndex, cards, isComplete]);

  const loadReviewCards = async () => {
    setIsLoading(true);

    if (window.electronAPI) {
      const [reviewCards, stats] = await Promise.all([
        window.electronAPI.srs.getNextWords(50, targetLanguage),
        window.electronAPI.srs.getStats(targetLanguage),
      ]);
      setCards(reviewCards);
      setDueCount(stats.dueToday);
    } else {
      // Mock data for development
      setCards(getMockReviewCards());
      setDueCount(5);
    }

    setIsLoading(false);
  };

  const currentCard = cards[currentIndex];

  const playAudio = () => {
    if (!currentCard) return;
    speak(currentCard.word.word);
  };

  const handleAnswer = async (quality: number) => {
    const isCorrect = quality >= 3;
    const earnedXP = isCorrect ? 10 : 2;

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongCount((c) => c + 1);
    }
    setXpEarned((x) => x + earnedXP);

    // Record answer
    if (window.electronAPI && currentCard) {
      await window.electronAPI.srs.recordAnswer(currentCard.word.id, quality);
      await window.electronAPI.gamification.addXP(earnedXP, 'review');
    }

    // Move to next or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      await completeSession();
    }
  };

  const completeSession = async () => {
    const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);

    let streakResult = null;
    let newAchievements: any[] = [];

    if (window.electronAPI) {
      streakResult = await window.electronAPI.gamification.updateStreak();
      newAchievements = await window.electronAPI.gamification.checkAchievements();
    }

    setSessionResult({
      wordsCount: cards.length,
      correctCount,
      wrongCount,
      xpEarned,
      timeSpent,
      newWordsLearned: 0,
      streak: streakResult || undefined,
      achievements: newAchievements,
    });

    setIsComplete(true);
    refreshData();
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setCorrectCount(0);
    setWrongCount(0);
    setXpEarned(0);
    setSessionStartTime(Date.now());
    setIsComplete(false);
    setSessionResult(null);
    loadReviewCards();
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка карточек...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Повторение</h1>
            <p className="text-muted-foreground">Интервальное повторение (SRS)</p>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Всё повторено!</h2>
            <p className="text-muted-foreground mb-6">
              Отличная работа! У вас нет слов для повторения прямо сейчас.
              Приходите позже или выучите новые слова.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/learn">
                <Button variant="glow">Учить новые слова</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">На главную</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete && sessionResult) {
    return <SessionComplete result={sessionResult} onRestart={resetSession} />;
  }

  const primaryTranslation =
    currentCard?.word.translations.find((t) => t.isPrimary)?.translation ||
    currentCard?.word.translations[0]?.translation ||
    '';

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Повторение</h1>
            <p className="text-sm text-muted-foreground">
              Правильно: {correctCount} • Ошибок: {wrongCount}
            </p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Progress */}
      <Progress
        value={((currentIndex + 1) / cards.length) * 100}
        className="mb-8"
      />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              {/* Word Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <LevelBadge level={currentCard.word.level} />
                  <span className="text-sm text-muted-foreground">
                    {currentCard.word.partOfSpeech}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={playAudio}>
                  <Volume2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Word */}
              <div className="text-center mb-8">
                <h2 className="text-5xl font-bold mb-2">{currentCard.word.word}</h2>
                <p className="text-xl text-muted-foreground">
                  {currentCard.word.transcription}
                </p>
              </div>

              {/* Answer Section */}
              <AnimatePresence>
                {showAnswer ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {/* Translation */}
                    <div className="text-center mb-6 p-6 bg-primary/10 rounded-2xl border border-primary/20">
                      <p className="text-3xl font-semibold text-primary">
                        {primaryTranslation}
                      </p>
                      {currentCard.word.translations.length > 1 && (
                        <p className="text-muted-foreground mt-2">
                          {currentCard.word.translations
                            .slice(1)
                            .map((t) => t.translation)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Example */}
                    {currentCard.word.examples[0] && (
                      <div className="mb-8 p-4 bg-secondary/50 rounded-xl">
                        <p className="mb-1">{currentCard.word.examples[0].english}</p>
                        <p className="text-sm text-muted-foreground">
                          {currentCard.word.examples[0].russian}
                        </p>
                      </div>
                    )}

                    {/* SRS Buttons */}
                    <SRSButtons onAnswer={handleAnswer} />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <Button
                      variant="glow"
                      size="xl"
                      className="w-full max-w-sm"
                      onClick={() => setShowAnswer(true)}
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Показать ответ
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      Или нажмите пробел
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        Пробел — показать ответ • 1-4 — оценить знание
      </p>
    </div>
  );
};

// Mock data for development
function getMockReviewCards(): ReviewCard[] {
  const words: Word[] = [
    {
      id: '1',
      word: 'remember',
      transcription: '/rɪˈmembə/',
      partOfSpeech: 'verb',
      level: 'A2',
      frequency: 86,
      translations: [{ translation: 'помнить', isPrimary: true }],
      examples: [{ english: 'I remember your name.', russian: 'Я помню твоё имя.' }],
      forms: ['remembers', 'remembered', 'remembering'],
      synonyms: ['recall'],
      antonyms: ['forget'],
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
  ];

  return words.map((word) => ({
    word,
    progress: {
      wordId: word.id,
      status: 'review' as const,
      easeFactor: 2.5,
      interval: 7,
      repetitions: 3,
      nextReview: new Date().toISOString(),
      correctCount: 5,
      wrongCount: 1,
    },
    isNew: false,
  }));
}
