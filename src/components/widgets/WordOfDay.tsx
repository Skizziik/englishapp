import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Volume2,
  RefreshCw,
  Bell,
  Star,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

interface WordOfDayData {
  id: string;
  word: string;
  transcription: string;
  partOfSpeech: string;
  level: string;
  translations: string[];
}

interface WordOfDayProps {
  className?: string;
}

const levelColors: Record<string, string> = {
  A1: 'bg-green-500/20 text-green-400 border-green-500/30',
  A2: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  B2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  C1: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  C2: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const WordOfDay: React.FC<WordOfDayProps> = ({ className }) => {
  const { targetLanguage } = useAppStore();
  const [wordOfDay, setWordOfDay] = useState<WordOfDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    loadWordOfDay();
  }, [targetLanguage]);

  const loadWordOfDay = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const word = await window.electronAPI.wordOfDay.get(targetLanguage);
        setWordOfDay(word);
      } else {
        // Mock data for development
        setWordOfDay({
          id: '1',
          word: 'serendipity',
          transcription: '/ˌserənˈdɪpɪti/',
          partOfSpeech: 'noun',
          level: 'C1',
          translations: ['счастливая случайность', 'удачное стечение обстоятельств'],
        });
      }
    } catch (error) {
      console.error('Failed to load word of the day:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowNotification = async () => {
    if (window.electronAPI) {
      await window.electronAPI.wordOfDay.showNotification();
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wordOfDay) {
    return null;
  }

  const languageLabel = targetLanguage === 'it' ? 'Итальянский' : 'Английский';

  return (
    <Card className={cn('overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/5 border-primary/20', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Слово дня</h3>
              <p className="text-xs text-muted-foreground">{languageLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShowNotification}
            title="Показать уведомление"
          >
            <Bell className="w-4 h-4" />
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{wordOfDay.word}</span>
            <Badge className={cn('text-xs', levelColors[wordOfDay.level] || levelColors['B1'])}>
              {wordOfDay.level}
            </Badge>
          </div>

          {wordOfDay.transcription && (
            <p className="text-sm text-muted-foreground font-mono">
              {wordOfDay.transcription}
            </p>
          )}

          {wordOfDay.partOfSpeech && (
            <Badge variant="secondary" className="text-xs">
              {wordOfDay.partOfSpeech}
            </Badge>
          )}

          <motion.div
            initial={false}
            animate={{ height: showTranslation ? 'auto' : 0, opacity: showTranslation ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-border mt-3">
              <p className="text-sm text-muted-foreground mb-1">Перевод:</p>
              <p className="font-medium">{wordOfDay.translations.slice(0, 2).join(', ')}</p>
            </div>
          </motion.div>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setShowTranslation(!showTranslation)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {showTranslation ? 'Скрыть перевод' : 'Показать перевод'}
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default WordOfDay;
