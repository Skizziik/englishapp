import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  RefreshCw,
  Search,
  BarChart3,
  Trophy,
  Settings,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { CircularProgress } from '@/components/ui/Progress';
import { gbFlag, itFlag } from '@/assets/flags';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink to={to} className="relative block">
      <motion.div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
          isActive
            ? 'bg-primary/20 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="font-medium">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </motion.div>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { dailyGoal, userLevel, streak, targetLanguage, setTargetLanguage } = useAppStore();

  const dailyProgress = dailyGoal
    ? Math.min(100, (dailyGoal.current / dailyGoal.target) * 100)
    : 0;

  return (
    <aside className="w-64 h-full bg-card/50 border-r border-border flex flex-col">
      {/* Language Selector */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Изучаемый язык</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTargetLanguage('en')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all',
              targetLanguage === 'en'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
            )}
          >
            <img src={gbFlag} alt="UK" className="w-6 h-4 rounded-sm object-cover shadow-sm" />
            <span className="text-sm font-medium">English</span>
          </button>
          <button
            onClick={() => setTargetLanguage('it')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all',
              targetLanguage === 'it'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
            )}
          >
            <img src={itFlag} alt="Italy" className="w-6 h-4 rounded-sm object-cover shadow-sm" />
            <span className="text-sm font-medium">Italiano</span>
          </button>
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Ежедневная цель</span>
          <span className="text-sm font-medium">
            {dailyGoal?.current || 0}/{dailyGoal?.target || 50}
          </span>
        </div>
        <CircularProgress value={dailyProgress} size={100} strokeWidth={8}>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(dailyProgress)}%</div>
            <div className="text-xs text-muted-foreground">выполнено</div>
          </div>
        </CircularProgress>
      </div>

      {/* Level and Streak */}
      <div className="p-4 border-b border-border flex gap-3">
        <div className="flex-1 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-xl p-3 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">Уровень</span>
          </div>
          <div className="text-xl font-bold text-green-400">
            {userLevel?.level || 1}
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-xl p-3 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🔥</span>
            <span className="text-xs text-muted-foreground">Серия</span>
          </div>
          <div className="text-xl font-bold text-orange-400">
            {streak?.current || 0}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="mb-2 px-4 pt-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Основное
          </span>
        </div>
        <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Главная" />
        <NavItem
          to="/learn"
          icon={<BookOpen className="w-5 h-5" />}
          label="Учить слова"
        />
        <NavItem
          to="/review"
          icon={<RefreshCw className="w-5 h-5" />}
          label="Повторение"
        />
        <NavItem
          to="/sprint"
          icon={<Zap className="w-5 h-5" />}
          label="Спринт"
        />
        <NavItem
          to="/dictionary"
          icon={<Search className="w-5 h-5" />}
          label="Словарь"
        />

        <div className="mb-2 px-4 pt-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Прогресс
          </span>
        </div>
        <NavItem
          to="/statistics"
          icon={<BarChart3 className="w-5 h-5" />}
          label="Статистика"
        />
        <NavItem
          to="/achievements"
          icon={<Trophy className="w-5 h-5" />}
          label="Достижения"
        />

        <div className="mb-2 px-4 pt-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Дополнительно
          </span>
        </div>
        <NavItem
          to="/assistant"
          icon={<MessageSquare className="w-5 h-5" />}
          label="AI Ассистент"
        />
        <NavItem
          to="/settings"
          icon={<Settings className="w-5 h-5" />}
          label="Настройки"
        />
      </nav>

      {/* XP Progress at bottom */}
      {userLevel && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">До следующего уровня</span>
            <span className="text-xs font-medium text-green-400">
              {userLevel.xp}/{userLevel.xpForNext} XP
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(userLevel.xp / userLevel.xpForNext) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </aside>
  );
};
