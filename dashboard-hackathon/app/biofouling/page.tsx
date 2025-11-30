'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  Waves,
  TrendingUp,
  Clock,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Calendar,
  Target,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, KPICard } from '../components/ui';
import { RiskBadge } from '../components/ui/Badge';
import { vessels } from '../data/mockData';
import { cn, formatDate, daysUntil } from '../utils/helpers';

// Prediction model data (simulated ML output)
const predictionData = [
  { day: 'Atual', score: 42, predicted: false },
  { day: '+7d', score: 45, predicted: true },
  { day: '+14d', score: 49, predicted: true },
  { day: '+21d', score: 54, predicted: true },
  { day: '+30d', score: 58, predicted: true },
  { day: '+45d', score: 65, predicted: true },
  { day: '+60d', score: 72, predicted: true },
  { day: '+90d', score: 82, predicted: true },
];

// Environmental factors affecting biofouling
const environmentalFactors = [
  { factor: 'Temperatura da Água', value: 26.5, unit: '°C', impact: 'alto', icon: Thermometer },
  { factor: 'Salinidade', value: 35.2, unit: 'PSU', impact: 'moderado', icon: Droplets },
  { factor: 'Clorofila-a', value: 2.8, unit: 'μg/L', impact: 'alto', icon: Waves },
  { factor: 'Dias em Porto', value: 12, unit: 'dias', impact: 'crítico', icon: Clock },
];

// Speed degradation analysis
const speedDegradationData = [
  { month: 'Jan', baseline: 14.0, actual: 13.8, degradation: 1.4 },
  { month: 'Fev', baseline: 14.0, actual: 13.6, degradation: 2.9 },
  { month: 'Mar', baseline: 14.0, actual: 13.3, degradation: 5.0 },
  { month: 'Abr', baseline: 14.0, actual: 13.0, degradation: 7.1 },
  { month: 'Mai', baseline: 14.0, actual: 12.7, degradation: 9.3 },
  { month: 'Jun', baseline: 14.0, actual: 12.4, degradation: 11.4 },
  { month: 'Jul', baseline: 14.0, actual: 12.1, degradation: 13.6 },
  { month: 'Ago', baseline: 14.0, actual: 11.8, degradation: 15.7 },
  { month: 'Set', baseline: 14.0, actual: 11.5, degradation: 17.9 },
  { month: 'Out', baseline: 14.0, actual: 11.2, degradation: 20.0 },
  { month: 'Nov', baseline: 14.0, actual: 10.9, degradation: 22.1 },
];

// Correlation data for scatter plot
const correlationData = [
  { daysAtSea: 30, biofoulingScore: 15, fuelPenalty: 2 },
  { daysAtSea: 60, biofoulingScore: 25, fuelPenalty: 4 },
  { daysAtSea: 90, biofoulingScore: 35, fuelPenalty: 7 },
  { daysAtSea: 120, biofoulingScore: 45, fuelPenalty: 11 },
  { daysAtSea: 150, biofoulingScore: 55, fuelPenalty: 16 },
  { daysAtSea: 180, biofoulingScore: 65, fuelPenalty: 22 },
  { daysAtSea: 210, biofoulingScore: 72, fuelPenalty: 28 },
  { daysAtSea: 240, biofoulingScore: 78, fuelPenalty: 35 },
  { daysAtSea: 270, biofoulingScore: 83, fuelPenalty: 42 },
  { daysAtSea: 300, biofoulingScore: 88, fuelPenalty: 50 },
];

export default function BiofoulingPage() {
  const [selectedVessel, setSelectedVessel] = useState(vessels[0]);

  // Calculate vessels needing cleaning
  const vesselsNeedingCleaning = vessels.filter(
    (v) => v.biofoulingRisk.level === 'high' || v.biofoulingRisk.level === 'critical'
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Análise de Biofouling</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Monitoramento, predição e recomendações para controle de incrustações
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Score Médio da Frota"
          value={42}
          unit="/100"
          icon={Waves}
          iconColor="text-purple-400"
          change={3}
          trend="up"
          changeLabel="Aumento em 30 dias"
        />
        <KPICard
          title="Embarcações Críticas"
          value={vesselsNeedingCleaning.length}
          icon={AlertTriangle}
          iconColor="text-red-400"
          changeLabel="Necessitam limpeza urgente"
        />
        <KPICard
          title="Próxima Docagem"
          value={daysUntil(vessels[4].nextDrydock)}
          unit="dias"
          icon={Calendar}
          iconColor="text-cyan-400"
          changeLabel="EDUARDO COSTA"
        />
        <KPICard
          title="Economia Potencial"
          value="R$ 2.8M"
          icon={Target}
          iconColor="text-emerald-400"
          changeLabel="Com manutenção otimizada"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prediction Model */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Modelo de Predição - {selectedVessel.name}</CardTitle>
              <select
                value={selectedVessel.id}
                onChange={(e) => setSelectedVessel(vessels.find((v) => v.id === e.target.value) || vessels[0])}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background-card)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictionData}>
                  <defs>
                    <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="day" stroke="var(--foreground-muted)" fontSize={12} />
                  <YAxis stroke="var(--foreground-muted)" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                    }}
                    formatter={(value: number, name: string) => [
                      `Score: ${value}`,
                      name === 'score' ? 'Biofouling' : name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="url(#predictionGradient)"
                    dot={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { predicted: boolean } }) => {
                      if (cx === undefined || cy === undefined) return <></>;
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload?.predicted ? '#1e293b' : '#8b5cf6'}
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          strokeDasharray={payload?.predicted ? '4 2' : '0'}
                        />
                      );
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-[var(--foreground-muted)]">Atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-purple-500 border-dashed" />
                  <span className="text-[var(--foreground-muted)]">Predição (ML)</span>
                </div>
              </div>
              <div className="text-[var(--foreground-muted)]">
                Data recomendada para limpeza: <span className="text-amber-400 font-semibold">+45 dias</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environmental Factors */}
        <Card>
          <CardHeader>
            <CardTitle>Fatores Ambientais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {environmentalFactors.map((item) => (
                <div
                  key={item.factor}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--background-card)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      item.impact === 'crítico' && 'bg-red-500/20',
                      item.impact === 'alto' && 'bg-amber-500/20',
                      item.impact === 'moderado' && 'bg-blue-500/20',
                    )}>
                      <item.icon className={cn(
                        'w-5 h-5',
                        item.impact === 'crítico' && 'text-red-400',
                        item.impact === 'alto' && 'text-amber-400',
                        item.impact === 'moderado' && 'text-blue-400',
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.factor}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">Impacto {item.impact}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--foreground)]">{item.value}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Speed Degradation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Degradação de Velocidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedDegradationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--foreground-muted)" fontSize={12} />
                  <YAxis stroke="var(--foreground-muted)" fontSize={12} domain={[10, 15]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} nós`, '']}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Velocidade Base"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Velocidade Real"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Perda de Performance Detectada</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    A velocidade média reduziu 22.1% em relação ao baseline, 
                    indicando alto nível de biofouling no casco.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Correlation Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Correlação: Tempo × Biofouling × Combustível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="daysAtSea"
                    name="Dias"
                    stroke="var(--foreground-muted)"
                    fontSize={12}
                    label={{ value: 'Dias desde limpeza', position: 'bottom', fill: 'var(--foreground-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="biofoulingScore"
                    name="Score"
                    stroke="var(--foreground-muted)"
                    fontSize={12}
                    label={{ value: 'Score Biofouling', angle: -90, position: 'insideLeft', fill: 'var(--foreground-muted)', fontSize: 11 }}
                  />
                  <ZAxis dataKey="fuelPenalty" range={[50, 400]} name="Penalidade Combustível" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Dias') return [`${value} dias`, 'Tempo'];
                      if (name === 'Score') return [value, 'Biofouling'];
                      return [`+${value}%`, 'Penalidade Combustível'];
                    }}
                  />
                  <Scatter data={correlationData} fill="#06b6d4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-xs text-[var(--foreground-muted)] text-center">
              Tamanho do ponto indica penalidade de combustível (%)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações de Manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vessels
              .sort((a, b) => b.biofoulingRisk.score - a.biofoulingRisk.score)
              .slice(0, 6)
              .map((vessel) => (
                <div
                  key={vessel.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all',
                    vessel.biofoulingRisk.level === 'critical' && 'bg-red-500/10 border-red-500/30',
                    vessel.biofoulingRisk.level === 'high' && 'bg-orange-500/10 border-orange-500/30',
                    vessel.biofoulingRisk.level === 'moderate' && 'bg-amber-500/10 border-amber-500/30',
                    vessel.biofoulingRisk.level === 'low' && 'bg-emerald-500/10 border-emerald-500/30',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-[var(--foreground)]">{vessel.name}</h4>
                    <RiskBadge level={vessel.biofoulingRisk.level} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--foreground-muted)]">Score</span>
                      <span className="font-medium text-[var(--foreground)]">{vessel.biofoulingRisk.score}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--foreground-muted)]">Limpeza recomendada</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {formatDate(vessel.biofoulingRisk.predictedCleaningDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--foreground-muted)]">Impacto CO₂</span>
                      <span className="font-medium text-red-500">
                        +{vessel.fuelEfficiency.co2Impact.toFixed(1)} ton/dia
                      </span>
                    </div>
                  </div>
                  <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--background-secondary)] text-sm text-cyan-500 hover:bg-[var(--background-hover)] transition-colors">
                    Ver detalhes
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

