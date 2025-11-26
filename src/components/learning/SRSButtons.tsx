import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SRSButtonsProps {
  onAnswer: (quality: number) => void;
  disabled?: boolean;
}

const buttons = [
  {
    quality: 0,
    label: 'Забыл',
    shortLabel: '1',
    color: 'bg-red-500 hover:bg-red-600',
    textColor: 'text-white',
    description: '< 1 день',
  },
  {
    quality: 2,
    label: 'Сложно',
    shortLabel: '2',
    color: 'bg-orange-500 hover:bg-orange-600',
    textColor: 'text-white',
    description: '1 день',
  },
  {
    quality: 4,
    label: 'Нормально',
    shortLabel: '3',
    color: 'bg-green-500 hover:bg-green-600',
    textColor: 'text-white',
    description: '3 дня',
  },
  {
    quality: 5,
    label: 'Легко',
    shortLabel: '4',
    color: 'bg-blue-500 hover:bg-blue-600',
    textColor: 'text-white',
    description: '7+ дней',
  },
];

export const SRSButtons: React.FC<SRSButtonsProps> = ({ onAnswer, disabled }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      const keyMap: Record<string, number> = {
        '1': 0,
        '2': 2,
        '3': 4,
        '4': 5,
      };

      if (keyMap[e.key] !== undefined) {
        onAnswer(keyMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAnswer, disabled]);

  return (
    <div className="w-full">
      <p className="text-center text-sm text-muted-foreground mb-3">
        Как хорошо вы знаете это слово?
      </p>
      <div className="grid grid-cols-4 gap-3">
        {buttons.map((btn) => (
          <motion.button
            key={btn.quality}
            onClick={() => onAnswer(btn.quality)}
            disabled={disabled}
            className={cn(
              'p-4 rounded-xl transition-all duration-200',
              btn.color,
              btn.textColor,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            whileHover={!disabled ? { scale: 1.03 } : {}}
            whileTap={!disabled ? { scale: 0.97 } : {}}
          >
            <div className="text-center">
              <span className="block text-xs opacity-70 mb-1">
                {btn.shortLabel}
              </span>
              <span className="block font-semibold">{btn.label}</span>
              <span className="block text-xs mt-1 opacity-70">
                {btn.description}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Используйте клавиши 1-4 для быстрого ответа
      </p>
    </div>
  );
};
