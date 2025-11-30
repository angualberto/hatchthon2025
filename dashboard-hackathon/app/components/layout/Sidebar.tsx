'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/utils/helpers';
import {
  LayoutDashboard,
  Ship,
  Activity,
  AlertTriangle,
  BarChart3,
  Settings,
  HelpCircle,
  Waves,
  Leaf,
  Fuel,
  Globe,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  // Páginas desabilitadas (código preservado para implementação futura):
  // { name: 'Frota', href: '/fleet', icon: Ship },
  // { name: 'Consumo', href: '/consumption', icon: Fuel },
  { name: 'Biofouling', href: '/biofouling', icon: Waves },
  { name: 'Monitoramento', href: '/monitoring', icon: Activity },
  { name: 'Dados Oceanográficos', href: '/oceanography', icon: Globe },
  { name: 'Alertas', href: '/alerts', icon: AlertTriangle, badge: 2 },
  // { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  // { name: 'Sustentabilidade', href: '/sustainability', icon: Leaf },
];

const secondaryNavigation = [
  { name: 'Configurações', href: '/settings', icon: Settings },
  { name: 'Ajuda', href: '/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[var(--border)] bg-[var(--background-secondary)]/95 backdrop-blur-xl transition-colors">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#008140] to-[#006633] shadow-lg shadow-[#008140]/25">
          <Ship className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight">BioFoul</h1>
          <p className="text-xs text-[var(--color-secondary)]">Transpetro Monitor</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col h-[calc(100vh-4rem)] justify-between p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-lg shadow-[var(--shadow-primary)] border border-[var(--border)]'
                    : 'text-[var(--foreground-muted)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)]'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-[var(--color-primary)]')} />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-secondary)]/20 text-xs font-semibold text-[var(--color-secondary)]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1 border-t border-[var(--border)] pt-4">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[var(--background-hover)] text-[var(--foreground)]'
                    : 'text-[var(--foreground-muted)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)]'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Transpetro Badge */}
          <div className="mt-4 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 p-4 border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                TP
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Transpetro</p>
                <p className="text-xs text-[var(--color-secondary)]">Petrobras Transporte</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
