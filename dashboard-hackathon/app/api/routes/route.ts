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

interface StopPoint {
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

// Haversine formula to calculate distance between two points in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const hav = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(hav));
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
    
    // Speed in km/h
    const speed = dtMin > 0 ? (dist / (dtMin / 60)) : 0;
    
    // Mark as low movement if stopped for a while or moving very slowly
    const isLow = (dtMin >= minStopMinutes && dist <= maxJumpKm) || speed <= speedThreshold || a.speed <= speedThreshold;
    lowFlags.push(isLow);
  }

  // Group consecutive low flags into stops
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
    
    // Calculate centroid and duration
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

// Split route into segments when there are large jumps
function splitIntoSegments(points: RoutePoint[], maxJumpKm: number = 100): RoutePoint[][] {
  if (points.length < 2) return [points];
  
  const segments: RoutePoint[][] = [];
  let currentSegment: RoutePoint[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
    
    if (dist <= maxJumpKm) {
      currentSegment.push(curr);
    } else {
      // Large jump detected, start new segment
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [curr];
    }
  }
  
  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }
  
  return segments;
}

// GET - Fetch vessel routes from AIS CSV files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselFilter = searchParams.get('vessel');
    const limit = parseInt(searchParams.get('limit') || '2000');
    const simplify = searchParams.get('simplify') !== 'false';
    
    // Path to AIS data folder
    const aisDataPath = path.join(process.cwd(), '..', 'Dados AIS frota TP');
    
    // Check if folder exists
    try {
      await fs.access(aisDataPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'AIS data folder not found' },
        { status: 404 }
      );
    }
    
    // List all CSV files
    const files = await fs.readdir(aisDataPath);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    // Filter by vessel if specified
    const filesToProcess = vesselFilter
      ? csvFiles.filter(f => f.toLowerCase().includes(vesselFilter.toLowerCase()))
      : csvFiles;
    
    const routes: VesselRoute[] = [];
    
    for (const file of filesToProcess) {
      try {
        const filePath = path.join(aisDataPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        const parsed = Papa.parse<AISRecord>(fileContent, {
          header: true,
          skipEmptyLines: true,
        });
        
        // Filter and transform data
        let points: RoutePoint[] = parsed.data
          .filter(r => r.LATITUDE && r.LONGITUDE && r.DATAHORA)
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
        
        // Simplify route if needed (take every Nth point)
        if (simplify && points.length > limit) {
          const step = Math.ceil(points.length / limit);
          const simplified: RoutePoint[] = [];
          
          // Always include first point
          simplified.push(points[0]);
          
          for (let i = step; i < points.length - 1; i += step) {
            simplified.push(points[i]);
          }
          
          // Always include last point
          simplified.push(points[points.length - 1]);
          
          points = simplified;
        }
        
        // Split into segments to avoid long lines across the map
        const segments = splitIntoSegments(points);
        
        // Detect stops
        const stops = detectStops(points);
        
        // Calculate summary statistics
        const speeds = points.filter(p => p.speed > 0).map(p => p.speed);
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
        const totalStopHours = stops.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
        
        const vesselName = file.replace('.csv', '');
        
        routes.push({
          vesselName,
          points,
          segments,
          stops,
          summary: {
            totalPoints: points.length,
            startDate: points[0].timestamp,
            endDate: points[points.length - 1].timestamp,
            startPosition: { lat: points[0].lat, lng: points[0].lng },
            endPosition: { lat: points[points.length - 1].lat, lng: points[points.length - 1].lng },
            avgSpeed: parseFloat(avgSpeed.toFixed(2)),
            maxSpeed: parseFloat(maxSpeed.toFixed(2)),
            totalStops: stops.length,
            totalStopHours: parseFloat(totalStopHours.toFixed(2)),
          },
        });
        
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
    
    // Sort by vessel name
    routes.sort((a, b) => a.vesselName.localeCompare(b.vesselName));
    
    // Calculate bounds for the map
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    routes.forEach(route => {
      route.points.forEach(p => {
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
      });
    });
    
    return NextResponse.json({
      success: true,
      totalVessels: routes.length,
      availableVessels: csvFiles.map(f => f.replace('.csv', '')),
      bounds: {
        center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
        southwest: { lat: minLat, lng: minLng },
        northeast: { lat: maxLat, lng: maxLng },
      },
      routes,
    });
    
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vessel routes' },
      { status: 500 }
    );
  }
}

