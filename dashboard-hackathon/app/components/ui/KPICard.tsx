'use client';

import { cn } from '@/app/utils/helpers';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KPICard({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-[#008140]',
  description,
  trend,
  className,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return 'text-slate-400';
    
    if (change > 0) return 'text-[#008140]';
    if (change < 0) return 'text-[#F5C22E]';
    return 'text-slate-400';
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-[var(--border)]',
      'bg-gradient-to-br from-[var(--background-card)]/90 to-[var(--background-secondary)]/90',
      'backdrop-blur-sm p-6 transition-all duration-300',
      'hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-[var(--shadow-primary)]',
      'group',
      className
    )}>
      {/* Background gradient accent */}
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl',
        'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]',
        'group-hover:opacity-20 transition-opacity duration-500'
      )} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'p-3 rounded-xl',
            'bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10',
            'border border-[var(--border)]',
            'shadow-lg shadow-[var(--shadow)]'
          )}>
            <Icon className={cn('w-6 h-6', iconColor)} />
          </div>
          
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
              'bg-[var(--background-hover)] border border-[var(--border)]',
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-lg text-[var(--foreground-muted)] font-medium">
                {unit}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-0.5">
            {title}
          </h3>
          {(description || changeLabel) && (
            <p className="text-xs text-[var(--foreground-muted)]">
              {changeLabel || description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
