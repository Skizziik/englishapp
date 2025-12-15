import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Eye, EyeOff, Lightbulb } from 'lucide-react';
import { Card, CardContent, Button, LevelBadge, Badge } from '@/components/ui';
import type { Word } from '@/types';
import { cn } from '@/lib/utils';
import { speak } from '@/lib/tts';

interface WordCardProps {
  word: Word;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  variant?: 'compact' | 'full' | 'flashcard';
  className?: string;
}

export const WordCard: React.FC<WordCardProps> = ({
  word,
  showTranslation = true,
  onToggleTranslation,
  variant = 'full',
  className,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const playAudio = () => {
    speak(word.word);
  };

  const primaryTranslation =
    word.translations.find((t) => t.isPrimary)?.translation ||
    word.translations[0]?.translation ||
    '';

  if (variant === 'flashcard') {
    return (
      <div className={cn('perspective-1000', className)}>
        <motion.div
          className="relative w-full cursor-pointer preserve-3d"
          onClick={() => setIsFlipped(!isFlipped)}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <Card
            className={cn(
              'absolute w-full backface-hidden',
              'bg-gradient-to-br from-card to-card/80'
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <CardContent className="p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
              <LevelBadge level={word.level} className="mb-4" />
              <h2 className="text-4xl font-bold mb-2">{word.word}</h2>
              <p className="text-lg text-muted-foreground mb-4">
                {word.transcription}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio();
                }}
                className="mt-4"
              >
                <Volume2 className="w-6 h-6" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Нажмите, чтобы увидеть перевод
              </p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className={cn(
              'w-full backface-hidden',
              'bg-gradient-to-br from-primary/10 to-primary/5'
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <CardContent className="p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
              <Badge variant="outline" className="mb-4">
                {word.partOfSpeech}
              </Badge>
              <h2 className="text-3xl font-bold mb-4 text-primary">
                {primaryTranslation}
              </h2>
              {word.translations.length > 1 && (
                <p className="text-muted-foreground mb-4">
                  {word.translations
                    .slice(1)
                    .map((t) => t.translation)
                    .join(', ')}
                </p>
              )}
              {word.examples[0] && (
                <div className="mt-4 p-4 bg-background/50 rounded-xl w-full">
                  <p className="text-sm mb-2">{word.examples[0].english}</p>
                  <p className="text-sm text-muted-foreground">
                    {word.examples[0].russian}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn('group hover:border-primary/50 transition-all', className)}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <LevelBadge level={word.level} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{word.word}</span>
                <span className="text-sm text-muted-foreground">
                  {word.transcription}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{primaryTranslation}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={playAudio}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <LevelBadge level={word.level} />
            <Badge variant="outline">{word.partOfSpeech}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={playAudio}>
            <Volume2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Word */}
        <div className="mb-6">
          <h2 className="text-4xl font-bold mb-1">{word.word}</h2>
          <p className="text-lg text-muted-foreground">{word.transcription}</p>
        </div>

        {/* Translation */}
        <AnimatePresence>
          {showTranslation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <h3 className="text-2xl font-semibold text-primary mb-2">
                {primaryTranslation}
              </h3>
              {word.translations.length > 1 && (
                <p className="text-muted-foreground">
                  Также:{' '}
                  {word.translations
                    .slice(1)
                    .map((t) => t.translation)
                    .join(', ')}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Examples */}
        {showTranslation && word.examples.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4" />
              <span>Примеры</span>
            </div>
            {word.examples.slice(0, 2).map((example, idx) => (
              <div
                key={idx}
                className="p-4 bg-secondary/50 rounded-xl border border-border"
              >
                <p className="mb-1">{example.english}</p>
                <p className="text-sm text-muted-foreground">{example.russian}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toggle button */}
        {onToggleTranslation && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={onToggleTranslation}
          >
            {showTranslation ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Скрыть перевод
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Показать перевод
              </>
            )}
          </Button>
        )}

        {/* Tags */}
        {word.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {word.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
