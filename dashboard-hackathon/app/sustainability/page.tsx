'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Leaf,
  Factory,
  TrendingDown,
  Target,
  Award,
  TreePine,
  Droplets,
  Zap,
  ArrowDown,
  ArrowUp,
  Ship,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, KPICard } from '../components/ui';
import { vessels, fleetStats } from '../data/mockData';
import { cn, formatNumber } from '../utils/helpers';

// Monthly CO2 data
const monthlyCO2Data = [
  { month: 'Jan', emissions: 3800, target: 3500, savings: 0 },
  { month: 'Fev', emissions: 3700, target: 3500, savings: 0 },
  { month: 'Mar', emissions: 4100, target: 3500, savings: 0 },
  { month: 'Abr', emissions: 4200, target: 3500, savings: 0 },
  { month: 'Mai', emissions: 4050, target: 3500, savings: 0 },
  { month: 'Jun', emissions: 4300, target: 3500, savings: 0 },
  { month: 'Jul', emissions: 4600, target: 3400, savings: 0 },
  { month: 'Ago', emissions: 4800, target: 3400, savings: 0 },
  { month: 'Set', emissions: 4650, target: 3400, savings: 0 },
  { month: 'Out', emissions: 4900, target: 3400, savings: 0 },
  { month: 'Nov', emissions: 4850, target: 3400, savings: 0 },
];

// Potential savings data
const savingsData = [
  { category: 'Limpeza de Casco', potential: 35, current: 0, color: '#10b981' },
  { category: 'Otimização de Rota', potential: 20, current: 8, color: '#06b6d4' },
  { category: 'Velocidade Econômica', potential: 15, current: 12, color: '#8b5cf6' },
  { category: 'Manutenção Preditiva', potential: 18, current: 5, color: '#f59e0b' },
  { category: 'Combustível Alternativo', potential: 12, current: 2, color: '#ef4444' },
];

// Emissions by source
const emissionsBySource = [
  { name: 'Biofouling (excesso)', value: 28, color: '#ef4444' },
  { name: 'Operação Normal', value: 52, color: '#3b82f6' },
  { name: 'Manobras em Porto', value: 12, color: '#f59e0b' },
  { name: 'Sistemas Auxiliares', value: 8, color: '#8b5cf6' },
];

// IMO targets
const imoTargets = [
  { year: '2023', target: 100, current: 100 },
  { year: '2030', target: 60, current: 95 },
  { year: '2040', target: 30, current: null },
  { year: '2050', target: 0, current: null },
];

export default function SustainabilityPage() {
  // Calculate totals
  const totalEmissions = monthlyCO2Data.reduce((acc, m) => acc + m.emissions, 0);
  const avgMonthlyEmissions = totalEmissions / monthlyCO2Data.length;
  const biofoulingEmissions = vessels.reduce((acc, v) => acc + v.fuelEfficiency.co2Impact * 30, 0);
  const potentialReduction = (biofoulingEmissions / totalEmissions) * 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Sustentabilidade & Descarbonização</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Acompanhe as métricas ambientais e metas de redução de emissões
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Leaf className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Programa Net Zero 2050</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Emissões Totais 2024"
          value={formatNumber(totalEmissions)}
          unit="ton CO₂"
          icon={Factory}
          iconColor="text-slate-400"
          change={8}
          trend="up"
          changeLabel="vs. 2023"
        />
        <KPICard
          title="Excesso por Biofouling"
          value={formatNumber(biofoulingEmissions, 0)}
          unit="ton CO₂/mês"
          icon={Droplets}
          iconColor="text-red-400"
          changeLabel={`${potentialReduction.toFixed(1)}% do total evitável`}
        />
        <KPICard
          title="Potencial de Redução"
          value={potentialReduction.toFixed(0)}
          unit="%"
          icon={TrendingDown}
          iconColor="text-emerald-400"
          changeLabel="Com casco limpo"
        />
        <KPICard
          title="Economia de Combustível"
          value={formatNumber(fleetStats.totalFuelWaste * 30, 0)}
          unit="ton/mês"
          icon={Zap}
          iconColor="text-amber-400"
          changeLabel="Potencial com manutenção"
        />
      </div>

      {/* IMO Targets Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Metas IMO de Descarbonização</CardTitle>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-[var(--foreground-muted)]">Baseline: 2008</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {imoTargets.map((target) => (
              <div
                key={target.year}
                className={cn(
                  'p-4 rounded-xl text-center',
                  target.current !== null
                    ? target.current <= target.target
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                    : 'bg-[var(--background-card)] border border-[var(--border)]'
                )}
              >
                <p className="text-sm text-[var(--foreground-muted)] mb-2">{target.year}</p>
                <div className="text-3xl font-bold mb-1">
                  {target.current !== null ? (
                    <span className={target.current <= target.target ? 'text-emerald-400' : 'text-red-400'}>
                      {target.current}%
                    </span>
                  ) : (
                    <span className="text-[var(--foreground-muted)]">—</span>
                  )}
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">Meta: {target.target}%</p>
                {target.current !== null && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {target.current <= target.target ? (
                      <>
                        <ArrowDown className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-400">No alvo</span>
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-red-400">Acima</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Emissions */}
        <Card>
          <CardHeader>
            <CardTitle>Emissões Mensais de CO₂</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyCO2Data}>
                  <defs>
                    <linearGradient id="emissionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--foreground-muted)" fontSize={12} />
                  <YAxis stroke="var(--foreground-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ton CO₂`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    name="Meta"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="emissions"
                    name="Emissões"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#emissionsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[var(--foreground-muted)]">Emissões reais</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-500" style={{ borderStyle: 'dashed' }} />
                  <span className="text-[var(--foreground-muted)]">Meta</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emissions by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Emissões por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emissionsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {emissionsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        color: 'var(--foreground)',
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {emissionsBySource.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-[var(--foreground-secondary)]">{item.name}</span>
                    </div>
                    <span className="text-lg font-semibold text-[var(--foreground)]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <Droplets className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Biofouling é a principal causa de excesso</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    28% das emissões são causadas por incrustações no casco. 
                    Com manutenção adequada, podemos reduzir significativamente.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reduction Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Oportunidades de Redução</CardTitle>
            <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
              <TreePine className="w-4 h-4 text-emerald-400" />
              Potencial total: 100% sustentável até 2050
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="var(--foreground-muted)" fontSize={12} domain={[0, 40]} />
                <YAxis type="category" dataKey="category" stroke="var(--foreground-muted)" fontSize={12} width={140} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--foreground)',
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Bar dataKey="potential" name="Potencial" fill="#334155" radius={[0, 4, 4, 0]} />
                <Bar dataKey="current" name="Implementado" radius={[0, 4, 4, 0]}>
                  {savingsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-600" />
              <span className="text-[var(--foreground-muted)]">Potencial máximo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-[var(--foreground-muted)]">Já implementado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
          <CardContent className="py-6 text-center">
            <Award className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              {formatNumber(biofoulingEmissions * 12, 0)} ton
            </h3>
            <p className="text-sm text-[var(--foreground-muted)]">CO₂ evitável por ano com casco limpo</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/30">
          <CardContent className="py-6 text-center">
            <TreePine className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              {formatNumber((biofoulingEmissions * 12) / 21, 0)}
            </h3>
            <p className="text-sm text-slate-400">Árvores equivalentes plantadas/ano</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30">
          <CardContent className="py-6 text-center">
            <Zap className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              R$ {formatNumber(fleetStats.estimatedSavings * 12 / 1000000, 1)}M
            </h3>
            <p className="text-sm text-slate-400">Economia potencial em combustível/ano</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

