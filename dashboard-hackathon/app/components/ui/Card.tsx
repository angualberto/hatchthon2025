'use client';

import { cn } from '@/app/utils/helpers';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  variant?: 'default' | 'gradient' | 'glass';
}

export function Card({ 
  children, 
  className, 
  hover = false, 
  glow = false,
  variant = 'default' 
}: CardProps) {
  const baseStyles = 'rounded-2xl border transition-all duration-300';
  
  const variants = {
    default: 'bg-[var(--background-card)]/80 border-[var(--border)] backdrop-blur-sm',
    gradient: 'bg-gradient-to-br from-[var(--background-card)] to-[var(--background-secondary)] border-[var(--border)]',
    glass: 'bg-[var(--background-hover)] border-[var(--border)] backdrop-blur-xl',
  };

  const hoverStyles = hover 
    ? 'hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-[var(--shadow-primary)] hover:-translate-y-0.5' 
    : '';

  const glowStyles = glow 
    ? 'shadow-lg shadow-[var(--shadow-primary)]' 
    : '';

  return (
    <div className={cn(baseStyles, variants[variant], hoverStyles, glowStyles, className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-[var(--border)]', className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-[var(--foreground)]', className)}>
      {children}
    </h3>
  );
}
