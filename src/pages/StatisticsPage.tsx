import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  Award,
  BookOpen,
  Zap,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
} from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { formatTime, formatNumber } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DailyData {
  date: string;
  wordsLearned: number;
  wordsReviewed: number;
  xpEarned: number;
  timeSpent: number;
}

export const StatisticsPage: React.FC = () => {
  const { stats, userLevel, streak } = useAppStore();
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (window.electronAPI) {
      const [daily, weekly, monthly] = await Promise.all([
        window.electronAPI.stats.getDaily(30),
        window.electronAPI.stats.getWeekly(),
        window.electronAPI.stats.getMonthly(),
      ]);
      setDailyData(daily.reverse());
      setWeeklyStats(weekly);
      setMonthlyStats(monthly);
    } else {
      // Mock data
      const mockDaily = generateMockDailyData(30);
      setDailyData(mockDaily);
      setWeeklyStats({
        wordsLearned: 35,
        wordsReviewed: 180,
        xpEarned: 450,
        timeSpent: 3600,
      });
      setMonthlyStats({
        wordsLearned: 120,
        wordsReviewed: 750,
        xpEarned: 1850,
        timeSpent: 14400,
      });
    }
  };

  const currentStats = activeTab === 'week' ? weeklyStats : activeTab === 'month' ? monthlyStats : stats;
  const chartData = activeTab === 'week' ? dailyData.slice(-7) : activeTab === 'month' ? dailyData : dailyData;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">Статистика</h1>
        <p className="text-muted-foreground mb-8">
          Отслеживайте свой прогресс в изучении английского
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatNumber(stats?.totalXP || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Всего XP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/20">
                  <span className="text-lg">🔥</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{streak?.current || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Текущая серия (макс: {streak?.longest || 0})
                  </p>
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
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'week' ? 'Неделя' : tab === 'month' ? 'Месяц' : 'Всё время'}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* XP Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                XP по дням
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      tickFormatter={(v) => new Date(v).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="xpEarned"
                      stroke="#22c55e"
                      fill="url(#xpGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Words Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Слова по дням
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      tickFormatter={(v) => new Date(v).toLocaleDateString('ru', { day: 'numeric' })}
                    />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                      cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                    />
                    <Bar dataKey="wordsLearned" fill="#22c55e" name="Выучено" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wordsReviewed" fill="#3b82f6" name="Повторено" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {activeTab === 'week'
                ? 'За неделю'
                : activeTab === 'month'
                ? 'За месяц'
                : 'За всё время'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold mb-1">
                  {currentStats?.wordsLearned || currentStats?.learnedWords || 0}
                </p>
                <p className="text-sm text-muted-foreground">Новых слов</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold mb-1">
                  {currentStats?.wordsReviewed || 0}
                </p>
                <p className="text-sm text-muted-foreground">Повторений</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold mb-1">
                  {formatNumber(currentStats?.xpEarned || currentStats?.totalXP || 0)}
                </p>
                <p className="text-sm text-muted-foreground">XP заработано</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold mb-1">
                  {formatTime(currentStats?.timeSpent || currentStats?.totalTimeSpent || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Время</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level Progress */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Прогресс уровня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-green-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-primary/30">
                  {userLevel?.level || 1}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Уровень {userLevel?.level || 1}</span>
                  <span className="text-sm text-muted-foreground">
                    {userLevel?.xp || 0} / {userLevel?.xpForNext || 100} XP
                  </span>
                </div>
                <Progress
                  value={((userLevel?.xp || 0) / (userLevel?.xpForNext || 100)) * 100}
                  className="h-3"
                  indicatorClassName="bg-gradient-to-r from-green-500 to-emerald-400"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  До следующего уровня: {(userLevel?.xpForNext || 100) - (userLevel?.xp || 0)} XP
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

function generateMockDailyData(days: number): DailyData[] {
  const data: DailyData[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      wordsLearned: Math.floor(Math.random() * 15),
      wordsReviewed: Math.floor(Math.random() * 50),
      xpEarned: Math.floor(Math.random() * 100) + 20,
      timeSpent: Math.floor(Math.random() * 1800) + 300,
    });
  }

  return data;
}
