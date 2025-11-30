'use client';

import { cn } from '@/app/utils/helpers';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'petrobras';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className,
  pulse = false 
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    success: 'bg-[#008140]/20 text-[#00a550] border-[#008140]/30',
    warning: 'bg-[#F5C22E]/20 text-[#F5C22E] border-[#F5C22E]/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-[#008140]/20 text-[#00a550] border-[#008140]/30',
    outline: 'bg-transparent text-slate-300 border-[#008140]/50',
    petrobras: 'bg-gradient-to-r from-[#008140]/20 to-[#F5C22E]/20 text-[#F7F7F7] border-[#008140]/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full border',
      variants[variant],
      sizes[size],
      className
    )}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            variant === 'success' && 'bg-[#008140]',
            variant === 'warning' && 'bg-[#F5C22E]',
            variant === 'danger' && 'bg-red-400',
            variant === 'info' && 'bg-[#008140]',
            variant === 'default' && 'bg-slate-400',
            variant === 'petrobras' && 'bg-[#008140]',
          )} />
          <span className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            variant === 'success' && 'bg-[#008140]',
            variant === 'warning' && 'bg-[#F5C22E]',
            variant === 'danger' && 'bg-red-400',
            variant === 'info' && 'bg-[#008140]',
            variant === 'default' && 'bg-slate-400',
            variant === 'petrobras' && 'bg-[#008140]',
          )} />
        </span>
      )}
      {children}
    </span>
  );
}

// Specialized badge for biofouling risk levels
interface RiskBadgeProps {
  level: 'low' | 'moderate' | 'high' | 'critical';
  showLabel?: boolean;
  className?: string;
}

export function RiskBadge({ level, showLabel = true, className }: RiskBadgeProps) {
  const config = {
    low: { variant: 'success' as const, label: 'Baixo', pulse: false },
    moderate: { variant: 'warning' as const, label: 'Moderado', pulse: false },
    high: { variant: 'danger' as const, label: 'Alto', pulse: false },
    critical: { variant: 'danger' as const, label: 'Crítico', pulse: true },
  };

  const { variant, label, pulse } = config[level];

  return (
    <Badge variant={variant} pulse={pulse} className={className}>
      {showLabel ? label : null}
    </Badge>
  );
}

// Status badge for vessel status
interface StatusBadgeProps {
  status: 'sailing' | 'anchored' | 'moored' | 'maintenance';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    sailing: { variant: 'success' as const, label: 'Navegando' },
    anchored: { variant: 'info' as const, label: 'Ancorado' },
    moored: { variant: 'warning' as const, label: 'Atracado' },
    maintenance: { variant: 'default' as const, label: 'Manutenção' },
  };

  const { variant, label } = config[status];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
