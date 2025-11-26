import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Check, Star } from 'lucide-react';
import { Card, CardContent, Progress } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import type { Achievement } from '@/types';
import { cn, formatDateFull } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const AchievementsPage: React.FC = () => {
  const { achievements } = useAppStore();
  const [localAchievements, setLocalAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.gamification.getAchievements();
      setLocalAchievements(data);
    } else {
      // Mock data
      setLocalAchievements(getMockAchievements());
    }
  };

  const unlockedCount = localAchievements.filter((a) => a.unlockedAt).length;
  const totalCount = localAchievements.length;

  // Group by category
  const wordAchievements = localAchievements.filter((a) => a.condition === 'words_learned');
  const streakAchievements = localAchievements.filter((a) => a.condition === 'streak');
  const xpAchievements = localAchievements.filter((a) => a.condition === 'xp');
  const otherAchievements = localAchievements.filter(
    (a) => !['words_learned', 'streak', 'xp'].includes(a.condition)
  );

  const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    const isUnlocked = !!achievement.unlockedAt;
    const progress = Math.min(100, (achievement.progress / achievement.target) * 100);

    return (
      <motion.div variants={item}>
        <Card
          className={cn(
            'overflow-hidden transition-all duration-300',
            isUnlocked
              ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/30 hover:border-yellow-500/50'
              : 'opacity-70 hover:opacity-100'
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                  isUnlocked
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20'
                    : 'bg-secondary'
                )}
              >
                {isUnlocked ? (
                  achievement.icon
                ) : (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={cn(
                      'font-semibold truncate',
                      isUnlocked && 'text-yellow-400'
                    )}
                  >
                    {achievement.name}
                  </h3>
                  {isUnlocked && (
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {achievement.description}
                </p>

                {/* Progress */}
                {!isUnlocked && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Прогресс</span>
                      <span>
                        {achievement.progress} / {achievement.target}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* Unlock date */}
                {isUnlocked && achievement.unlockedAt && (
                  <p className="text-xs text-muted-foreground">
                    Получено: {formatDateFull(achievement.unlockedAt)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const AchievementSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    achievements: Achievement[];
  }> = ({ title, icon, achievements }) => {
    if (achievements.length === 0) return null;

    const unlockedInSection = achievements.filter((a) => a.unlockedAt).length;

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {unlockedInSection} / {achievements.length}
          </span>
        </div>
        <motion.div
          className="grid grid-cols-2 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Достижения</h1>
            <p className="text-muted-foreground">
              Зарабатывайте награды за свой прогресс в изучении
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-400">
              {unlockedCount} / {totalCount}
            </div>
            <p className="text-sm text-muted-foreground">получено</p>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Общий прогресс</span>
                  <span className="text-yellow-400 font-bold">
                    {Math.round((unlockedCount / totalCount) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(unlockedCount / totalCount) * 100}
                  className="h-3"
                  indicatorClassName="bg-gradient-to-r from-yellow-500 to-orange-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Sections */}
        <AchievementSection
          title="Изучение слов"
          icon={<span className="text-xl">📚</span>}
          achievements={wordAchievements}
        />

        <AchievementSection
          title="Серия дней"
          icon={<span className="text-xl">🔥</span>}
          achievements={streakAchievements}
        />

        <AchievementSection
          title="Опыт (XP)"
          icon={<span className="text-xl">⚡</span>}
          achievements={xpAchievements}
        />

        <AchievementSection
          title="Другие"
          icon={<Star className="w-5 h-5 text-purple-400" />}
          achievements={otherAchievements}
        />
      </motion.div>
    </div>
  );
};

function getMockAchievements(): Achievement[] {
  return [
    {
      id: 'first_word',
      name: 'Первое слово',
      description: 'Выучите своё первое слово',
      icon: '🎯',
      condition: 'words_learned',
      unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 1,
      target: 1,
    },
    {
      id: 'words_10',
      name: 'Начинающий',
      description: 'Выучите 10 слов',
      icon: '📚',
      condition: 'words_learned',
      unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 10,
      target: 10,
    },
    {
      id: 'words_50',
      name: 'Прилежный ученик',
      description: 'Выучите 50 слов',
      icon: '📖',
      condition: 'words_learned',
      progress: 35,
      target: 50,
    },
    {
      id: 'words_100',
      name: 'Сотня',
      description: 'Выучите 100 слов',
      icon: '💯',
      condition: 'words_learned',
      progress: 35,
      target: 100,
    },
    {
      id: 'words_500',
      name: 'Полиглот',
      description: 'Выучите 500 слов',
      icon: '🎓',
      condition: 'words_learned',
      progress: 35,
      target: 500,
    },
    {
      id: 'streak_3',
      name: 'Три дня подряд',
      description: 'Учитесь 3 дня подряд',
      icon: '🔥',
      condition: 'streak',
      unlockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 5,
      target: 3,
    },
    {
      id: 'streak_7',
      name: 'Неделя',
      description: 'Учитесь 7 дней подряд',
      icon: '🔥',
      condition: 'streak',
      progress: 5,
      target: 7,
    },
    {
      id: 'streak_30',
      name: 'Месяц',
      description: 'Учитесь 30 дней подряд',
      icon: '🔥',
      condition: 'streak',
      progress: 5,
      target: 30,
    },
    {
      id: 'xp_100',
      name: 'Первая сотня XP',
      description: 'Заработайте 100 XP',
      icon: '⭐',
      condition: 'xp',
      unlockedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 350,
      target: 100,
    },
    {
      id: 'xp_1000',
      name: 'Тысяча XP',
      description: 'Заработайте 1000 XP',
      icon: '🌟',
      condition: 'xp',
      progress: 350,
      target: 1000,
    },
    {
      id: 'perfect_session',
      name: 'Без ошибок',
      description: 'Завершите сессию без ошибок',
      icon: '✨',
      condition: 'perfect_session',
      unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 1,
      target: 1,
    },
    {
      id: 'sessions_10',
      name: '10 сессий',
      description: 'Завершите 10 сессий',
      icon: '📝',
      condition: 'sessions',
      progress: 8,
      target: 10,
    },
  ];
}
