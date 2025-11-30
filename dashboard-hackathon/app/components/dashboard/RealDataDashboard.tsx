'use client';

import { useDashboardData, VesselAnalysis } from '@/app/hooks';
import {
  Ship,
  Fuel,
  AlertTriangle,
  Leaf,
  TrendingUp,
  Waves,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { KPICard } from '../ui';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { RiskBadge } from '../ui/Badge';
import { cn, formatNumber } from '@/app/utils/helpers';

interface RealDataDashboardProps {
  onVesselSelect?: (vessel: VesselAnalysis) => void;
}

export function RealDataDashboard({ onVesselSelect }: RealDataDashboardProps) {
  const { analysis, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 rounded-2xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-500/30">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Dados em Modo Demo</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            A API de dados reais não está disponível. Os dados exibidos são simulados.
            <br />
            <span className="text-xs text-slate-500 mt-2 block">Erro: {error}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  const fleet = analysis?.data?.fleetSummary;
  const vessels = analysis?.data?.vessels || [];

  if (!fleet) {
    return null;
  }

  // Get vessels by risk level for display
  const criticalVessels = vessels.filter(v => v.riskLevel === 'critical');
  const highRiskVessels = vessels.filter(v => v.riskLevel === 'high');

  return (
    <div className="space-y-6">
      {/* Real Data Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-400">Dados Reais da Frota</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 text-xs hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Atualizar
        </button>
      </div>

      {/* KPIs from Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Embarcações Monitoradas"
          value={fleet.totalVessels}
          icon={Ship}
          iconColor="text-cyan-400"
          description="Total na frota analisada"
        />
        <KPICard
          title="Em Risco (Alto/Crítico)"
          value={fleet.criticalVessels + fleet.highRiskVessels}
          icon={AlertTriangle}
          iconColor="text-red-400"
          description={`${fleet.criticalVessels} críticos, ${fleet.highRiskVessels} altos`}
        />
        <KPICard
          title="Degradação Média"
          value={fleet.avgSpeedDegradation.toFixed(1)}
          unit="%"
          icon={TrendingUp}
          iconColor="text-amber-400"
          description="Perda de velocidade da frota"
        />
        <KPICard
          title="Impacto CO₂"
          value={formatNumber(fleet.totalCO2ImpactPerDay, 1)}
          unit="ton/dia"
          icon={Leaf}
          iconColor="text-emerald-400"
          description="Emissões extras por biofouling"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Score Médio Biofouling"
          value={fleet.avgBiofoulingScore}
          unit="/100"
          icon={Waves}
          iconColor="text-purple-400"
          description="Média da frota"
        />
        <KPICard
          title="Penalidade Combustível"
          value={fleet.avgFuelPenalty.toFixed(1)}
          unit="%"
          icon={Fuel}
          iconColor="text-orange-400"
          description="Aumento médio no consumo"
        />
        <KPICard
          title="Eficiência Operacional"
          value={(100 - fleet.avgSpeedDegradation).toFixed(1)}
          unit="%"
          icon={Activity}
          iconColor="text-cyan-400"
          description="Comparado ao baseline"
        />
      </div>

      {/* Critical Vessels Alert */}
      {criticalVessels.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <CardTitle className="text-red-400">Embarcações em Estado Crítico</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalVessels.map((vessel) => (
                <button
                  key={vessel.vesselName}
                  onClick={() => onVesselSelect?.(vessel)}
                  className="p-4 rounded-xl bg-slate-800/50 border border-red-500/30 hover:border-red-500/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{vessel.vesselName}</h4>
                    <RiskBadge level={vessel.riskLevel} />
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Score</span>
                      <span className="text-red-400 font-semibold">{vessel.biofoulingScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Degradação</span>
                      <span className="text-white">{vessel.speedAnalysis.speedDegradation.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CO₂ extra</span>
                      <span className="text-amber-400">{vessel.fuelAnalysis.co2ImpactPerDay.toFixed(1)} ton/dia</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fleet Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral da Frota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400">
                  <th className="pb-3 font-medium">Embarcação</th>
                  <th className="pb-3 font-medium">Classe</th>
                  <th className="pb-3 font-medium">Risco</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Degradação</th>
                  <th className="pb-3 font-medium">Penalidade</th>
                  <th className="pb-3 font-medium">Tendência</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {vessels.slice(0, 10).map((vessel) => (
                  <tr 
                    key={vessel.vesselName} 
                    className="border-t border-slate-700/50 hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => onVesselSelect?.(vessel)}
                  >
                    <td className="py-3 font-medium text-white">{vessel.vesselName}</td>
                    <td className="py-3 text-slate-300">{vessel.vesselClass}</td>
                    <td className="py-3"><RiskBadge level={vessel.riskLevel} /></td>
                    <td className="py-3">
                      <span className={cn(
                        'font-semibold',
                        vessel.biofoulingScore >= 70 && 'text-red-400',
                        vessel.biofoulingScore >= 50 && vessel.biofoulingScore < 70 && 'text-orange-400',
                        vessel.biofoulingScore >= 30 && vessel.biofoulingScore < 50 && 'text-amber-400',
                        vessel.biofoulingScore < 30 && 'text-emerald-400',
                      )}>
                        {vessel.biofoulingScore}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{vessel.speedAnalysis.speedDegradation.toFixed(1)}%</td>
                    <td className="py-3 text-amber-400">{vessel.fuelAnalysis.fuelPenalty.toFixed(1)}%</td>
                    <td className="py-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        vessel.prediction.trend === 'degrading' && 'bg-red-500/20 text-red-400',
                        vessel.prediction.trend === 'stable' && 'bg-amber-500/20 text-amber-400',
                        vessel.prediction.trend === 'improving' && 'bg-emerald-500/20 text-emerald-400',
                      )}>
                        {vessel.prediction.trend === 'degrading' ? '↗ Piorando' :
                         vessel.prediction.trend === 'improving' ? '↘ Melhorando' : '→ Estável'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vessels.length > 10 && (
            <p className="text-center text-sm text-slate-400 mt-4">
              Mostrando 10 de {vessels.length} embarcações
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

