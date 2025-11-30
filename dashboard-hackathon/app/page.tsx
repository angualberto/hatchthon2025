'use client';

import {
  Ship,
  Fuel,
  AlertTriangle,
  Leaf,
  TrendingUp,
  DollarSign,
  Waves,
  Activity,
} from 'lucide-react';
import { KPICard } from './components/ui';
import {
  FuelConsumptionChart,
  BiofoulingTrendChart,
  CO2EmissionsChart,
  RiskDistributionChart,
} from './components/charts';
import { VesselCard, AlertsList } from './components/fleet';
import { vessels, alerts, fleetStats } from './data/mockData';
import { formatNumber, formatCurrency } from './utils/helpers';

export default function DashboardPage() {
  // Get vessels with highest risk
  const criticalVessels = vessels
    .filter((v) => v.biofoulingRisk.level === 'critical' || v.biofoulingRisk.level === 'high')
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Monitoramento de biofouling e eficiência operacional da frota
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--foreground-muted)]">Última atualização:</span>
          <span className="text-[var(--foreground)] font-medium">
            {new Date().toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Embarcações Ativas"
          value={fleetStats.activeVessels}
          unit={`/${fleetStats.totalVessels}`}
          icon={Ship}
          iconColor="text-[var(--color-primary)]"
          change={0}
          trend="neutral"
          changeLabel="Total da frota monitorada"
        />
        <KPICard
          title="Embarcações em Risco"
          value={fleetStats.vesselsAtRisk}
          icon={AlertTriangle}
          iconColor="text-[var(--color-secondary)]"
          change={-12}
          trend="down"
          changeLabel="vs. mês anterior"
        />
        <KPICard
          title="Desperdício de Combustível"
          value={formatNumber(fleetStats.totalFuelWaste, 1)}
          unit="ton/dia"
          icon={Fuel}
          iconColor="text-red-400"
          change={8}
          trend="up"
          changeLabel="Acima do baseline"
        />
        <KPICard
          title="Impacto CO₂"
          value={formatNumber(fleetStats.totalCO2Impact, 1)}
          unit="ton/dia"
          icon={Leaf}
          iconColor="text-[var(--color-primary)]"
          change={-5}
          trend="down"
          changeLabel="Emissões extras por biofouling"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Score Médio Biofouling"
          value={fleetStats.averageBiofoulingScore}
          unit="/100"
          icon={Waves}
          iconColor="text-[var(--color-secondary)]"
          change={3}
          trend="up"
          changeLabel="Tendência de aumento"
        />
        <KPICard
          title="Economia Potencial"
          value={formatCurrency(fleetStats.estimatedSavings)}
          icon={DollarSign}
          iconColor="text-[var(--color-primary)]"
          changeLabel="Por mês com manutenção otimizada"
        />
        <KPICard
          title="Eficiência Operacional"
          value="87.3"
          unit="%"
          icon={Activity}
          iconColor="text-[var(--color-primary)]"
          change={-2.1}
          trend="down"
          changeLabel="vs. casco limpo"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuelConsumptionChart />
        <BiofoulingTrendChart />
      </div>

      {/* Charts Row 2 + Critical Vessels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CO2EmissionsChart />
        <RiskDistributionChart />
        
        {/* Critical Vessels */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Embarcações Críticas</h2>
            {/* Link para frota desabilitado - página removida da navegação */}
            {/* <button className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]/80">
              Ver frota
            </button> */}
          </div>
          <div className="space-y-3">
            {criticalVessels.map((vessel) => (
              <VesselCard key={vessel.id} vessel={vessel} compact />
            ))}
            {criticalVessels.length === 0 && (
              <div className="text-center py-8 text-[var(--foreground-muted)]">
                <Leaf className="w-12 h-12 mx-auto mb-2 text-[var(--color-primary)]" />
                <p>Nenhuma embarcação em estado crítico</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsList alerts={alerts} maxItems={4} />
        
        {/* Quick Actions */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Páginas desabilitadas (código preservado para implementação futura):
                - Ver Frota (/fleet)
                - Relatórios (/reports)
            */}
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--color-secondary)]/50 hover:bg-[var(--color-secondary)]/10 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center group-hover:bg-[var(--color-secondary)]/30 transition-colors">
                <AlertTriangle className="w-6 h-6 text-[var(--color-secondary)]" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground-secondary)]">Alertas</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--color-secondary)]/50 hover:bg-[var(--color-secondary)]/10 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center group-hover:bg-[var(--color-secondary)]/30 transition-colors">
                <Waves className="w-6 h-6 text-[var(--color-secondary)]" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground-secondary)]">Análise</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
