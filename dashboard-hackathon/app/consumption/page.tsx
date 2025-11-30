'use client';

import { useState, useEffect } from 'react';
import {
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
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Fuel,
  Ship,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Gauge,
  Timer,
  Navigation,
  Anchor,
  Droplets,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, KPICard } from '../components/ui';
import { cn, formatNumber } from '../utils/helpers';

// Types
interface ShipAnalysis {
  shipName: string;
  shipClass: string;
  totalSessions: number;
  navigationSessions: number;
  portSessions: number;
  totalDistance: number;
  totalDuration: number;
  totalConsumption: number;
  avgSpeed: number;
  avgFuelEfficiency: number;
  avgFuelPerHour: number;
  consumptionByFuelType: { [key: string]: number };
  consumptionByEvent: { [key: string]: number };
  speedTrend: 'improving' | 'stable' | 'degrading';
  efficiencyTrend: 'improving' | 'stable' | 'degrading';
}

interface FleetTotals {
  totalSessions: number;
  totalDistance: number;
  totalDuration: number;
  totalConsumption: number;
  avgFuelEfficiency: number;
  consumptionByFuelType: { [key: string]: number };
  consumptionByEvent: { [key: string]: number };
}

interface ConsumptionData {
  success: boolean;
  totalSessionsProcessed: number;
  totalShips: number;
  fleetTotals: FleetTotals;
  ships: ShipAnalysis[];
  availableShips: string[];
}

// Colors
const PETROBRAS_GREEN = '#008140';
const PETROBRAS_YELLOW = '#F5C22E';
const CHART_COLORS = ['#008140', '#F5C22E', '#00a550', '#d4a520', '#006633', '#ffd54f'];

export default function ConsumptionPage() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShip, setSelectedShip] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/consumption-analysis?limit=10000');
        const result = await response.json();
        
        if (result.success) {
          setData(result);
          setError(null);
        } else {
          setError(result.error || 'Failed to load data');
        }
      } catch (err) {
        setError('Failed to connect to API');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#008140]/30 border-t-[#008140] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Carregando dados de consumo...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Erro ao carregar dados'}</p>
        </div>
      </div>
    );
  }

  const { fleetTotals, ships } = data;

  // Prepare chart data
  const fuelTypeData = Object.entries(fleetTotals.consumptionByFuelType).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    fullName: name,
    value: Math.round(value),
  }));

  const eventTypeData = Object.entries(fleetTotals.consumptionByEvent)
    .filter(([name]) => name)
    .map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value);

  const shipConsumptionData = ships
    .slice(0, 10)
    .map((ship) => ({
      name: ship.shipName.split(' ')[0],
      fullName: ship.shipName,
      consumption: Math.round(ship.totalConsumption),
      efficiency: ship.avgFuelEfficiency.toFixed(2),
      distance: Math.round(ship.totalDistance),
    }));

  const efficiencyData = ships
    .filter((s) => s.avgFuelEfficiency > 0)
    .slice(0, 10)
    .map((ship) => ({
      name: ship.shipName.split(' ')[0],
      fullName: ship.shipName,
      efficiency: parseFloat(ship.avgFuelEfficiency.toFixed(2)),
      speed: ship.avgSpeed.toFixed(1),
    }))
    .sort((a, b) => a.efficiency - b.efficiency);

  // Count trends
  const degradingShips = ships.filter((s) => s.efficiencyTrend === 'degrading').length;
  const improvingShips = ships.filter((s) => s.efficiencyTrend === 'improving').length;

  const selectedShipData = selectedShip ? ships.find((s) => s.shipName === selectedShip) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F7F7]">Análise de Consumo</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Consumo de combustível correlacionado com eventos operacionais
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#008140]/10 border border-[#008140]/30">
          <Fuel className="w-4 h-4 text-[#008140]" />
          <span className="text-sm font-medium text-[#008140]">
            {formatNumber(fleetTotals.totalConsumption, 0)} toneladas processadas
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Consumo Total"
          value={formatNumber(fleetTotals.totalConsumption, 0)}
          unit="ton"
          icon={Fuel}
          iconColor="text-[#F5C22E]"
          description={`${data.totalShips} embarcações`}
        />
        <KPICard
          title="Distância Total"
          value={formatNumber(fleetTotals.totalDistance, 0)}
          unit="nm"
          icon={Navigation}
          iconColor="text-[#008140]"
          description={`${formatNumber(fleetTotals.totalSessions)} sessões`}
        />
        <KPICard
          title="Eficiência Média"
          value={fleetTotals.avgFuelEfficiency.toFixed(2)}
          unit="ton/100nm"
          icon={Gauge}
          iconColor="text-[#008140]"
          description="Consumo por 100 milhas náuticas"
        />
        <KPICard
          title="Horas de Operação"
          value={formatNumber(fleetTotals.totalDuration, 0)}
          unit="h"
          icon={Timer}
          iconColor="text-[#F5C22E]"
          description={`${formatNumber(fleetTotals.totalDuration / 24, 0)} dias`}
        />
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          'p-4',
          degradingShips > 0 ? 'border-red-500/30 bg-red-500/5' : ''
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              degradingShips > 0 ? 'bg-red-500/20' : 'bg-[#008140]/20'
            )}>
              <TrendingDown className={cn(
                'w-6 h-6',
                degradingShips > 0 ? 'text-red-400' : 'text-[#008140]'
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F7F7F7]">{degradingShips}</p>
              <p className="text-sm text-[var(--foreground-muted)]">Navios com eficiência em queda</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5C22E]/20 flex items-center justify-center">
              <Minus className="w-6 h-6 text-[#F5C22E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F7F7F7]">
                {ships.length - degradingShips - improvingShips}
              </p>
              <p className="text-sm text-[var(--foreground-muted)]">Navios com eficiência estável</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-[#008140]/30 bg-[#008140]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#008140]/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#008140]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F7F7F7]">{improvingShips}</p>
              <p className="text-sm text-[var(--foreground-muted)]">Navios com eficiência melhorando</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption by Ship */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-[#008140]" />
              Consumo por Embarcação (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shipConsumptionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#008140" opacity={0.2} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#142236',
                      border: '1px solid rgba(0, 129, 64, 0.3)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number, name: string, props: { payload: { fullName: string } }) => [
                      `${formatNumber(value)} ton`,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="consumption" fill={PETROBRAS_GREEN} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Efficiency Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#F5C22E]" />
              Ranking de Eficiência (Menor = Melhor)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#008140" opacity={0.2} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#142236',
                      border: '1px solid rgba(0, 129, 64, 0.3)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number, name: string, props: { payload: { fullName: string; speed: string } }) => [
                      `${value} ton/100nm (${props.payload.speed} nós)`,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="efficiency" radius={[0, 4, 4, 0]}>
                    {efficiencyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index < 3 ? PETROBRAS_GREEN : index < 6 ? PETROBRAS_YELLOW : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consumption by Fuel Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-[#008140]" />
              Por Tipo de Combustível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fuelTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fuelTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#142236',
                      border: '1px solid rgba(0, 129, 64, 0.3)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number, name: string, props: { payload: { fullName: string } }) => [
                      `${formatNumber(value)} ton`,
                      props.payload.fullName,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {fuelTypeData.slice(0, 4).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} 
                    />
                    <span className="text-[var(--foreground-muted)]">{item.name}</span>
                  </div>
                  <span className="text-[#F7F7F7] font-medium">{formatNumber(item.value)} ton</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Consumption by Event Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#F5C22E]" />
              Por Tipo de Evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventTypeData.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#008140" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#142236',
                      border: '1px solid rgba(0, 129, 64, 0.3)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => [`${formatNumber(value)} ton`, 'Consumo']}
                  />
                  <Bar dataKey="value" fill={PETROBRAS_YELLOW} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-[#008140]/10 border border-[#008140]/30">
              <p className="text-xs text-[#008140]">
                💡 Consumo em porto representa oportunidade de otimização - paradas longas aumentam o risco de biofouling.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ship Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-[#008140]" />
              Detalhes por Navio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full h-10 rounded-lg border border-[#008140]/30 bg-[#0a1628] px-3 text-sm text-[#F7F7F7] outline-none focus:border-[#008140]/50 mb-4"
              value={selectedShip || ''}
              onChange={(e) => setSelectedShip(e.target.value || null)}
            >
              <option value="">Selecione uma embarcação</option>
              {ships.map((ship) => (
                <option key={ship.shipName} value={ship.shipName}>
                  {ship.shipName} ({ship.shipClass})
                </option>
              ))}
            </select>

            {selectedShipData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1628]/50">
                  <span className="text-[var(--foreground-muted)]">Consumo Total</span>
                  <span className="text-[#F7F7F7] font-bold">
                    {formatNumber(selectedShipData.totalConsumption)} ton
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1628]/50">
                  <span className="text-[var(--foreground-muted)]">Distância</span>
                  <span className="text-[#F7F7F7] font-bold">
                    {formatNumber(selectedShipData.totalDistance)} nm
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1628]/50">
                  <span className="text-[var(--foreground-muted)]">Eficiência</span>
                  <span className="text-[#F7F7F7] font-bold">
                    {selectedShipData.avgFuelEfficiency.toFixed(2)} ton/100nm
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1628]/50">
                  <span className="text-[var(--foreground-muted)]">Velocidade Média</span>
                  <span className="text-[#F7F7F7] font-bold">
                    {selectedShipData.avgSpeed.toFixed(1)} nós
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1628]/50">
                  <span className="text-[var(--foreground-muted)]">Tendência Eficiência</span>
                  <span className={cn(
                    'font-bold flex items-center gap-1',
                    selectedShipData.efficiencyTrend === 'degrading' && 'text-red-400',
                    selectedShipData.efficiencyTrend === 'stable' && 'text-[#F5C22E]',
                    selectedShipData.efficiencyTrend === 'improving' && 'text-[#008140]',
                  )}>
                    {selectedShipData.efficiencyTrend === 'degrading' && <TrendingDown className="w-4 h-4" />}
                    {selectedShipData.efficiencyTrend === 'stable' && <Minus className="w-4 h-4" />}
                    {selectedShipData.efficiencyTrend === 'improving' && <TrendingUp className="w-4 h-4" />}
                    {selectedShipData.efficiencyTrend === 'degrading' ? 'Piorando' : 
                     selectedShipData.efficiencyTrend === 'improving' ? 'Melhorando' : 'Estável'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1628]/50">
                  <span className="text-[var(--foreground-muted)]">Sessões Nav./Porto</span>
                  <span className="text-[#F7F7F7] font-bold">
                    {selectedShipData.navigationSessions} / {selectedShipData.portSessions}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--foreground-muted)]">
                <Anchor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Selecione um navio para ver detalhes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ships Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Embarcação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#008140]/20">
                  <th className="text-left py-3 px-4 text-[var(--foreground-muted)] font-medium">Embarcação</th>
                  <th className="text-left py-3 px-4 text-[var(--foreground-muted)] font-medium">Classe</th>
                  <th className="text-right py-3 px-4 text-[var(--foreground-muted)] font-medium">Consumo (ton)</th>
                  <th className="text-right py-3 px-4 text-[var(--foreground-muted)] font-medium">Distância (nm)</th>
                  <th className="text-right py-3 px-4 text-[var(--foreground-muted)] font-medium">Eficiência</th>
                  <th className="text-right py-3 px-4 text-[var(--foreground-muted)] font-medium">Vel. Média</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Tendência</th>
                </tr>
              </thead>
              <tbody>
                {ships.slice(0, 15).map((ship) => (
                  <tr 
                    key={ship.shipName} 
                    className="border-b border-[#008140]/10 hover:bg-[#008140]/5 cursor-pointer"
                    onClick={() => setSelectedShip(ship.shipName)}
                  >
                    <td className="py-3 px-4 text-[#F7F7F7] font-medium">{ship.shipName}</td>
                    <td className="py-3 px-4 text-slate-400">{ship.shipClass}</td>
                    <td className="py-3 px-4 text-right text-[#F5C22E] font-medium">
                      {formatNumber(ship.totalConsumption)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {formatNumber(ship.totalDistance)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {ship.avgFuelEfficiency.toFixed(2)} t/100nm
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {ship.avgSpeed.toFixed(1)} nós
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        ship.efficiencyTrend === 'degrading' && 'bg-red-500/20 text-red-400',
                        ship.efficiencyTrend === 'stable' && 'bg-[#F5C22E]/20 text-[#F5C22E]',
                        ship.efficiencyTrend === 'improving' && 'bg-[#008140]/20 text-[#008140]',
                      )}>
                        {ship.efficiencyTrend === 'degrading' && <TrendingDown className="w-3 h-3" />}
                        {ship.efficiencyTrend === 'stable' && <Minus className="w-3 h-3" />}
                        {ship.efficiencyTrend === 'improving' && <TrendingUp className="w-3 h-3" />}
                        {ship.efficiencyTrend === 'degrading' ? 'Queda' : 
                         ship.efficiencyTrend === 'improving' ? 'Melhora' : 'Estável'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

