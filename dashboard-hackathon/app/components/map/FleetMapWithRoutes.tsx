'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap, LayersControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/app/utils/helpers';

// Types
interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  heading: number;
}

interface StopPoint {
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  climateData?: {
    temperature?: number;
    humidity?: number;
    precipitation?: number;
    pressure?: number;
    windSpeed?: number;
    windDirection?: number;
    waveHeight?: number;
    waveDirection?: number;
    currentSpeed?: number;
    currentDirection?: number;
  };
  oceanographyData?: {
    salinity?: number;
    pH?: number;
    dissolvedOxygen?: number;
    turbidity?: number;
    waterDensity?: number;
  };
  region?: string;
}

interface VesselRoute {
  vesselName: string;
  points: RoutePoint[];
  segments: RoutePoint[][];
  stops: StopPoint[];
  summary: {
    totalPoints: number;
    startDate: string;
    endDate: string;
    startPosition: { lat: number; lng: number };
    endPosition: { lat: number; lng: number };
    avgSpeed: number;
    maxSpeed: number;
    totalStops: number;
    totalStopHours: number;
  };
}

interface RoutesResponse {
  success: boolean;
  totalVessels: number;
  availableVessels: string[];
  bounds: {
    center: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
  routes: VesselRoute[];
}

// Color palette for vessels
const VESSEL_COLORS = [
  '#e63946', '#1d3557', '#2a9d8f', '#9b5de5', '#f77f00',
  '#d62828', '#457b9d', '#264653', '#e9c46a', '#00b4d8',
  '#ff006e', '#8338ec', '#3a86ff', '#06d6a0', '#ef476f',
  '#ffd166', '#118ab2', '#073b4c', '#ff9f1c', '#2ec4b6'
];

// Major Brazilian ports with coordinates
const MAJOR_PORTS = [
  { name: 'Santos', lat: -23.9618, lng: -46.3322, state: 'SP' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, state: 'RJ' },
  { name: 'Paranaguá', lat: -25.5163, lng: -48.5225, state: 'PR' },
  { name: 'São Luís', lat: -2.5307, lng: -44.2963, state: 'MA' },
  { name: 'Salvador', lat: -12.9714, lng: -38.5014, state: 'BA' },
  { name: 'Vitória', lat: -20.3155, lng: -40.3128, state: 'ES' },
  { name: 'Recife', lat: -8.0476, lng: -34.8770, state: 'PE' },
  { name: 'Fortaleza', lat: -3.7172, lng: -38.5433, state: 'CE' },
  { name: 'Belém', lat: -1.4558, lng: -48.4902, state: 'PA' },
  { name: 'Manaus', lat: -3.1190, lng: -60.0217, state: 'AM' },
  { name: 'Itaqui', lat: -2.5761, lng: -44.3728, state: 'MA' },
  { name: 'Suape', lat: -8.3833, lng: -34.9500, state: 'PE' },
  { name: 'Angra dos Reis', lat: -23.0067, lng: -44.3181, state: 'RJ' },
  { name: 'São Sebastião', lat: -23.8103, lng: -45.4097, state: 'SP' },
];

// Custom icons
const createStartIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #10b981, #059669);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const createEndIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 3px 10px rgba(239, 68, 68, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="6" width="12" height="12"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const createPortIcon = () => L.divIcon({
  className: 'port-marker',
  html: `<div style="
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #008140, #006633);
    border: 3px solid white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 129, 64, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Map bounds updater component
function MapBoundsUpdater({ bounds }: { bounds: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds([
        [bounds.southwest.lat, bounds.southwest.lng],
        [bounds.northeast.lat, bounds.northeast.lng]
      ], { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

// Heatmap layer component
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);
  const [heatLoaded, setHeatLoaded] = useState(false);

  // Load leaflet.heat dynamically
  useEffect(() => {
    const loadHeat = async () => {
      try {
        await import('leaflet.heat');
        setHeatLoaded(true);
      } catch (err) {
        console.error('Failed to load leaflet.heat:', err);
      }
    };
    loadHeat();
  }, []);

  useEffect(() => {
    // Remove existing layer if any
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!heatLoaded || points.length === 0) return;

    try {
      // @ts-expect-error - leaflet.heat adds heatLayer to L
      const heatLayer = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 12,
        max: 1.0,
        minOpacity: 0.5,
        gradient: {
          0.0: '#008140',
          0.25: '#00a550',
          0.5: '#F5C22E',
          0.75: '#f97316',
          1.0: '#ef4444'
        }
      });

      heatLayer.addTo(map);
      heatLayerRef.current = heatLayer;
    } catch (err) {
      console.error('Error creating heatmap:', err);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, heatLoaded]);

  return null;
}

interface FleetMapWithRoutesProps {
  selectedVessels: string[];
  showStops: boolean;
  showHeatmap?: boolean;
  showPorts?: boolean;
  colorBySpeed?: boolean;
  selectionMode?: 'OR' | 'AND';
  mapTheme?: 'dark' | 'light';
  onVesselSelect?: (vesselName: string) => void;
}

export default function FleetMapWithRoutes({ 
  selectedVessels, 
  showStops, 
  showHeatmap = false,
  showPorts = true,
  colorBySpeed = false,
  selectionMode = 'OR',
  mapTheme = 'dark',
  onVesselSelect 
}: FleetMapWithRoutesProps) {
  const [routesData, setRoutesData] = useState<RoutesResponse | null>(null);
  const [climateStops, setClimateStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch routes data and climate stops data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch routes
        const routesResponse = await fetch('/api/routes?limit=1500');
        const routesData = await routesResponse.json();
        
        // Fetch climate stops data
        const climateResponse = await fetch('/api/monitoring/climate-stops');
        const climateData = await climateResponse.json();
        
        if (routesData.success) {
          // Enriquecer paradas com dados climáticos
          if (climateData.success && climateData.stops) {
            const enrichedRoutes = routesData.routes.map((route: VesselRoute) => {
              const enrichedStops = route.stops.map((stop: StopPoint) => {
                // Procurar dados climáticos correspondentes (mesmo navio, coordenadas próximas)
                // Usar distância haversine para melhor precisão
                const matchingClimate = climateData.stops
                  .filter((cs: any) => {
                    if (!cs.vesselName || !route.vesselName) return false;
                    // Comparação flexível de nomes (pode haver diferenças de formatação)
                    const vesselMatch = cs.vesselName.toLowerCase().includes(route.vesselName.toLowerCase()) ||
                                      route.vesselName.toLowerCase().includes(cs.vesselName.toLowerCase());
                    if (!vesselMatch) return false;
                    
                    // Verificar se coordenadas estão próximas (dentro de ~5km = ~0.045 graus)
                    const latDiff = Math.abs(cs.stop.lat - stop.lat);
                    const lngDiff = Math.abs(cs.stop.lng - stop.lng);
                    if (latDiff > 0.045 || lngDiff > 0.045) return false;
                    
                    return true;
                  })
                  .map((cs: any) => {
                    // Calcular distância e diferença de tempo para escolher o melhor match
                    const latDiff = Math.abs(cs.stop.lat - stop.lat);
                    const lngDiff = Math.abs(cs.stop.lng - stop.lng);
                    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
                    
                    let timeDiff = Infinity;
                    try {
                      const stopTime = new Date(stop.startTime).getTime();
                      const climateTime = new Date(cs.timestamp || cs.stop.startTime).getTime();
                      timeDiff = Math.abs(stopTime - climateTime) / (1000 * 60); // minutos
                    } catch (e) {
                      // Ignorar erros de parsing de data
                    }
                    
                    return { ...cs, distance, timeDiff };
                  })
                  .sort((a: any, b: any) => {
                    // Ordenar por distância primeiro, depois por diferença de tempo
                    if (Math.abs(a.distance - b.distance) > 0.001) {
                      return a.distance - b.distance;
                    }
                    return a.timeDiff - b.timeDiff;
                  })[0]; // Pegar o melhor match
                
                if (matchingClimate && matchingClimate.distance < 0.045) {
                  return {
                    ...stop,
                    climateData: matchingClimate.climate,
                    oceanographyData: matchingClimate.oceanography,
                    region: matchingClimate.region,
                  };
                }
                
                return stop;
              });
              
              return {
                ...route,
                stops: enrichedStops,
              };
            });
            
            routesData.routes = enrichedRoutes;
          }
          
          setRoutesData(routesData);
          setClimateStops(climateData.success ? climateData.stops : []);
          setError(null);
        } else {
          setError(routesData.error || 'Failed to load routes');
        }
      } catch (err) {
        setError('Failed to connect to API');
        console.error('Error fetching routes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter routes based on selection (empty = no ships shown)
  const filteredRoutes = useMemo(() => {
    if (!routesData?.routes) return [];
    if (selectedVessels.length === 0) return []; // No ships selected = show nothing
    return routesData.routes.filter(r => selectedVessels.includes(r.vesselName));
  }, [routesData, selectedVessels]);

  // Get color for a vessel
  const getVesselColor = (vesselName: string) => {
    const index = routesData?.availableVessels.indexOf(vesselName) || 0;
    return VESSEL_COLORS[index % VESSEL_COLORS.length];
  };

  // Get color based on speed
  const getSpeedColor = (speed: number) => {
    if (speed < 5) return '#ef4444'; // Red - very slow
    if (speed < 8) return '#f97316'; // Orange - slow
    if (speed < 10) return '#eab308'; // Yellow - moderate
    if (speed < 12) return '#22c55e'; // Green - good
    return '#06b6d4'; // Cyan - fast
  };

  // Prepare heatmap data from all stops
  const heatmapData = useMemo(() => {
    if (!showHeatmap) return [];
    
    const points: [number, number, number][] = [];
    filteredRoutes.forEach(route => {
      route.stops.forEach(stop => {
        // Intensity based on duration (longer stop = higher intensity)
        // Minimum intensity of 0.3 to ensure visibility, max at 12 hours
        const baseIntensity = Math.min(1, stop.durationMinutes / (12 * 60));
        const intensity = 0.3 + (baseIntensity * 0.7); // Range: 0.3 to 1.0
        points.push([stop.lat, stop.lng, intensity]);
      });
    });
    
    console.log(`Heatmap: ${points.length} points from ${filteredRoutes.length} vessels`);
    return points;
  }, [filteredRoutes, showHeatmap]);

  // Calculate total statistics
  const totalStats = useMemo(() => {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalStops = 0;
    let totalStopHours = 0;

    filteredRoutes.forEach(route => {
      // Calculate distance from points
      for (let i = 1; i < route.points.length; i++) {
        const p1 = route.points[i - 1];
        const p2 = route.points[i];
        const dist = Math.sqrt(
          Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2)
        ) * 111 * 0.539957; // Convert to nautical miles
        totalDistance += dist;
      }
      
      totalStops += route.summary.totalStops;
      totalStopHours += route.summary.totalStopHours;
    });

    return {
      totalDistance: Math.round(totalDistance),
      totalStops,
      totalStopHours: Math.round(totalStopHours),
    };
  }, [filteredRoutes]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--background-card)]/50 rounded-xl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Carregando rotas AIS...</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-1">Processando dados de 20 embarcações</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--background-card)]/50 rounded-xl">
        <div className="text-center">
          <p className="text-red-400 mb-2">❌ {error}</p>
          <p className="text-xs text-[var(--foreground-muted)]">Verifique se os arquivos CSV estão na pasta correta</p>
        </div>
      </div>
    );
  }

  const center = routesData?.bounds?.center || { lat: -15, lng: -45 };

  return (
    <div className="relative h-full w-full">
      {/* Stats overlay */}
      <div className="absolute top-4 left-4 z-[1000] bg-[var(--background-card)]/90 backdrop-blur-sm rounded-xl border border-[var(--border)] p-3 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[var(--foreground-muted)]">Embarcações:</span>
          <span className="text-[var(--foreground)] font-semibold">{filteredRoutes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--foreground-muted)]">Paradas:</span>
          <span className="text-blue-500 font-semibold">{totalStats.totalStops}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--foreground-muted)]">Tempo parado:</span>
          <span className="text-[var(--color-secondary)] font-semibold">{totalStats.totalStopHours}h</span>
        </div>
      </div>

      {/* Empty state overlay */}
      {selectedVessels.length === 0 && !loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-[#008140]/30 p-6 text-center max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#008140]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#008140]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#F7F7F7] mb-2">Selecione embarcações</h3>
            <p className="text-sm text-slate-400">
              {selectionMode === 'OR' 
                ? 'Selecione uma embarcação no painel à direita para visualizar sua rota no mapa.'
                : 'Selecione uma ou mais embarcações no painel à direita para visualizar suas rotas no mapa.'}
            </p>
          </div>
        </div>
      )}

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={4}
        style={{ height: '100%', width: '100%', borderRadius: '0 0 16px 16px' }}
        className="z-0"
      >
        <LayersControl position="topright">
          {/* Base layers */}
          <LayersControl.BaseLayer checked={mapTheme === 'dark'} name="🌙 Dark">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked={mapTheme === 'light'} name="☀️ Light">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🛰️ Satellite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🌊 Ocean">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🗺️ Standard">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
        </LayersControl>

        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={mapTheme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />
        
        {routesData?.bounds && <MapBoundsUpdater bounds={routesData.bounds} />}
        
        {/* Heatmap layer */}
        {showHeatmap && heatmapData.length > 0 && (
          <HeatmapLayer points={heatmapData} />
        )}

        {/* Port markers */}
        {showPorts && MAJOR_PORTS.map((port) => {
          return (
            <Marker
              key={port.name}
              position={[port.lat, port.lng]}
              icon={createPortIcon()}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚓</span>
                    <div>
                      <h3 className="font-bold text-[var(--foreground)]">{port.name}</h3>
                      <p className="text-xs text-[var(--foreground-muted)]">{port.state}</p>
                    </div>
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -20]}>
                <span className="font-medium">{port.name}</span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Render routes */}
        {filteredRoutes.map((route) => {
          const baseColor = getVesselColor(route.vesselName);
          
          return (
            <div key={route.vesselName}>
              {/* Route segments as polylines */}
              {colorBySpeed ? (
                // Speed-colored segments
                route.points.slice(0, -1).map((point, idx) => {
                  const nextPoint = route.points[idx + 1];
                  if (!nextPoint) return null;
                  
                  const avgSpeed = (point.speed + nextPoint.speed) / 2;
                  const color = getSpeedColor(avgSpeed);
                  
                  return (
                    <Polyline
                      key={`${route.vesselName}-speed-${idx}`}
                      positions={[[point.lat, point.lng], [nextPoint.lat, nextPoint.lng]]}
                      color={color}
                      weight={3}
                      opacity={0.8}
                    />
                  );
                })
              ) : (
                // Normal vessel-colored segments
                route.segments.map((segment, segIdx) => (
                  <Polyline
                    key={`${route.vesselName}-seg-${segIdx}`}
                    positions={segment.map(p => [p.lat, p.lng] as [number, number])}
                    color={baseColor}
                    weight={3}
                    opacity={0.8}
                    eventHandlers={{
                      click: () => onVesselSelect?.(route.vesselName),
                    }}
                  >
                    <Popup>
                      <div className="p-3 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: baseColor }}
                          />
                          <h3 className="font-bold text-[var(--foreground)]">🚢 {route.vesselName}</h3>
                        </div>
                        <div className="bg-[var(--background-secondary)] rounded-lg p-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[var(--foreground-muted)]">Pontos:</span>
                            <span className="font-medium text-[var(--foreground)]">{route.summary.totalPoints}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--foreground-muted)]">Vel. Média:</span>
                            <span className="font-medium text-[var(--foreground)]">{route.summary.avgSpeed} nós</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--foreground-muted)]">Vel. Máx:</span>
                            <span className="font-medium text-[var(--foreground)]">{route.summary.maxSpeed} nós</span>
                          </div>
                          <div className="flex justify-between border-t border-[var(--border)] pt-1 mt-1">
                            <span className="text-[var(--foreground-muted)]">Paradas:</span>
                            <span className="font-bold text-blue-500">{route.summary.totalStops}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--foreground-muted)]">Tempo parado:</span>
                            <span className="font-bold text-[var(--color-secondary)]">{route.summary.totalStopHours.toFixed(1)}h</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-[var(--foreground-muted)]">
                          📅 {route.summary.startDate?.split(' ')[0]} → {route.summary.endDate?.split(' ')[0]}
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                ))
              )}

              {/* Start marker */}
              <Marker
                position={[route.summary.startPosition.lat, route.summary.startPosition.lng]}
                icon={createStartIcon()}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-[var(--color-primary)]">▶ INÍCIO - {route.vesselName}</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">{route.summary.startDate}</p>
                  </div>
                </Popup>
              </Marker>

              {/* End marker */}
              <Marker
                position={[route.summary.endPosition.lat, route.summary.endPosition.lng]}
                icon={createEndIcon()}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-red-500">■ FIM - {route.vesselName}</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">{route.summary.endDate}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Stops */}
              {showStops && route.stops.map((stop, stopIdx) => {
                const durationHours = stop.durationMinutes / 60;
                const baseRadius = 10;
                const radius = Math.min(baseRadius + durationHours * 0.3, 18);
                
                const isLongStop = durationHours > 24;
                const isMediumStop = durationHours > 6;
                
                return (
                  <CircleMarker
                    key={`${route.vesselName}-stop-${stopIdx}`}
                    center={[stop.lat, stop.lng]}
                    radius={radius}
                    fillColor={isLongStop ? '#dc2626' : isMediumStop ? '#f59e0b' : '#3b82f6'}
                    fillOpacity={0.85}
                    color={isLongStop ? '#991b1b' : isMediumStop ? '#d97706' : '#1d4ed8'}
                    weight={3}
                  >
                    <Popup>
                      <div className="p-3 min-w-[280px] max-w-[350px]">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">⚓</span>
                          <div>
                            <h3 className="font-bold text-[var(--foreground)]">PARADA DETECTADA</h3>
                            <p className="text-sm font-medium text-blue-500">{route.vesselName}</p>
                            {stop.region && (
                              <p className="text-xs text-[var(--foreground-muted)]">🌊 {stop.region}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Informações básicas da parada */}
                        <div className="bg-[var(--background-secondary)] rounded-lg p-2 space-y-1 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--foreground-muted)]">Início:</span>
                            <span className="font-medium text-[var(--foreground)]">{stop.startTime}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--foreground-muted)]">Fim:</span>
                            <span className="font-medium text-[var(--foreground)]">{stop.endTime}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-[var(--border)] pt-1 mt-1">
                            <span className="text-[var(--foreground-muted)]">Duração:</span>
                            <span className={cn(
                              'font-bold',
                              isLongStop ? 'text-red-600' : isMediumStop ? 'text-amber-600' : 'text-blue-600'
                            )}>
                              {durationHours.toFixed(1)} horas
                            </span>
                          </div>
                        </div>

                        {/* Dados climáticos */}
                        {stop.climateData && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mb-2">
                            <h4 className="text-xs font-semibold text-blue-400 mb-2">🌡️ DADOS CLIMÁTICOS</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {stop.climateData.temperature !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Temp. Água:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.climateData.temperature.toFixed(1)}°C</span>
                                </div>
                              )}
                              {stop.climateData.humidity !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Umidade:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.climateData.humidity}%</span>
                                </div>
                              )}
                              {stop.climateData.pressure !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Pressão:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.climateData.pressure} hPa</span>
                                </div>
                              )}
                              {stop.climateData.windSpeed !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Vento:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.climateData.windSpeed} m/s</span>
                                </div>
                              )}
                              {stop.climateData.waveHeight !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Ondas:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.climateData.waveHeight}m</span>
                                </div>
                              )}
                              {stop.climateData.currentSpeed !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Corrente:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.climateData.currentSpeed} m/s</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dados oceanográficos */}
                        {stop.oceanographyData && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                            <h4 className="text-xs font-semibold text-green-400 mb-2">🌊 DADOS OCEANOGRÁFICOS</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {stop.oceanographyData.salinity !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Salinidade:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.oceanographyData.salinity} PSU</span>
                                </div>
                              )}
                              {stop.oceanographyData.pH !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">pH:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.oceanographyData.pH}</span>
                                </div>
                              )}
                              {stop.oceanographyData.dissolvedOxygen !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">O₂ Dissolvido:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.oceanographyData.dissolvedOxygen} mg/L</span>
                                </div>
                              )}
                              {stop.oceanographyData.turbidity !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Turbidez:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.oceanographyData.turbidity} NTU</span>
                                </div>
                              )}
                              {stop.oceanographyData.waterDensity !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--foreground-muted)]">Densidade:</span>
                                  <span className="font-medium text-[var(--foreground)]">{stop.oceanographyData.waterDensity} kg/m³</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-[var(--foreground-muted)]">
                          📍 {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                        </div>
                        {isLongStop && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
                            ⚠️ Parada longa - Alto risco de biofouling!
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </div>
          );
        })}
      </MapContainer>

      {/* Speed legend (when color by speed is enabled) */}
      {colorBySpeed && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-[var(--background-card)]/90 backdrop-blur-sm rounded-xl border border-[var(--border)] p-3 text-xs">
          <p className="text-[var(--foreground-muted)] mb-2 font-medium">Velocidade (nós)</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-[#06b6d4]" />
              <span className="text-[var(--foreground-secondary)]">&gt;12 (Rápido)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-[#22c55e]" />
              <span className="text-[var(--foreground-secondary)]">10-12 (Bom)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-[#eab308]" />
              <span className="text-[var(--foreground-secondary)]">8-10 (Moderado)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-[#f97316]" />
              <span className="text-[var(--foreground-secondary)]">5-8 (Lento)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-[#ef4444]" />
              <span className="text-[var(--foreground-secondary)]">&lt;5 (Muito lento)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
