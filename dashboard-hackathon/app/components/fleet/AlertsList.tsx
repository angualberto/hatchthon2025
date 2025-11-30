'use client';

import { Alert } from '@/app/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn, formatDateTime } from '@/app/utils/helpers';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from 'lucide-react';

interface AlertsListProps {
  alerts: Alert[];
  maxItems?: number;
  showHeader?: boolean;
}

export function AlertsList({ alerts, maxItems = 5, showHeader = true }: AlertsListProps) {
  const displayedAlerts = alerts.slice(0, maxItems);

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
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          borderColor: 'border-l-red-500',
        };
      case 'warning':
        return {
          iconBg: 'bg-[#F5C22E]/20',
          iconColor: 'text-[#F5C22E]',
          borderColor: 'border-l-[#F5C22E]',
        };
      case 'info':
        return {
          iconBg: 'bg-[#008140]/20',
          iconColor: 'text-[#008140]',
          borderColor: 'border-l-[#008140]',
        };
      case 'success':
        return {
          iconBg: 'bg-[#008140]/20',
          iconColor: 'text-[#008140]',
          borderColor: 'border-l-[#008140]',
        };
    }
  };

  return (
    <Card className="h-full">
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alertas Recentes</CardTitle>
            <button className="text-sm text-[#008140] hover:text-[#00a550] flex items-center gap-1">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && 'pt-6')}>
        <div className="space-y-3">
          {displayedAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            const styles = getAlertStyles(alert.type);

            return (
              <div
                key={alert.id}
                className={cn(
                  'relative flex gap-4 p-4 rounded-xl',
                  'bg-[#0a1628]/50 border border-[#008140]/20',
                  'border-l-4',
                  styles.borderColor,
                  'hover:bg-[#008140]/5 transition-colors cursor-pointer',
                  !alert.read && 'ring-1 ring-[#008140]/30'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  styles.iconBg
                )}>
                  <Icon className={cn('w-5 h-5', styles.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={cn(
                      'text-sm font-semibold text-[#F7F7F7] truncate',
                      !alert.read && 'pr-2'
                    )}>
                      {alert.title}
                    </h4>
                    {!alert.read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#008140]" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {alert.vesselName && (
                      <span className="text-xs text-slate-500 bg-[#008140]/10 border border-[#008140]/30 px-2 py-0.5 rounded">
                        {alert.vesselName}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatDateTime(alert.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#008140]/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-[#008140]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F7F7F7] mb-1">Tudo em ordem</h3>
            <p className="text-sm text-slate-400">Não há alertas pendentes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
