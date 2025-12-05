import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  RefreshCw,
  Target,
  TrendingUp,
  Clock,
  Award,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button, Card, CardContent, XPProgress, StreakBadge, XPBadge, LevelBadge } from '@/components/ui';
import { WordOfDay } from '@/components/widgets';
import { useAppStore } from '@/stores/appStore';
import { getGreeting, formatTime, formatNumber } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const HomePage: React.FC = () => {
  const { stats, dailyGoal, userLevel, streak, profile, targetLanguage } = useAppStore();
  const [dueCount, setDueCount] = useState(0);

  const langName = targetLanguage === 'it' ? 'итальянского' : 'английского';

  useEffect(() => {
    const loadDueCount = async () => {
      if (window.electronAPI) {
        const count = await window.electronAPI.srs.getDueCount(targetLanguage);
        setDueCount(count);
      } else {
        setDueCount(15); // Mock data for development
      }
    };
    loadDueCount();
  }, [targetLanguage]);

  const dailyProgress = dailyGoal
    ? Math.min(100, (dailyGoal.current / dailyGoal.target) * 100)
    : 0;

  return (
    <motion.div
      className="p-8 max-w-6xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Welcome Header */}
      <motion.div variants={item} className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {getGreeting()}, {profile?.name || 'Пользователь'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Готовы продолжить изучение {langName}?
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/20">
                <BookOpen className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.learnedWords || 0}</p>
                <p className="text-xs text-muted-foreground">Выучено слов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.learningWords || 0}</p>
                <p className="text-xs text-muted-foreground">В процессе</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-yellow-500/20">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats?.totalXP || 0)}</p>
                <p className="text-xs text-muted-foreground">Всего XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatTime(stats?.totalTimeSpent || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Время обучения</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Daily Goal Card */}
        <motion.div variants={item}>
          <Card className="h-full bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Сегодняшняя цель</h2>
                <div className="flex items-center gap-2">
                  <StreakBadge days={streak?.current || 0} />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-4xl font-bold">{dailyGoal?.current || 0}</span>
                  <span className="text-muted-foreground">
                    из {dailyGoal?.target || 50}{' '}
                    {dailyGoal?.type === 'time' ? 'минут' : 'карточек'}
                  </span>
                </div>
                <XPProgress value={dailyProgress} className="h-3" />
              </div>

              {dailyProgress >= 100 ? (
                <div className="flex items-center gap-2 text-green-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">Цель выполнена! Отличная работа!</span>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Осталось {(dailyGoal?.target || 50) - (dailyGoal?.current || 0)}{' '}
                  {dailyGoal?.type === 'time' ? 'минут' : 'карточек'} до цели
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="space-y-4">
          {/* Learn New Words */}
          <Link to="/learn">
            <Card className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Учить новые слова</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats?.totalWords ? stats.totalWords - (stats.learnedWords + stats.learningWords) : 0} слов доступно
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          {/* Review Words */}
          <Link to="/review">
            <Card className="group cursor-pointer hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Повторить слова</h3>
                    <p className="text-sm text-muted-foreground">
                      {dueCount > 0 ? (
                        <span className="text-orange-400 font-medium">
                          {dueCount} {dueCount === 1 ? 'слово' : dueCount < 5 ? 'слова' : 'слов'} к повторению
                        </span>
                      ) : (
                        'Всё повторено!'
                      )}
                    </p>
                  </div>
                </div>
                {dueCount > 0 && (
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
                    {dueCount}
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          {/* Sprint Mode */}
          <Link to="/sprint">
            <Card className="group cursor-pointer hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Режим Спринт</h3>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-yellow-400 font-medium">
                        60 секунд на максимум очков!
                      </span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Level Progress */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-green-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-primary/30">
                  {userLevel?.level || 1}
                </div>
                <div>
                  <h3 className="font-semibold">Уровень {userLevel?.level || 1}</h3>
                  <p className="text-sm text-muted-foreground">
                    {userLevel?.xp || 0} / {userLevel?.xpForNext || 100} XP
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LevelBadge level={profile?.targetLevel || 'B1'} />
                <span className="text-sm text-muted-foreground">Цель</span>
              </div>
            </div>
            <XPProgress
              value={((userLevel?.xp || 0) / (userLevel?.xpForNext || 100)) * 100}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Word of the Day and Tips Section */}
      <motion.div variants={item} className="mt-8 grid grid-cols-2 gap-6">
        <WordOfDay />

        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Совет дня</h3>
                <p className="text-muted-foreground">
                  Регулярные короткие сессии эффективнее длинных редких занятий.
                  Старайтесь заниматься каждый день хотя бы 10-15 минут!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
