import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Target,
  Clock,
  Zap,
  ArrowRight,
  Home,
  RefreshCw,
  Star,
} from 'lucide-react';
import { Button, Card, CardContent, XPBadge, StreakBadge } from '@/components/ui';
import type { SessionResult, Achievement } from '@/types';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SessionCompleteProps {
  result: SessionResult;
  onRestart?: () => void;
  onGoHome?: () => void;
}

const confettiColors = ['#22c55e', '#eab308', '#3b82f6', '#ec4899', '#8b5cf6'];

const Confetti: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor:
              confettiColors[Math.floor(Math.random() * confettiColors.length)],
            left: `${Math.random() * 100}%`,
            top: -20,
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 20,
            rotate: Math.random() * 720 - 360,
            opacity: 0,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

export const SessionComplete: React.FC<SessionCompleteProps> = ({
  result,
  onRestart,
  onGoHome,
}) => {
  const accuracy =
    result.wordsCount > 0
      ? Math.round((result.correctCount / result.wordsCount) * 100)
      : 0;

  const isPerfect = accuracy === 100 && result.wordsCount > 0;

  return (
    <motion.div
      className="min-h-[80vh] flex items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {isPerfect && <Confetti />}

      <div className="w-full max-w-lg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <div
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4',
                isPerfect
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
              )}
            >
              {isPerfect ? (
                <Star className="w-12 h-12 text-white fill-white" />
              ) : (
                <Trophy className="w-12 h-12 text-white" />
              )}
            </div>
            {isPerfect && (
              <motion.div
                className="absolute inset-0 w-24 h-24 rounded-full mx-auto border-4 border-yellow-400/50"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {isPerfect ? 'Идеально!' : 'Отлично!'}
          </h1>
          <p className="text-muted-foreground">
            {isPerfect
              ? 'Вы не допустили ни одной ошибки!'
              : 'Вы завершили сессию обучения'}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-secondary/50 rounded-xl">
                  <Target className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <p className="text-2xl font-bold">{result.correctCount}</p>
                  <p className="text-sm text-muted-foreground">Правильно</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-xl">
                  <div className="w-6 h-6 mx-auto mb-2 text-red-400 font-bold text-xl">
                    ✕
                  </div>
                  <p className="text-2xl font-bold">{result.wrongCount}</p>
                  <p className="text-sm text-muted-foreground">Ошибок</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-xl">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <p className="text-2xl font-bold">
                    {formatTime(result.timeSpent)}
                  </p>
                  <p className="text-sm text-muted-foreground">Время</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-xl">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                  <p className="text-2xl font-bold">{accuracy}%</p>
                  <p className="text-sm text-muted-foreground">Точность</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* XP and Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4 mb-6"
        >
          <XPBadge amount={result.xpEarned} className="text-lg px-6 py-2" />
          {result.streak && result.streak.extended && (
            <StreakBadge days={result.streak.current} className="text-lg px-6 py-2" />
          )}
        </motion.div>

        {/* New Words */}
        {result.newWordsLearned > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mb-6"
          >
            <p className="text-muted-foreground">
              Новых слов изучено:{' '}
              <span className="text-primary font-semibold">
                +{result.newWordsLearned}
              </span>
            </p>
          </motion.div>
        )}

        {/* Achievements */}
        {result.achievements && result.achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <h3 className="text-center text-sm text-muted-foreground mb-3">
              Новые достижения!
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {result.achievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30"
                >
                  <span className="text-xl">{achievement.icon}</span>
                  <span className="font-medium">{achievement.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-4"
        >
          {onRestart && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onRestart}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Ещё раз
            </Button>
          )}
          <Link to="/" className="flex-1">
            <Button variant="glow" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};
