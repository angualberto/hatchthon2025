'use client';

import { Bell, Search, RefreshCw, Sun, Moon } from 'lucide-react';
import { alerts } from '@/app/data/mockData';
import { useTheme } from '@/app/contexts/ThemeContext';

export function Header() {
  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background-secondary)]/80 backdrop-blur-xl px-6 transition-colors">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar embarcação, rota..."
            className="h-10 w-80 rounded-xl border border-[var(--border)] bg-[var(--background-card)]/50 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background-card)]/50 text-[var(--foreground-muted)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)] hover:border-[var(--color-primary)]/50 transition-all"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Refresh */}
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background-card)]/50 text-[var(--foreground-muted)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)] hover:border-[var(--color-primary)]/50 transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background-card)]/50 text-[var(--foreground-muted)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)] hover:border-[var(--color-primary)]/50 transition-all">
          <Bell className="h-4 w-4" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] text-xs font-semibold text-[var(--background)]">
              {unreadAlerts}
            </span>
          )}
        </button>

        {/* Status indicator */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--color-primary)]/10 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]"></span>
          </span>
          <span className="text-xs font-medium text-[var(--color-primary)]">Sistema Online</span>
        </div>
      </div>
    </header>
  );
}
