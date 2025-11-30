'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { cn } from '../../utils/helpers';
import { useTheme } from '../../contexts/ThemeContext';

// Dynamic import para evitar problemas de SSR com Leaflet
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[var(--background-card)]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--foreground-muted)]">Carregando mapa...</p>
      </div>
    </div>
  ),
});

interface OceanDataPoint {
  lat: number;
  lng: number;
  temperature?: number;
  chlorophyll?: number;
  biofoulingRisk?: number;
  biodiversity?: 'high' | 'medium' | 'low';
}

interface BiofoulingZone {
  id: string;
  name: string;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  avgTemperature: number;
  avgChlorophyll: number;
  biodiversity: 'high' | 'medium' | 'low';
  biofoulingRisk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface VesselStop {
  vesselName: string;
  stop: {
    lat: number;
    lng: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
  zoneId?: string;
  zoneName?: string;
  temperature?: number;
  chlorophyll?: number;
  biofoulingRisk?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface BrazilCoastMapProps {
  dataType?: 'all' | 'temperature' | 'chlorophyll' | 'zones';
  vesselStops?: VesselStop[];
}

export default function BrazilCoastMap({ dataType = 'all', vesselStops = [] }: BrazilCoastMapProps) {
  const { theme } = useTheme();
  const [data, setData] = useState<OceanDataPoint[]>([]);
  const [zones, setZones] = useState<BiofoulingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLayer] = useState<'zones'>('zones');
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Tentar buscar dados reais primeiro
        let response = await fetch(`/api/oceanography/brazil-coast?type=${dataType}`);
        let result = await response.json();
        
        // Se houver erro e não for erro crítico, tentar com dados mockados
        if (result.error && response.status >= 500) {
          console.warn('ERDDAP unavailable, using mock data');
          response = await fetch(`/api/oceanography/brazil-coast?type=${dataType}&mock=true`);
          result = await response.json();
        }
        
        if (result.error) {
          setError(result.error);
          return;
        }
        
        if (result.dataPoints) {
          setData(result.dataPoints);
        }
        if (result.zones) {
          setZones(result.zones);
        }
        if (result.summary) {
          setSummary(result.summary);
        }
      } catch (err: any) {
        console.error('Error fetching oceanography data:', err);
        setError(err.message || 'Erro ao carregar dados. Tente novamente em alguns instantes.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dataType]);

  // Função para obter cor baseada em temperatura
  const getTemperatureColor = (temp: number): string => {
    if (temp >= 28) return '#ef4444'; // Vermelho - muito quente
    if (temp >= 25) return '#f97316'; // Laranja - quente
    if (temp >= 22) return '#eab308'; // Amarelo - moderado
    if (temp >= 18) return '#3b82f6'; // Azul - frio
    return '#1e40af'; // Azul escuro - muito frio
  };

  // Função para obter cor baseada em clorofila
  const getChlorophyllColor = (chlor: number): string => {
    if (chlor >= 3) return '#10b981'; // Verde escuro - alta
    if (chlor >= 2) return '#22c55e'; // Verde - média-alta
    if (chlor >= 1) return '#84cc16'; // Verde claro - média
    return '#e5e7eb'; // Cinza - baixa
  };

  // Função para obter cor baseada em risco
  const getRiskColor = (risk: number): string => {
    if (risk >= 70) return '#dc2626'; // Vermelho - crítico
    if (risk >= 50) return '#f97316'; // Laranja - alto
    if (risk >= 30) return '#eab308'; // Amarelo - médio
    return '#3b82f6'; // Azul - baixo
  };

  // Função para obter cor da zona
  const getZoneColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="h-[600px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--foreground-muted)]">Carregando dados oceanográficos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="h-[600px] flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-2">Erro: {error}</p>
            <p className="text-sm text-[var(--foreground-muted)]">Não foi possível carregar os dados oceanográficos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Centro do mapa - costa brasileira (centro geográfico)
  const center: [number, number] = [-14, -43];
  const zoom = 4; // Zoom menor para mostrar toda a costa

  return (
    <div className="space-y-4">

      {/* Mapa */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px] w-full rounded-lg overflow-hidden">
            <MapComponent
              center={center}
              zoom={zoom}
              theme={theme}
              data={data}
              zones={zones}
              activeLayer="zones"
              vesselStops={vesselStops}
              getTemperatureColor={getTemperatureColor}
              getChlorophyllColor={getChlorophyllColor}
              getRiskColor={getRiskColor}
              getZoneColor={getZoneColor}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumo das Zonas */}
      {zones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Resumo das Zonas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Total de Zonas</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {zones.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Zonas Críticas</p>
                <p className="text-lg font-semibold text-red-500">
                  {zones.filter(z => z.riskLevel === 'critical').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Zonas de Alto Risco</p>
                <p className="text-lg font-semibold text-orange-500">
                  {zones.filter(z => z.riskLevel === 'high').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-muted)]">Risco Médio Geral</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {Math.round(zones.reduce((acc, z) => acc + z.biofoulingRisk, 0) / zones.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zonas de Biofouling */}
      {zones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zonas de Risco de Biofouling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    zone.riskLevel === 'critical' && 'bg-red-500/10 border-red-500/30',
                    zone.riskLevel === 'high' && 'bg-orange-500/10 border-orange-500/30',
                    zone.riskLevel === 'medium' && 'bg-yellow-500/10 border-yellow-500/30',
                    zone.riskLevel === 'low' && 'bg-blue-500/10 border-blue-500/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[var(--foreground)]">{zone.name}</h4>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      zone.riskLevel === 'critical' && 'bg-red-500 text-white',
                      zone.riskLevel === 'high' && 'bg-orange-500 text-white',
                      zone.riskLevel === 'medium' && 'bg-yellow-500 text-white',
                      zone.riskLevel === 'low' && 'bg-blue-500 text-white'
                    )}>
                      {zone.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--foreground-muted)] text-xs">Temp. Média</p>
                      <p className="text-[var(--foreground)] font-medium">{zone.avgTemperature.toFixed(1)}°C</p>
                    </div>
                    <div>
                      <p className="text-[var(--foreground-muted)] text-xs">Clorofila</p>
                      <p className="text-[var(--foreground)] font-medium">{zone.avgChlorophyll.toFixed(2)} mg/m³</p>
                    </div>
                    <div>
                      <p className="text-[var(--foreground-muted)] text-xs">Biodiversidade</p>
                      <p className="text-[var(--foreground)] font-medium capitalize">{zone.biodiversity}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[var(--foreground-muted)] text-xs">Risco de Biofouling</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[var(--background-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${zone.biofoulingRisk}%`,
                            backgroundColor: getZoneColor(zone.riskLevel),
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {zone.biofoulingRisk.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

