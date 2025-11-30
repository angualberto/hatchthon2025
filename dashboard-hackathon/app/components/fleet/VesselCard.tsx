'use client';

import { Vessel } from '@/app/types';
import { Card } from '../ui/Card';
import { RiskBadge, StatusBadge } from '../ui/Badge';
import { cn, formatPercentage, daysUntil } from '@/app/utils/helpers';
import { MapPin, Gauge, Anchor, Fuel, Calendar } from 'lucide-react';

interface VesselCardProps {
  vessel: Vessel;
  compact?: boolean;
  onClick?: () => void;
}

export function VesselCard({ vessel, compact = false, onClick }: VesselCardProps) {
  const daysToNextDock = daysUntil(vessel.nextDrydock);

  if (compact) {
    return (
      <Card 
        hover 
        className={cn(
          'p-4 cursor-pointer transition-all',
          onClick && 'hover:border-[#008140]/50'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-[#008140]/30 to-[#006633]/30',
              'border border-[#008140]/30'
            )}>
              <Anchor className="w-5 h-5 text-[#008140]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F7F7F7] text-sm">{vessel.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={vessel.status} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <RiskBadge level={vessel.biofoulingRisk.level} />
            <p className="text-xs text-slate-400 mt-1">
              Score: {vessel.biofoulingRisk.score}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card hover className="overflow-hidden cursor-pointer" onClick={onClick}>
      {/* Header with gradient based on risk */}
      <div className={cn(
        'px-6 py-4 border-b border-[#008140]/20',
        'bg-gradient-to-r',
        vessel.biofoulingRisk.level === 'critical' && 'from-red-500/10 to-transparent',
        vessel.biofoulingRisk.level === 'high' && 'from-orange-500/10 to-transparent',
        vessel.biofoulingRisk.level === 'moderate' && 'from-[#F5C22E]/10 to-transparent',
        vessel.biofoulingRisk.level === 'low' && 'from-[#008140]/10 to-transparent',
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-[#008140]/30 to-[#006633]/30',
              'border border-[#008140]/30 shadow-lg'
            )}>
              <Anchor className="w-6 h-6 text-[#008140]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F7F7F7]">{vessel.name}</h3>
              <p className="text-sm text-slate-400">{vessel.type.charAt(0).toUpperCase() + vessel.type.slice(1)} • {vessel.length}m</p>
            </div>
          </div>
          <StatusBadge status={vessel.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Biofouling Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Biofouling Score</span>
            <RiskBadge level={vessel.biofoulingRisk.level} showLabel={false} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-[#0a1628] rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  vessel.biofoulingRisk.level === 'critical' && 'bg-red-500',
                  vessel.biofoulingRisk.level === 'high' && 'bg-orange-500',
                  vessel.biofoulingRisk.level === 'moderate' && 'bg-[#F5C22E]',
                  vessel.biofoulingRisk.level === 'low' && 'bg-[#008140]',
                )}
                style={{ width: `${vessel.biofoulingRisk.score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-[#F7F7F7] w-8">{vessel.biofoulingRisk.score}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0a1628]/50 border border-[#008140]/10">
            <MapPin className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Posição</p>
              <p className="text-sm text-[#F7F7F7]">
                {vessel.currentPosition.latitude.toFixed(2)}°, {vessel.currentPosition.longitude.toFixed(2)}°
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0a1628]/50 border border-[#008140]/10">
            <Gauge className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Velocidade</p>
              <p className="text-sm text-[#F7F7F7]">{vessel.currentSpeed} nós</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0a1628]/50 border border-[#008140]/10">
            <Fuel className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Degradação</p>
              <p className={cn(
                'text-sm font-semibold',
                vessel.fuelEfficiency.degradation > 20 ? 'text-red-400' : 
                vessel.fuelEfficiency.degradation > 10 ? 'text-[#F5C22E]' : 'text-[#008140]'
              )}>
                +{formatPercentage(vessel.fuelEfficiency.degradation)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0a1628]/50 border border-[#008140]/10">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Próx. Docagem</p>
              <p className={cn(
                'text-sm font-semibold',
                daysToNextDock < 90 ? 'text-[#F5C22E]' : 'text-slate-300'
              )}>
                {daysToNextDock} dias
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-[#008140]/20 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            CO₂ extra: <span className="text-red-400 font-medium">{vessel.fuelEfficiency.co2Impact.toFixed(1)} ton/dia</span>
          </span>
          <span className="text-slate-500">
            Tendência: <span className={cn(
              'font-medium',
              vessel.biofoulingRisk.trend === 'degrading' && 'text-red-400',
              vessel.biofoulingRisk.trend === 'stable' && 'text-[#F5C22E]',
              vessel.biofoulingRisk.trend === 'improving' && 'text-[#008140]',
            )}>
              {vessel.biofoulingRisk.trend === 'degrading' ? '↗ Piorando' : 
               vessel.biofoulingRisk.trend === 'improving' ? '↘ Melhorando' : '→ Estável'}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
