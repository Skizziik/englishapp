import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Check, X, Keyboard } from 'lucide-react';
import { Card, CardContent, Button, LevelBadge, Input } from '@/components/ui';
import type { Word } from '@/types';
import { cn, shuffleArray } from '@/lib/utils';

interface QuizCardProps {
  word: Word;
  type: 'multipleChoice' | 'typing' | 'listening' | 'reverse';
  allWords: Word[];
  onAnswer: (correct: boolean, quality: number) => void;
  onSkip?: () => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  word,
  type,
  allWords,
  onAnswer,
  onSkip,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  const correctAnswer =
    type === 'reverse'
      ? word.word
      : word.translations.find((t) => t.isPrimary)?.translation ||
        word.translations[0]?.translation ||
        '';

  useEffect(() => {
    // Generate options for multiple choice
    if (type === 'multipleChoice' || type === 'listening') {
      const otherWords = allWords
        .filter((w) => w.id !== word.id)
        .map((w) =>
          type === 'reverse'
            ? w.word
            : w.translations[0]?.translation || ''
        )
        .filter(Boolean);

      const wrongOptions = shuffleArray(otherWords).slice(0, 3);
      const allOptions = shuffleArray([correctAnswer, ...wrongOptions]);
      setOptions(allOptions);
    }
  }, [word, type, allWords]);

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (type === 'listening') {
      playAudio();
    }
  }, [word, type]);

  const checkAnswer = (answer: string) => {
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedCorrect = correctAnswer.toLowerCase().trim();
    const correct = normalizedAnswer === normalizedCorrect;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowResult(true);

    // Determine quality for SRS
    // 0 = complete blackout, 3 = correct with difficulty, 5 = perfect
    let quality = 0;
    if (correct) {
      quality = 4; // Default correct
      // Could add timing-based scoring here
    } else {
      quality = 1; // Wrong but saw correct answer
    }

    setTimeout(() => {
      onAnswer(correct, quality);
      setSelectedAnswer(null);
      setTypedAnswer('');
      setShowResult(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && typedAnswer.trim() && !showResult) {
      checkAnswer(typedAnswer);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden">
      <CardContent className="p-8">
        {/* Question Header */}
        <div className="text-center mb-8">
          {type === 'listening' ? (
            <>
              <p className="text-muted-foreground mb-4">Прослушайте и выберите перевод</p>
              <Button
                variant="outline"
                size="lg"
                onClick={playAudio}
                className="rounded-full w-20 h-20"
              >
                <Volume2 className="w-8 h-8" />
              </Button>
            </>
          ) : type === 'reverse' ? (
            <>
              <p className="text-muted-foreground mb-2">Переведите на английский</p>
              <h2 className="text-3xl font-bold text-primary">
                {word.translations[0]?.translation}
              </h2>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 mb-2">
                <LevelBadge level={word.level} />
                <Button variant="ghost" size="icon" onClick={playAudio}>
                  <Volume2 className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-muted-foreground mb-2">Выберите перевод слова</p>
              <h2 className="text-4xl font-bold mb-1">{word.word}</h2>
              <p className="text-lg text-muted-foreground">{word.transcription}</p>
            </>
          )}
        </div>

        {/* Answer Options */}
        {(type === 'multipleChoice' || type === 'listening') && (
          <div className="grid grid-cols-2 gap-3">
            {options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === correctAnswer;

              return (
                <motion.button
                  key={idx}
                  onClick={() => !showResult && checkAnswer(option)}
                  disabled={showResult}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all duration-200',
                    !showResult && 'hover:border-primary/50 hover:bg-primary/5',
                    showResult && isCorrectOption && 'border-green-500 bg-green-500/20',
                    showResult && isSelected && !isCorrectOption && 'border-red-500 bg-red-500/20',
                    !showResult && 'border-border'
                  )}
                  whileHover={!showResult ? { scale: 1.02 } : {}}
                  whileTap={!showResult ? { scale: 0.98 } : {}}
                >
                  <span className="font-medium">{option}</span>
                  <AnimatePresence>
                    {showResult && isCorrectOption && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-2 inline-flex"
                      >
                        <Check className="w-5 h-5 text-green-500" />
                      </motion.span>
                    )}
                    {showResult && isSelected && !isCorrectOption && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-2 inline-flex"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Typing Answer */}
        {(type === 'typing' || type === 'reverse') && (
          <div className="space-y-4">
            <div className="relative">
              <Input
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={type === 'reverse' ? 'Введите слово на английском' : 'Введите перевод'}
                disabled={showResult}
                className={cn(
                  'text-lg py-6 pr-12',
                  showResult && isCorrect && 'border-green-500 bg-green-500/10',
                  showResult && !isCorrect && 'border-red-500 bg-red-500/10'
                )}
                autoFocus
              />
              <Keyboard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>

            {showResult && !isCorrect && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
              >
                <p className="text-sm text-muted-foreground mb-1">Правильный ответ:</p>
                <p className="text-lg font-semibold text-red-400">{correctAnswer}</p>
              </motion.div>
            )}

            {!showResult && (
              <div className="flex gap-3">
                <Button
                  variant="glow"
                  className="flex-1"
                  onClick={() => checkAnswer(typedAnswer)}
                  disabled={!typedAnswer.trim()}
                >
                  Проверить
                </Button>
                {onSkip && (
                  <Button variant="ghost" onClick={onSkip}>
                    Пропустить
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Result Feedback */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mt-6 p-4 rounded-xl text-center',
                isCorrect
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-red-500/20 border border-red-500/30'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {isCorrect ? (
                  <>
                    <Check className="w-6 h-6 text-green-400" />
                    <span className="text-lg font-semibold text-green-400">
                      Правильно! +10 XP
                    </span>
                  </>
                ) : (
                  <>
                    <X className="w-6 h-6 text-red-400" />
                    <span className="text-lg font-semibold text-red-400">
                      Неправильно
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
