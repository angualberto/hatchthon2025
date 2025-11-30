'use client';

import { MapContainer, TileLayer, Rectangle, LayersControl, Popup, Marker, CircleMarker } from 'react-leaflet';
import { useMemo } from 'react';
import L from 'leaflet';
import { cn } from '../../utils/helpers';
import 'leaflet/dist/leaflet.css';
import { HeatmapLayer } from './HeatmapLayer';

// Fix para ícones do Leaflet em Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

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

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  theme: 'dark' | 'light';
  data: OceanDataPoint[];
  zones: BiofoulingZone[];
  activeLayer: 'temperature' | 'chlorophyll' | 'risk' | 'zones';
  vesselStops?: VesselStop[];
  getTemperatureColor: (temp: number) => string;
  getChlorophyllColor: (chlor: number) => string;
  getRiskColor: (risk: number) => string;
  getZoneColor: (riskLevel: string) => string;
}

export default function MapComponent({
  center,
  zoom,
  theme,
  data,
  zones,
  activeLayer,
  vesselStops = [],
  getTemperatureColor,
  getChlorophyllColor,
  getRiskColor,
  getZoneColor,
}: MapComponentProps) {
  // Função para obter cor do marcador baseado no risco
  const getStopMarkerColor = (riskLevel?: string): string => {
    switch (riskLevel) {
      case 'critical': return '#dc2626'; // Vermelho
      case 'high': return '#f97316'; // Laranja
      case 'medium': return '#eab308'; // Amarelo
      case 'low': return '#3b82f6'; // Azul
      default: return '#6b7280'; // Cinza
    }
  };

  // Formatar duração
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Formatar data
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };
  // Preparar dados para heatmap baseado na camada ativa
  const heatmapData = useMemo(() => {
    if (activeLayer === 'zones') return [];

    const points: [number, number, number][] = [];

    data.forEach((point) => {
      let intensity = 0;
      let value = 0;

      if (activeLayer === 'temperature' && point.temperature) {
        value = point.temperature;
        // Normalizar temperatura (16-30°C) para intensidade (0-1)
        intensity = Math.max(0, Math.min(1, (value - 16) / 14));
      } else if (activeLayer === 'chlorophyll' && point.chlorophyll) {
        value = point.chlorophyll;
        // Normalizar clorofila (0-4 mg/m³) para intensidade (0-1)
        intensity = Math.max(0, Math.min(1, value / 4));
      } else if (activeLayer === 'risk' && point.biofoulingRisk) {
        value = point.biofoulingRisk;
        // Normalizar risco (0-100%) para intensidade (0-1)
        intensity = value / 100;
      }

      if (intensity > 0) {
        points.push([point.lat, point.lng, intensity]);
      }
    });

    return points;
  }, [data, activeLayer]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked={theme === 'dark'} name="🌙 Dark">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={theme === 'light'} name="☀️ Light">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="🛰️ Satellite">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        </LayersControl.BaseLayer>
      </LayersControl>

      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={theme === 'dark' 
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        }
      />

      {/* Renderizar zonas se ativo */}
      {activeLayer === 'zones' && zones.map((zone) => (
        <Rectangle
          key={zone.id}
          bounds={[
            [zone.bounds.minLat, zone.bounds.minLon],
            [zone.bounds.maxLat, zone.bounds.maxLon],
          ]}
          pathOptions={{
            color: getZoneColor(zone.riskLevel),
            fillColor: getZoneColor(zone.riskLevel),
            fillOpacity: 0.3,
            weight: 2,
          }}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-[var(--foreground)] mb-2">{zone.name}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Risco:</span>
                  <span className="font-medium text-[var(--foreground)]">{zone.biofoulingRisk.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Temp. Média:</span>
                  <span className="font-medium text-[var(--foreground)]">{zone.avgTemperature.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Clorofila:</span>
                  <span className="font-medium text-[var(--foreground)]">{zone.avgChlorophyll.toFixed(2)} mg/m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Biodiversidade:</span>
                  <span className="font-medium text-[var(--foreground)] capitalize">{zone.biodiversity}</span>
                </div>
              </div>
            </div>
          </Popup>
        </Rectangle>
      ))}

      {/* Renderizar marcadores de paradas das embarcações */}
      {vesselStops.length > 0 && vesselStops.map((vesselStop, idx) => {
        const color = getStopMarkerColor(vesselStop.riskLevel);
        return (
          <CircleMarker
            key={`stop-${vesselStop.vesselName}-${idx}`}
            center={[vesselStop.stop.lat, vesselStop.stop.lng]}
            radius={6}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h4 className="font-bold text-[var(--foreground)] mb-2">{vesselStop.vesselName}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Zona:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {vesselStop.zoneName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Início:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDate(vesselStop.stop.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Fim:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDate(vesselStop.stop.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Duração:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDuration(vesselStop.stop.durationMinutes)}
                    </span>
                  </div>
                  {vesselStop.temperature !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">Temperatura:</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {vesselStop.temperature.toFixed(1)}°C
                      </span>
                    </div>
                  )}
                  {vesselStop.chlorophyll !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">Clorofila:</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {vesselStop.chlorophyll.toFixed(2)} mg/m³
                      </span>
                    </div>
                  )}
                  {vesselStop.biofoulingRisk !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">Risco:</span>
                      <span className={cn(
                        'font-medium px-2 py-0.5 rounded',
                        vesselStop.riskLevel === 'critical' && 'bg-red-500 text-white',
                        vesselStop.riskLevel === 'high' && 'bg-orange-500 text-white',
                        vesselStop.riskLevel === 'medium' && 'bg-yellow-500 text-black',
                        vesselStop.riskLevel === 'low' && 'bg-blue-500 text-white',
                        !vesselStop.riskLevel && 'bg-gray-500 text-white'
                      )}>
                        {vesselStop.biofoulingRisk}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Renderizar heatmap para camadas de dados */}
      {activeLayer !== 'zones' && heatmapData.length > 0 && (
        <HeatmapLayer
          points={heatmapData}
          radius={30}
          blur={20}
          maxZoom={18}
          minOpacity={0.1}
          gradient={
            activeLayer === 'temperature'
              ? {
                  0.0: 'rgba(30, 64, 175, 0)',      // Azul escuro (frio)
                  0.3: 'rgba(59, 130, 246, 0.4)',   // Azul
                  0.5: 'rgba(34, 197, 94, 0.6)',     // Verde
                  0.7: 'rgba(234, 179, 8, 0.8)',    // Amarelo
                  0.9: 'rgba(249, 115, 22, 0.9)',   // Laranja
                  1.0: 'rgba(239, 68, 68, 1)',       // Vermelho (quente)
                }
              : activeLayer === 'chlorophyll'
              ? {
                  0.0: 'rgba(229, 231, 235, 0)',    // Cinza (baixa)
                  0.3: 'rgba(34, 197, 94, 0.4)',    // Verde claro
                  0.6: 'rgba(22, 163, 74, 0.7)',    // Verde médio
                  0.8: 'rgba(21, 128, 61, 0.9)',    // Verde escuro
                  1.0: 'rgba(20, 83, 45, 1)',       // Verde muito escuro (alta)
                }
              : {
                  0.0: 'rgba(59, 130, 246, 0)',     // Azul (baixo risco)
                  0.3: 'rgba(34, 197, 94, 0.4)',    // Verde
                  0.5: 'rgba(234, 179, 8, 0.6)',    // Amarelo
                  0.7: 'rgba(249, 115, 22, 0.8)',   // Laranja
                  1.0: 'rgba(239, 68, 68, 1)',      // Vermelho (alto risco)
                }
          }
        />
      )}
    </MapContainer>
  );
}

