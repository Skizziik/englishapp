import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-500/20 text-green-400 border-green-500/30',
        warning:
          'border-transparent bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        // Level variants
        a1: 'border-green-500/30 bg-green-500/20 text-green-400',
        a2: 'border-lime-500/30 bg-lime-500/20 text-lime-400',
        b1: 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400',
        b2: 'border-orange-500/30 bg-orange-500/20 text-orange-400',
        c1: 'border-red-500/30 bg-red-500/20 text-red-400',
        c2: 'border-purple-500/30 bg-purple-500/20 text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Level Badge - automatically styles based on level
interface LevelBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: string;
}

function LevelBadge({ level, className, ...props }: LevelBadgeProps) {
  const variant = level.toLowerCase() as 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
  return (
    <Badge variant={variant} className={cn('font-bold', className)} {...props}>
      {level}
    </Badge>
  );
}

// XP Badge with icon
interface XPBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number;
}

function XPBadge({ amount, className, ...props }: XPBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 text-sm font-bold text-yellow-400 border border-yellow-500/30',
        className
      )}
      {...props}
    >
      <span className="text-base">⚡</span>
      <span>{amount} XP</span>
    </div>
  );
}

// Streak Badge with fire icon
interface StreakBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  days: number;
}

function StreakBadge({ days, className, ...props }: StreakBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1 text-sm font-bold text-orange-400 border border-orange-500/30',
        className
      )}
      {...props}
    >
      <span className="text-base">🔥</span>
      <span>{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span>
    </div>
  );
}

export { Badge, badgeVariants, LevelBadge, XPBadge, StreakBadge };
