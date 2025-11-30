'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Filter,
  Bell,
  BellOff,
  Check,
  Trash2,
  Clock,
  Ship,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, KPICard } from '../components/ui';
import { Badge } from '../components/ui/Badge';
import { alerts as initialAlerts } from '../data/mockData';
import { Alert } from '../types';
import { cn, formatDateTime } from '../utils/helpers';

type FilterType = 'all' | 'critical' | 'warning' | 'info' | 'success';
type FilterRead = 'all' | 'unread' | 'read';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterRead, setFilterRead] = useState<FilterRead>('all');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesType = filterType === 'all' || alert.type === filterType;
    const matchesRead = filterRead === 'all' 
      || (filterRead === 'unread' && !alert.read)
      || (filterRead === 'read' && alert.read);
    return matchesType && matchesRead;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;
  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;

  const markAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return AlertCircle;
      case 'info':
        return Info;
      case 'success':
        return CheckCircle;
    }
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          icon: 'text-red-400',
          badge: 'danger' as const,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          icon: 'text-amber-400',
          badge: 'warning' as const,
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          icon: 'text-blue-400',
          badge: 'info' as const,
        };
      case 'success':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          icon: 'text-emerald-400',
          badge: 'success' as const,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Central de Alertas</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Gerencie notificações e alertas do sistema de monitoramento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--background-card)] border border-[var(--border)] text-sm text-[var(--foreground-secondary)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)] transition-all"
          >
            <Check className="w-4 h-4" />
            Marcar todos como lidos
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Não Lidos"
          value={unreadCount}
          icon={Bell}
          iconColor="text-cyan-400"
        />
        <KPICard
          title="Críticos"
          value={criticalCount}
          icon={AlertTriangle}
          iconColor="text-red-400"
        />
        <KPICard
          title="Avisos"
          value={warningCount}
          icon={AlertCircle}
          iconColor="text-amber-400"
        />
        <KPICard
          title="Total"
          value={alerts.length}
          icon={BellOff}
          iconColor="text-slate-400"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--foreground-muted)]" />
              <span className="text-sm text-[var(--foreground-muted)]">Filtrar por:</span>
            </div>
            
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              {(['all', 'critical', 'warning', 'info', 'success'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filterType === type
                      ? type === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : type === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : type === 'info' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-transparent hover:border-slate-700'
                  )}
                >
                  {type === 'all' ? 'Todos' 
                    : type === 'critical' ? 'Críticos'
                    : type === 'warning' ? 'Avisos'
                    : type === 'info' ? 'Info'
                    : 'Sucesso'}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-[var(--border)]" />

            {/* Read Filter */}
            <div className="flex items-center gap-2">
              {(['all', 'unread', 'read'] as FilterRead[]).map((read) => (
                <button
                  key={read}
                  onClick={() => setFilterRead(read)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filterRead === read
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--background-card)] text-[var(--foreground-muted)] border border-transparent hover:border-[var(--border)]'
                  )}
                >
                  {read === 'all' ? 'Todos' : read === 'unread' ? 'Não lidos' : 'Lidos'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const Icon = getAlertIcon(alert.type);
          const styles = getAlertStyles(alert.type);

          return (
            <Card
              key={alert.id}
              className={cn(
                'transition-all',
                !alert.read && 'ring-1 ring-cyan-500/30'
              )}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
                    styles.bg
                  )}>
                    <Icon className={cn('w-6 h-6', styles.icon)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[var(--foreground)]">{alert.title}</h3>
                          {!alert.read && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                          )}
                        </div>
                        <p className="text-sm text-[var(--foreground-muted)]">{alert.message}</p>
                      </div>
                      <Badge variant={styles.badge}>
                        {alert.type === 'critical' ? 'Crítico'
                          : alert.type === 'warning' ? 'Aviso'
                          : alert.type === 'info' ? 'Info'
                          : 'Sucesso'}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-3">
                      {alert.vesselName && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                          <Ship className="w-3.5 h-3.5" />
                          {alert.vesselName}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!alert.read && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="p-2 rounded-lg bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-hover)] transition-all"
                        title="Marcar como lido"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-2 rounded-lg bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredAlerts.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background-card)] flex items-center justify-center mb-4">
                  <BellOff className="w-8 h-8 text-[var(--foreground-muted)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                  Nenhum alerta encontrado
                </h3>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Não há alertas que correspondam aos filtros selecionados.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

