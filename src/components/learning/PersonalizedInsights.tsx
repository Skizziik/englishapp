import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Target,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Award,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

interface Recommendation {
  type: 'focus' | 'practice' | 'habit' | 'tip';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface WeeklyGoal {
  wordsToLearn: number;
  reviewSessions: number;
  focusArea: string;
}

interface NextMilestone {
  description: string;
  wordsNeeded: number;
}

interface PersonalizedAnalysis {
  level: 'beginner' | 'intermediate' | 'advanced';
  strengths: string[];
  areasToImprove: string[];
  recommendations: Recommendation[];
  weeklyGoal: WeeklyGoal;
  motivation: string;
  nextMilestone: NextMilestone;
}

interface PersonalizedInsightsProps {
  className?: string;
  variant?: 'compact' | 'full';
}

const typeIcons = {
  focus: Target,
  practice: Zap,
  habit: Clock,
  tip: Lightbulb,
};

const typeColors = {
  focus: 'text-blue-400 bg-blue-400/10',
  practice: 'text-purple-400 bg-purple-400/10',
  habit: 'text-orange-400 bg-orange-400/10',
  tip: 'text-green-400 bg-green-400/10',
};

const priorityColors = {
  high: 'border-red-500/30 bg-red-500/5',
  medium: 'border-yellow-500/30 bg-yellow-500/5',
  low: 'border-green-500/30 bg-green-500/5',
};

const levelColors = {
  beginner: 'text-green-400 bg-green-400/10 border-green-500/30',
  intermediate: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
  advanced: 'text-purple-400 bg-purple-400/10 border-purple-500/30',
};

const levelLabels = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export const PersonalizedInsights: React.FC<PersonalizedInsightsProps> = ({
  className,
  variant = 'full',
}) => {
  const { stats, streak, targetLanguage } = useAppStore();
  const [analysis, setAnalysis] = useState<PersonalizedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(variant === 'full');

  const loadAnalysis = async () => {
    if (!window.electronAPI) {
      // Mock data for development
      setAnalysis(getMockAnalysis());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isConfigured = await window.electronAPI.gemini.isConfigured();
      if (!isConfigured) {
        setError('Настройте Gemini API для получения персональных рекомендаций');
        return;
      }

      // Получаем реальные данные из базы
      const [difficultWords, strongCategories, weakCategories] = await Promise.all([
        window.electronAPI.stats.getDifficultWords(targetLanguage),
        window.electronAPI.stats.getStrongCategories(targetLanguage),
        window.electronAPI.stats.getWeakCategories(targetLanguage),
      ]);

      // Prepare stats for analysis
      const totalAnswers = (stats?.correctAnswers || 0) + (stats?.wrongAnswers || 0);
      const progressStats = {
        totalWords: stats?.totalWords || 0,
        learnedWords: stats?.learnedWords || 0,
        learningWords: stats?.learningWords || 0,
        totalXP: stats?.totalXP || 0,
        streak: streak?.current || 0,
        accuracy: totalAnswers > 0
          ? Math.round((stats?.correctAnswers || 0) / totalAnswers * 100)
          : 0,
        difficultWords,
        strongCategories,
        weakCategories,
        averageSessionTime: Math.round((stats?.totalTimeSpent || 0) / Math.max(stats?.sessionsCompleted || 1, 1) / 60),
        sessionsPerWeek: stats?.sessionsThisWeek || 0,
      };

      const response = await window.electronAPI.gemini.analyzeProgress(progressStats, targetLanguage);

      if (!response.success) {
        setError(response.error || 'Ошибка анализа');
        return;
      }

      try {
        const cleanedData = response.data?.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedData || '{}');
        setAnalysis(parsed);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        setError('Ошибка обработки ответа');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && !analysis && !isLoading && !error) {
      loadAnalysis();
    }
  }, [isExpanded, stats]);

  if (variant === 'compact') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">AI-рекомендации</h3>
              <p className="text-xs text-muted-foreground">
                Персональный анализ вашего прогресса
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 border-t border-border pt-4">
                <InsightsContent
                  analysis={analysis}
                  isLoading={isLoading}
                  error={error}
                  onRefresh={loadAnalysis}
                  variant="compact"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI-рекомендации</h3>
              <p className="text-sm text-muted-foreground">
                Персональный анализ вашего обучения
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadAnalysis}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        <InsightsContent
          analysis={analysis}
          isLoading={isLoading}
          error={error}
          onRefresh={loadAnalysis}
          variant="full"
        />
      </CardContent>
    </Card>
  );
};

interface InsightsContentProps {
  analysis: PersonalizedAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  variant: 'compact' | 'full';
}

const InsightsContent: React.FC<InsightsContentProps> = ({
  analysis,
  isLoading,
  error,
  onRefresh,
  variant,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Brain className="w-8 h-8 text-primary animate-pulse mb-3" />
        <p className="text-muted-foreground text-sm">Анализируем ваш прогресс...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-6">
        <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">
          Получите персональные рекомендации на основе вашего прогресса
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <Zap className="w-4 h-4 mr-2" />
          Получить рекомендации
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Level Badge and Motivation */}
      <div className="flex items-start gap-3">
        <Badge className={cn('px-3 py-1', levelColors[analysis.level])}>
          {levelLabels[analysis.level]}
        </Badge>
        <p className="text-sm text-muted-foreground flex-1">{analysis.motivation}</p>
      </div>

      {/* Strengths and Areas to Improve */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Сильные стороны</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {analysis.strengths.slice(0, 2).map((strength, idx) => (
              <li key={idx}>• {strength}</li>
            ))}
          </ul>
        </div>

        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">Над чем работать</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {analysis.areasToImprove.slice(0, 2).map((area, idx) => (
              <li key={idx}>• {area}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Weekly Goal */}
      {analysis.weeklyGoal && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Цель на неделю</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{analysis.weeklyGoal.wordsToLearn}</div>
              <div className="text-xs text-muted-foreground">новых слов</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">{analysis.weeklyGoal.reviewSessions}</div>
              <div className="text-xs text-muted-foreground">повторений</div>
            </div>
            <div className="col-span-1">
              <div className="text-xs text-muted-foreground mb-1">Фокус:</div>
              <div className="text-xs font-medium text-primary">{analysis.weeklyGoal.focusArea}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {variant === 'full' && analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Рекомендации
          </h4>
          {analysis.recommendations.slice(0, 3).map((rec, idx) => {
            const Icon = typeIcons[rec.type] || Lightbulb;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  'p-3 rounded-lg border',
                  priorityColors[rec.priority]
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-1.5 rounded-lg', typeColors[rec.type])}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-medium mb-1">{rec.title}</h5>
                    <p className="text-xs text-muted-foreground">{rec.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Next Milestone */}
      {analysis.nextMilestone && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <Award className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-sm font-medium">{analysis.nextMilestone.description}</div>
            <div className="text-xs text-muted-foreground">
              Осталось выучить: {analysis.nextMilestone.wordsNeeded} слов
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock data for development
function getMockAnalysis(): PersonalizedAnalysis {
  return {
    level: 'intermediate',
    strengths: [
      'Хорошая регулярность занятий',
      'Высокая точность в базовой лексике',
    ],
    areasToImprove: [
      'Расширить словарный запас B2 уровня',
      'Больше практики с фразовыми глаголами',
    ],
    recommendations: [
      {
        type: 'focus',
        title: 'Сфокусируйтесь на B2 словах',
        description: 'Вы отлично освоили базовую лексику. Пора переходить к более продвинутым словам.',
        priority: 'high',
      },
      {
        type: 'habit',
        title: 'Увеличьте серию',
        description: 'Попробуйте заниматься каждый день хотя бы 10 минут для поддержания прогресса.',
        priority: 'medium',
      },
      {
        type: 'tip',
        title: 'Используйте контекст',
        description: 'При изучении новых слов обращайте внимание на примеры из фильмов и книг.',
        priority: 'low',
      },
    ],
    weeklyGoal: {
      wordsToLearn: 30,
      reviewSessions: 5,
      focusArea: 'Фразовые глаголы',
    },
    motivation: 'Отличный прогресс! Вы на пути к свободному владению языком.',
    nextMilestone: {
      description: 'Достижение "500 слов"',
      wordsNeeded: 47,
    },
  };
}
