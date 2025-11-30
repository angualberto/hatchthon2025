// ============================================
// UTILITY FUNCTIONS
// ============================================

import { clsx, type ClassValue } from 'clsx';

// Combine class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format number with thousand separators
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Get biofouling risk color
export function getBiofoulingColor(level: string): string {
  switch (level) {
    case 'low':
      return 'text-emerald-400';
    case 'moderate':
      return 'text-amber-400';
    case 'high':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-slate-400';
  }
}

// Get biofouling background color
export function getBiofoulingBgColor(level: string): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-500/20 border-emerald-500/30';
    case 'moderate':
      return 'bg-amber-500/20 border-amber-500/30';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/30';
    case 'critical':
      return 'bg-red-500/20 border-red-500/30';
    default:
      return 'bg-slate-500/20 border-slate-500/30';
  }
}

// Get vessel status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'sailing':
      return 'text-emerald-400';
    case 'anchored':
      return 'text-blue-400';
    case 'moored':
      return 'text-amber-400';
    case 'maintenance':
      return 'text-purple-400';
    default:
      return 'text-slate-400';
  }
}

// Calculate days until date
export function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format datetime
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Calculate CO2 emissions from fuel (approx 3.17 tons CO2 per ton of fuel)
export function calculateCO2(fuelTons: number): number {
  return fuelTons * 3.17;
}

// Estimate fuel penalty from biofouling score
export function estimateFuelPenalty(biofoulingScore: number): number {
  // Simplified model: 1% fuel penalty per 10 points of biofouling score
  return (biofoulingScore / 10) * 1;
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Linear interpolation
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Map value from one range to another
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

