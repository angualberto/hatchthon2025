import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface AISRecord {
  NOME: string;
  DATAHORA: string;
  RUMO: string;
  VELOCIDADE: string;
  LATITUDE: string;
  LONGITUDE: string;
}

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
}

interface VesselStop {
  vesselName: string;
  stop: StopPoint;
  zoneId?: string;
  zoneName?: string;
  temperature?: number;
  chlorophyll?: number;
  biofoulingRisk?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// Zonas geográficas da costa brasileira (mesmas do brazil-coast)
const BRAZIL_COAST_ZONES = [
  {
    id: 'norte-extremo',
    name: 'Norte - Amapá',
    bounds: { minLat: 0.0, maxLat: 5.0, minLon: -52.0, maxLon: -48.0 },
  },
  {
    id: 'norte-para',
    name: 'Norte - Pará',
    bounds: { minLat: -2.0, maxLat: 0.0, minLon: -50.0, maxLon: -47.0 },
  },
  {
    id: 'nordeste-maranhao',
    name: 'Nordeste - Maranhão',
    bounds: { minLat: -5.0, maxLat: -2.0, minLon: -45.0, maxLon: -42.0 },
  },
  {
    id: 'nordeste-piaui-ceara',
    name: 'Nordeste - Piauí e Ceará',
    bounds: { minLat: -7.0, maxLat: -3.0, minLon: -41.0, maxLon: -38.0 },
  },
  {
    id: 'nordeste-rn-pb-pe',
    name: 'Nordeste - RN, PB e PE',
    bounds: { minLat: -9.0, maxLat: -6.0, minLon: -38.0, maxLon: -34.5 },
  },
  {
    id: 'nordeste-al-se',
    name: 'Nordeste - Alagoas e Sergipe',
    bounds: { minLat: -11.5, maxLat: -9.0, minLon: -38.0, maxLon: -36.0 },
  },
  {
    id: 'nordeste-bahia',
    name: 'Nordeste - Bahia',
    bounds: { minLat: -18.0, maxLat: -11.5, minLon: -40.0, maxLon: -36.0 },
  },
  {
    id: 'sudeste-espirito-santo',
    name: 'Sudeste - Espírito Santo',
    bounds: { minLat: -21.0, maxLat: -18.0, minLon: -41.0, maxLon: -39.0 },
  },
  {
    id: 'sudeste-rio-janeiro',
    name: 'Sudeste - Rio de Janeiro',
    bounds: { minLat: -23.5, maxLat: -21.0, minLon: -45.0, maxLon: -41.0 },
  },
  {
    id: 'sudeste-sao-paulo',
    name: 'Sudeste - São Paulo',
    bounds: { minLat: -25.0, maxLat: -23.5, minLon: -48.0, maxLon: -45.0 },
  },
  {
    id: 'sul-parana',
    name: 'Sul - Paraná',
    bounds: { minLat: -26.5, maxLat: -25.0, minLon: -49.0, maxLon: -48.0 },
  },
  {
    id: 'sul-santa-catarina',
    name: 'Sul - Santa Catarina',
    bounds: { minLat: -29.0, maxLat: -26.5, minLon: -49.5, maxLon: -48.0 },
  },
  {
    id: 'sul-rio-grande-sul',
    name: 'Sul - Rio Grande do Sul',
    bounds: { minLat: -34.0, maxLat: -29.0, minLon: -52.0, maxLon: -49.5 },
  },
];

// Encontrar zona baseada em coordenadas
function findZone(lat: number, lng: number) {
  return BRAZIL_COAST_ZONES.find(zone => {
    return (
      lat >= zone.bounds.minLat &&
      lat <= zone.bounds.maxLat &&
      lng >= zone.bounds.minLon &&
      lng <= zone.bounds.maxLon
    );
  });
}

// Haversine formula to calculate distance between two points in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detect stops based on low speed or small movement
function detectStops(points: RoutePoint[], maxJumpKm: number = 0.5, minStopMinutes: number = 30, speedThreshold: number = 2.0): StopPoint[] {
  const stops: StopPoint[] = [];
  if (points.length < 2) return stops;

  const lowFlags: boolean[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);
    
    const t1 = new Date(a.timestamp).getTime();
    const t2 = new Date(b.timestamp).getTime();
    const dtMin = (t2 - t1) / (1000 * 60);
    
    const speed = dtMin > 0 ? (dist / (dtMin / 60)) : 0;
    const isLow = (dtMin >= minStopMinutes && dist <= maxJumpKm) || speed <= speedThreshold || a.speed <= speedThreshold;
    lowFlags.push(isLow);
  }

  let i = 0;
  while (i < lowFlags.length) {
    if (!lowFlags[i]) {
      i++;
      continue;
    }
    
    const startIdx = i;
    while (i + 1 < lowFlags.length && lowFlags[i + 1]) {
      i++;
    }
    const endIdx = Math.min(i + 1, points.length - 1);
    
    const stopPoints = points.slice(startIdx, endIdx + 1);
    const avgLat = stopPoints.reduce((acc, p) => acc + p.lat, 0) / stopPoints.length;
    const avgLng = stopPoints.reduce((acc, p) => acc + p.lng, 0) / stopPoints.length;
    
    const startTime = points[startIdx].timestamp;
    const endTime = points[endIdx].timestamp;
    const durationMinutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60);
    
    if (durationMinutes >= minStopMinutes) {
      stops.push({
        lat: avgLat,
        lng: avgLng,
        startTime,
        endTime,
        durationMinutes,
      });
    }
    
    i++;
  }

  return stops;
}

// Dados padrão baseados na região (fallback)
function getDefaultZoneData(zoneId: string) {
  // Valores baseados na latitude média da zona
  const zone = BRAZIL_COAST_ZONES.find(z => z.id === zoneId);
  if (!zone) {
    return { temperature: 22, chlorophyll: 1.0, biofoulingRisk: 30, riskLevel: 'medium' as const };
  }
  
  const midLat = (zone.bounds.minLat + zone.bounds.maxLat) / 2;
  
  // Temperatura varia de 18°C (sul) a 28°C (norte)
  const temperature = 18 + (midLat + 34) * 0.25;
  
  // Clorofila varia de 0.3 (sul) a 3.5 (norte)
  const chlorophyll = 0.3 + (midLat + 34) * 0.08;
  
  // Calcular risco baseado em temperatura e clorofila
  let biofoulingRisk = 0;
  if (temperature >= 25) biofoulingRisk += 50;
  else if (temperature >= 22) biofoulingRisk += 30;
  else biofoulingRisk += 10;
  
  if (chlorophyll >= 2) biofoulingRisk += 30;
  else if (chlorophyll >= 1) biofoulingRisk += 15;
  else biofoulingRisk += 5;
  
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    biofoulingRisk >= 70 ? 'critical' :
    biofoulingRisk >= 50 ? 'high' :
    biofoulingRisk >= 30 ? 'medium' : 'low';
  
  return {
    temperature: Math.round(temperature * 10) / 10,
    chlorophyll: Math.round(chlorophyll * 100) / 100,
    biofoulingRisk: Math.min(100, Math.round(biofoulingRisk)),
    riskLevel,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselNames = searchParams.get('vessels')?.split(',') || [];
    
    if (vesselNames.length === 0) {
      return NextResponse.json({
        success: true,
        stops: [],
        summary: {
          totalStops: 0,
          avgTemperature: 0,
          avgChlorophyll: 0,
          avgBiofoulingRisk: 0,
          zonesVisited: [],
        },
      });
    }
    
    // Ler arquivos AIS diretamente (mesma lógica da API de rotas)
    const aisDataPath = path.join(process.cwd(), '..', 'Dados AIS frota TP');
    
    try {
      await fs.access(aisDataPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'AIS data folder not found' },
        { status: 404 }
      );
    }
    
    const files = await fs.readdir(aisDataPath);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    // Filtrar arquivos das embarcações selecionadas
    const filesToProcess = vesselNames.length > 0
      ? csvFiles.filter(f => 
          vesselNames.some(vessel => 
            f.toLowerCase().includes(vessel.toLowerCase())
          )
        )
      : csvFiles;
    
    // Coletar todas as paradas
    const vesselStops: VesselStop[] = [];
    const zoneDataCache: { [key: string]: any } = {};
    
    for (const file of filesToProcess) {
      try {
        const filePath = path.join(aisDataPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        const parseResult = Papa.parse<AISRecord>(fileContent, {
          header: true,
          skipEmptyLines: true,
        });
        
        if (!parseResult.data || parseResult.data.length === 0) continue;
        
        // Converter para RoutePoint
        const points: RoutePoint[] = parseResult.data
          .map(r => ({
            lat: parseFloat(r.LATITUDE),
            lng: parseFloat(r.LONGITUDE),
            timestamp: r.DATAHORA,
            speed: parseFloat(r.VELOCIDADE) || 0,
            heading: parseFloat(r.RUMO) || 0,
          }))
          .filter(p => !isNaN(p.lat) && !isNaN(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        if (points.length === 0) continue;
        
        // Detectar paradas
        const stops = detectStops(points);
        
        const vesselName = file.replace('.csv', '');
        
        // Para cada parada, encontrar a zona e buscar dados oceanográficos
        for (const stop of stops) {
          const zone = findZone(stop.lat, stop.lng);
          
          if (zone) {
            // Verificar cache primeiro
            if (!zoneDataCache[zone.id]) {
              zoneDataCache[zone.id] = getDefaultZoneData(zone.id);
            }
            
            const oceanData = zoneDataCache[zone.id];
            
            vesselStops.push({
              vesselName,
              stop,
              zoneId: zone.id,
              zoneName: zone.name,
              ...oceanData,
            });
          } else {
            // Parada fora das zonas conhecidas
            vesselStops.push({
              vesselName,
              stop,
              temperature: 22,
              chlorophyll: 1.0,
              biofoulingRisk: 30,
              riskLevel: 'medium',
            });
          }
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
    
    // Calcular estatísticas agregadas
    const totalStops = vesselStops.length;
    const temps = vesselStops.map(s => s.temperature || 0).filter(t => t > 0);
    const chlors = vesselStops.map(s => s.chlorophyll || 0).filter(c => c > 0);
    const risks = vesselStops.map(s => s.biofoulingRisk || 0).filter(r => r > 0);
    
    const avgTemperature = temps.length > 0 
      ? temps.reduce((a, b) => a + b, 0) / temps.length 
      : 0;
    
    const avgChlorophyll = chlors.length > 0
      ? chlors.reduce((a, b) => a + b, 0) / chlors.length
      : 0;
    
    const avgBiofoulingRisk = risks.length > 0
      ? risks.reduce((a, b) => a + b, 0) / risks.length
      : 0;
    
    // Zonas visitadas (contagem)
    const zoneVisits: { [key: string]: { name: string; count: number } } = {};
    vesselStops.forEach(stop => {
      if (stop.zoneId && stop.zoneName) {
        if (!zoneVisits[stop.zoneId]) {
          zoneVisits[stop.zoneId] = { name: stop.zoneName, count: 0 };
        }
        zoneVisits[stop.zoneId].count++;
      }
    });
    
    return NextResponse.json({
      success: true,
      stops: vesselStops,
      summary: {
        totalStops,
        avgTemperature: Math.round(avgTemperature * 10) / 10,
        avgChlorophyll: Math.round(avgChlorophyll * 100) / 100,
        avgBiofoulingRisk: Math.round(avgBiofoulingRisk),
        zonesVisited: Object.entries(zoneVisits).map(([id, data]) => ({
          zoneId: id,
          zoneName: data.name,
          visitCount: data.count,
        })),
      },
    });
    
  } catch (error: any) {
    console.error('Error fetching vessel stops:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vessel stops' },
      { status: 500 }
    );
  }
}

