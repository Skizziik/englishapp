import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  if (minutes > 0) {
    return `${minutes}м ${secs}с`;
  }
  return `${secs}с`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateFull(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return formatDate(d);
}

export function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    A1: 'level-a1',
    A2: 'level-a2',
    B1: 'level-b1',
    B2: 'level-b2',
    C1: 'level-c1',
    C2: 'level-c2',
  };
  return colors[level] || 'level-a1';
}

export function getLevelBgColor(level: string): string {
  const colors: Record<string, string> = {
    A1: 'bg-green-500',
    A2: 'bg-lime-500',
    B1: 'bg-yellow-500',
    B2: 'bg-orange-500',
    C1: 'bg-red-500',
    C2: 'bg-purple-500',
  };
  return colors[level] || 'bg-green-500';
}

export function calculateXPForLevel(level: number): number {
  return level * 100;
}

export function getLevelFromXP(totalXP: number): { level: number; currentXP: number; xpForNext: number } {
  let level = 1;
  let accumulatedXP = 0;
  let xpRequired = 100;

  while (accumulatedXP + xpRequired <= totalXP) {
    accumulatedXP += xpRequired;
    level++;
    xpRequired = level * 100;
  }

  return {
    level,
    currentXP: totalXP - accumulatedXP,
    xpForNext: xpRequired,
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function playSound(type: 'correct' | 'wrong' | 'complete' | 'levelup'): void {
  // Sound implementation will be added later
  // For now, this is a placeholder
}
