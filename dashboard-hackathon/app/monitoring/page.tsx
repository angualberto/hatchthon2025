'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Ship,
  Anchor,
  MapPin,
  Filter,
  RefreshCw,
  Layers,
  Route,
  Timer,
  Thermometer,
  Gauge,
  Building2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, KPICard } from '../components/ui';
import { cn, formatNumber } from '../utils/helpers';
import { useTheme } from '../contexts/ThemeContext';

// Dynamically import map component to avoid SSR issues
const FleetMapWithRoutes = dynamic(() => import('../components/map/FleetMapWithRoutes'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#142236]/50 rounded-xl">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#008140]/30 border-t-[#008140] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Carregando mapa...</p>
      </div>
    </div>
  ),
});

// Dynamically import CameraFeed (client only)
const CameraFeed = dynamic(() => import('../components/realtime/CameraFeed'), { ssr: false });

// Color palette matching the map
const VESSEL_COLORS = [
  '#008140', '#F5C22E', '#2a9d8f', '#e63946', '#f77f00',
  '#00a550', '#1d3557', '#264653', '#9b5de5', '#00b4d8',
  '#ff006e', '#8338ec', '#3a86ff', '#06d6a0', '#ef476f',
  '#ffd166', '#118ab2', '#073b4c', '#ff9f1c', '#2ec4b6'
];

// Vessel names from CSV files
const AVAILABLE_VESSELS = [
  'BRUNO LIMA', 'CARLA SILVA', 'DANIEL PEREIRA', 'EDUARDO COSTA',
  'FABIO SANTOS', 'FELIPE RIBEIRO', 'GABRIELA MARTINS', 'GISELLE CARVALHO',
  'HENRIQUE ALVES', 'LUCAS MEDONCA', 'MARCOS CAVALCANTI', 'MARIA VALENTINA',
  'PAULO MOURA', 'RAFAEL SANTOS', 'RAUL MARTINS', 'RICARDO BARBOSA',
  'RODRIGO PINHEIRO', 'ROMARIO SILVA', 'THIAGO FERNANDES', 'VICTOR OLIVEIRA'
];

interface RouteStats {
  vesselName: string;
  totalStops: number;
  totalStopHours: number;
  avgSpeed: number;
}

export default function MonitoringPage() {
  const { theme } = useTheme();
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [showStops, setShowStops] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPorts, setShowPorts] = useState(true);
  const [colorBySpeed, setColorBySpeed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'OR' | 'AND'>('OR'); // OR = uma por vez, AND = múltiplas
  const [routeStats, setRouteStats] = useState<RouteStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch route statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/routes?limit=2000');
        const data = await response.json();
        
        if (data.success && data.routes) {
          const stats = data.routes.map((r: { vesselName: string; summary: { totalStops: number; totalStopHours: number; avgSpeed: number } }) => ({
            vesselName: r.vesselName,
            totalStops: r.summary.totalStops,
            totalStopHours: r.summary.totalStopHours,
            avgSpeed: r.summary.avgSpeed,
          }));
          setRouteStats(stats);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Calculate total stops
  const totalStops = routeStats.reduce((acc, r) => acc + r.totalStops, 0);
  const totalStopHours = routeStats.reduce((acc, r) => acc + r.totalStopHours, 0);
  const avgFleetSpeed = routeStats.length > 0 
    ? routeStats.reduce((acc, r) => acc + r.avgSpeed, 0) / routeStats.length 
    : 0;

  // Filter vessels based on search
  const filteredVessels = AVAILABLE_VESSELS.filter(v =>
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle vessel selection
  const toggleVessel = (vesselName: string) => {
    if (selectionMode === 'OR') {
      // Modo OR: seleciona apenas uma embarcação por vez
      setSelectedVessels(prev =>
        prev.includes(vesselName) ? [] : [vesselName]
      );
    } else {
      // Modo AND: permite múltiplas seleções
      setSelectedVessels(prev =>
        prev.includes(vesselName)
          ? prev.filter(v => v !== vesselName)
          : [...prev, vesselName]
      );
    }
  };

  // Select/deselect all (apenas no modo AND)
  const handleSelectAll = () => {
    if (selectionMode === 'OR') {
      // No modo OR, não faz sentido selecionar todas
      return;
    }
    if (selectAll) {
      setSelectedVessels([]);
    } else {
      setSelectedVessels([...AVAILABLE_VESSELS]);
    }
    setSelectAll(!selectAll);
  };

  // Update selectAll state when individual selections change
  useEffect(() => {
    setSelectAll(selectedVessels.length === AVAILABLE_VESSELS.length);
  }, [selectedVessels]);

  // Get color for vessel
  const getVesselColor = (vesselName: string) => {
    const index = AVAILABLE_VESSELS.indexOf(vesselName);
    return VESSEL_COLORS[index % VESSEL_COLORS.length];
  };

  // Get stats for a vessel
  const getVesselStats = (vesselName: string) => {
    return routeStats.find(r => r.vesselName === vesselName);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Mapa da Frota</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Visualize as rotas históricas, paradas e portos da frota Transpetro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#008140]/10 border border-[#008140]/30">
            <Route className="w-4 h-4 text-[#008140]" />
            <span className="text-sm font-medium text-[#008140]">
              {selectedVessels.length} rotas
            </span>
          </div>
          {showStops && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5C22E]/10 border border-[#F5C22E]/30">
              <Anchor className="w-4 h-4 text-[#F5C22E]" />
              <span className="text-sm font-medium text-[#F5C22E]">
                {totalStops} paradas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Embarcações"
          value={AVAILABLE_VESSELS.length}
          icon={Ship}
          iconColor="text-[#008140]"
          description="Total com dados AIS"
        />
        <KPICard
          title="Total de Paradas"
          value={loadingStats ? '...' : formatNumber(totalStops)}
          icon={Anchor}
          iconColor="text-[#F5C22E]"
          description="Detectadas automaticamente"
        />
        <KPICard
          title="Tempo em Parada"
          value={loadingStats ? '...' : formatNumber(totalStopHours, 0)}
          unit="horas"
          icon={Timer}
          iconColor="text-[#F5C22E]"
          description="Total da frota"
        />
        <KPICard
          title="Velocidade Média"
          value={loadingStats ? '...' : avgFleetSpeed.toFixed(1)}
          unit="nós"
          icon={Gauge}
          iconColor="text-[#008140]"
          description="Média da frota"
        />
      </div>

      {/* Map Controls */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--foreground-muted)] mr-2">Visualização:</span>
            
            <button
              onClick={() => setShowStops(!showStops)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                showStops
                  ? 'bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30'
                  : 'bg-[var(--background-card)]/50 text-[var(--foreground-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              <Anchor className="w-4 h-4" />
              Paradas
            </button>

            <button
              onClick={() => setShowPorts(!showPorts)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                showPorts
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                  : 'bg-[var(--background-card)]/50 text-[var(--foreground-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              <Building2 className="w-4 h-4" />
              Portos
            </button>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                showHeatmap
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-[var(--background-card)]/50 text-[var(--foreground-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              <Thermometer className="w-4 h-4" />
              Heatmap
            </button>

            <button
              onClick={() => setColorBySpeed(!colorBySpeed)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                colorBySpeed
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                  : 'bg-[var(--background-card)]/50 text-[var(--foreground-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              <Gauge className="w-4 h-4" />
              Cor por Velocidade
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Map and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#008140]" />
                  Mapa Interativo
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)] p-0">
              <FleetMapWithRoutes
                selectedVessels={selectedVessels}
                showStops={showStops}
                showHeatmap={showHeatmap}
                showPorts={showPorts}
                colorBySpeed={colorBySpeed}
                selectionMode={selectionMode}
                mapTheme={theme}
                onVesselSelect={(name) => {
                  if (selectionMode === 'OR') {
                    setSelectedVessels([name]);
                  } else {
                    if (!selectedVessels.includes(name)) {
                      setSelectedVessels(prev => [...prev, name]);
                    }
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Vessel Filter Panel */}
        <div className="space-y-4">
          {/* Camera Feed (real-time) */}
          <div>
            <CameraFeed />
          </div>
          <Card className="max-h-[380px] overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[var(--foreground-muted)]" />
                  Embarcações
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Selection Mode Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--background-card)] border border-[var(--border)]">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--foreground-secondary)]">Modo de Seleção</span>
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {selectionMode === 'OR' ? 'Uma por vez' : 'Múltiplas'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectionMode('OR');
                      // No modo OR, manter apenas a primeira selecionada ou limpar
                      if (selectedVessels.length > 1) {
                        setSelectedVessels(selectedVessels.slice(0, 1));
                      }
                    }}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-all',
                      selectionMode === 'OR'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    OU
                  </button>
                  <button
                    onClick={() => setSelectionMode('AND')}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-all',
                      selectionMode === 'AND'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    E
                  </button>
                </div>
              </div>
              {/* Search */}
              <input
                type="text"
                placeholder="Buscar embarcação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background-card)] px-3 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
              />

              {/* Select All - apenas no modo AND */}
              {selectionMode === 'AND' && (
                <button
                onClick={handleSelectAll}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all',
                  selectAll
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                    : 'bg-[var(--background-card)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                )}
                >
                  <span>{selectAll ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                  <span className="text-xs text-slate-500">{AVAILABLE_VESSELS.length}</span>
                </button>
              )}

              {/* Vessel List */}
              <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1">
                {filteredVessels.map((vessel) => {
                  const isSelected = selectedVessels.includes(vessel);
                  const color = getVesselColor(vessel);
                  const stats = getVesselStats(vessel);
                  
                  return (
                    <button
                      key={vessel}
                      onClick={() => toggleVessel(vessel)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        isSelected
                          ? 'bg-[var(--background-hover)] border border-[var(--color-primary)]/30'
                          : 'bg-[var(--background-card)] border border-transparent opacity-70 hover:opacity-100 hover:border-[var(--border)]'
                      )}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className={cn(
                        'text-left flex-1 truncate',
                        isSelected ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'
                      )}>
                        {vessel}
                      </span>
                      {stats && (
                        <span className="text-xs text-[var(--color-secondary)] flex-shrink-0">
                          {stats.totalStops} ⏸
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Clear Selection */}
              {selectedVessels.length > 0 && (
                <button
                  onClick={() => setSelectedVessels([])}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--background-card)] text-[var(--foreground-muted)] text-sm hover:text-[var(--foreground)] hover:bg-[var(--background-hover)] transition-all border border-[var(--border)]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Mostrar Todas
                </button>
              )}
            </CardContent>
          </Card>

          {/* Stops Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[var(--color-secondary)]" />
                Top Paradas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-[#008140]/30 border-t-[#008140] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {routeStats
                    .sort((a, b) => b.totalStops - a.totalStops)
                    .slice(0, 4)
                    .map((stat, idx) => (
                      <div
                        key={stat.vesselName}
                        className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#0a1628]/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-4">{idx + 1}.</span>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getVesselColor(stat.vesselName) }}
                          />
                          <span className="text-slate-300 truncate max-w-[80px]">
                            {stat.vesselName.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#F5C22E] font-medium">{stat.totalStops}</span>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--foreground-muted)]" />
                Legenda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <span className="text-white text-[8px]">▶</span>
                </div>
                <span className="text-[var(--foreground-secondary)]">Início</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-[8px]">■</span>
                </div>
                <span className="text-[var(--foreground-secondary)]">Fim</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500" />
                <span className="text-[var(--foreground-secondary)]">Parada curta (&lt;6h)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[var(--color-secondary)]" />
                <span className="text-[var(--foreground-secondary)]">Parada média (6-24h)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-600" />
                <span className="text-[var(--foreground-secondary)]">Parada longa (&gt;24h)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-white" />
                </div>
                <span className="text-[var(--foreground-secondary)]">Porto</span>
              </div>

              {showHeatmap && (
                <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-start gap-2">
                    <Thermometer className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-orange-300">
                      Heatmap mostra zonas de alta concentração de paradas (risco de biofouling)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
