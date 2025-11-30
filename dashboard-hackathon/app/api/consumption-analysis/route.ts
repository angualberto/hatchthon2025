import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Types for the data
interface ConsumoRecord {
  SESSION_ID: string;
  CONSUMED_QUANTITY: string;
  DESCRIPTION: string;
}

interface EventoRecord {
  sessionId: string;
  shipName: string;
  class: string;
  eventName: string;
  startGMTDate: string;
  endGMTDate: string;
  duration: string;
  distance: string;
  speed: string;
  speedGps: string;
  Porto: string;
  decLatitude: string;
  decLongitude: string;
  beaufortScale: string;
  seaCondition: string;
  displacement: string;
  midDraft: string;
  TRIM: string;
}

interface CombinedSession {
  sessionId: string;
  shipName: string;
  shipClass: string;
  eventName: string;
  startDate: string;
  endDate: string;
  duration: number; // hours
  distance: number; // nautical miles
  speed: number;
  speedGps: number;
  port: string | null;
  latitude: number | null;
  longitude: number | null;
  beaufortScale: number | null;
  seaCondition: string | null;
  displacement: number | null;
  midDraft: number | null;
  trim: number | null;
  consumption: {
    total: number; // tons
    byFuelType: { [fuelType: string]: number };
  };
  // Calculated metrics
  fuelEfficiency: number | null; // tons per nautical mile
  fuelPerHour: number | null; // tons per hour
}

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
  avgFuelEfficiency: number; // tons per 100 nm
  avgFuelPerHour: number;
  consumptionByFuelType: { [fuelType: string]: number };
  consumptionByEvent: { [eventType: string]: number };
  // Biofouling indicators
  speedTrend: 'improving' | 'stable' | 'degrading';
  efficiencyTrend: 'improving' | 'stable' | 'degrading';
  sessions: CombinedSession[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipFilter = searchParams.get('ship');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 5000;

    // Read files
    const dataPath = path.join(process.cwd(), '..', 'data');
    const consumoPath = path.join(dataPath, 'ResultadoQueryConsumo.csv');
    const eventosPath = path.join(dataPath, 'ResultadoQueryEventos.csv');

    if (!fs.existsSync(consumoPath) || !fs.existsSync(eventosPath)) {
      return NextResponse.json({
        success: false,
        error: 'Data files not found',
        paths: { consumoPath, eventosPath }
      }, { status: 404 });
    }

    // Parse CSV files
    const consumoContent = fs.readFileSync(consumoPath, 'utf-8');
    const eventosContent = fs.readFileSync(eventosPath, 'utf-8');

    const consumoResult = Papa.parse<ConsumoRecord>(consumoContent, {
      header: true,
      skipEmptyLines: true,
    });

    const eventosResult = Papa.parse<EventoRecord>(eventosContent, {
      header: true,
      skipEmptyLines: true,
    });

    // Create consumption lookup by SESSION_ID
    const consumoBySession: { [sessionId: string]: { total: number; byFuelType: { [key: string]: number } } } = {};
    
    consumoResult.data.forEach((record) => {
      const sessionId = record.SESSION_ID?.trim();
      const quantity = parseFloat(record.CONSUMED_QUANTITY) || 0;
      const fuelType = record.DESCRIPTION?.trim() || 'Unknown';

      if (!sessionId) return;

      if (!consumoBySession[sessionId]) {
        consumoBySession[sessionId] = { total: 0, byFuelType: {} };
      }

      consumoBySession[sessionId].total += quantity;
      consumoBySession[sessionId].byFuelType[fuelType] = 
        (consumoBySession[sessionId].byFuelType[fuelType] || 0) + quantity;
    });

    // Combine with events
    const combinedSessions: CombinedSession[] = [];
    let processedCount = 0;

    for (const evento of eventosResult.data) {
      if (processedCount >= limit) break;

      const sessionId = evento.sessionId?.trim();
      if (!sessionId) continue;

      const shipName = evento.shipName?.trim();
      if (shipFilter && shipName !== shipFilter) continue;

      const duration = parseFloat(evento.duration) || 0;
      const distance = parseFloat(evento.distance) || 0;
      const speed = parseFloat(evento.speed) || 0;
      const speedGps = parseFloat(evento.speedGps) || 0;
      
      const consumption = consumoBySession[sessionId] || { total: 0, byFuelType: {} };

      // Calculate efficiency metrics
      let fuelEfficiency: number | null = null;
      let fuelPerHour: number | null = null;

      if (distance > 0 && consumption.total > 0) {
        fuelEfficiency = consumption.total / distance; // tons per nm
      }
      if (duration > 0 && consumption.total > 0) {
        fuelPerHour = consumption.total / duration;
      }

      combinedSessions.push({
        sessionId,
        shipName,
        shipClass: evento.class?.trim() || '',
        eventName: evento.eventName?.trim() || '',
        startDate: evento.startGMTDate?.trim() || '',
        endDate: evento.endGMTDate?.trim() || '',
        duration,
        distance,
        speed,
        speedGps,
        port: evento.Porto?.trim() || null,
        latitude: parseFloat(evento.decLatitude) || null,
        longitude: parseFloat(evento.decLongitude) || null,
        beaufortScale: parseInt(evento.beaufortScale) || null,
        seaCondition: evento.seaCondition?.trim() || null,
        displacement: parseFloat(evento.displacement) || null,
        midDraft: parseFloat(evento.midDraft) || null,
        trim: parseFloat(evento.TRIM) || null,
        consumption,
        fuelEfficiency,
        fuelPerHour,
      });

      processedCount++;
    }

    // Group by ship for analysis
    const shipAnalysis: { [shipName: string]: ShipAnalysis } = {};

    combinedSessions.forEach((session) => {
      if (!shipAnalysis[session.shipName]) {
        shipAnalysis[session.shipName] = {
          shipName: session.shipName,
          shipClass: session.shipClass,
          totalSessions: 0,
          navigationSessions: 0,
          portSessions: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalConsumption: 0,
          avgSpeed: 0,
          avgFuelEfficiency: 0,
          avgFuelPerHour: 0,
          consumptionByFuelType: {},
          consumptionByEvent: {},
          speedTrend: 'stable',
          efficiencyTrend: 'stable',
          sessions: [],
        };
      }

      const ship = shipAnalysis[session.shipName];
      ship.totalSessions++;
      ship.totalDistance += session.distance;
      ship.totalDuration += session.duration;
      ship.totalConsumption += session.consumption.total;
      ship.sessions.push(session);

      if (session.eventName === 'NAVEGACAO') {
        ship.navigationSessions++;
      } else if (session.eventName.includes('PORTO')) {
        ship.portSessions++;
      }

      // Consumption by fuel type
      Object.entries(session.consumption.byFuelType).forEach(([fuel, qty]) => {
        ship.consumptionByFuelType[fuel] = (ship.consumptionByFuelType[fuel] || 0) + qty;
      });

      // Consumption by event type
      ship.consumptionByEvent[session.eventName] = 
        (ship.consumptionByEvent[session.eventName] || 0) + session.consumption.total;
    });

    // Calculate averages and trends
    Object.values(shipAnalysis).forEach((ship) => {
      const navSessions = ship.sessions.filter(s => s.eventName === 'NAVEGACAO' && s.speed > 0);
      
      if (navSessions.length > 0) {
        ship.avgSpeed = navSessions.reduce((sum, s) => sum + s.speed, 0) / navSessions.length;
      }

      if (ship.totalDistance > 0 && ship.totalConsumption > 0) {
        ship.avgFuelEfficiency = (ship.totalConsumption / ship.totalDistance) * 100; // per 100nm
      }

      if (ship.totalDuration > 0 && ship.totalConsumption > 0) {
        ship.avgFuelPerHour = ship.totalConsumption / ship.totalDuration;
      }

      // Calculate trends (compare first half vs second half of sessions)
      if (navSessions.length >= 10) {
        const midpoint = Math.floor(navSessions.length / 2);
        const firstHalf = navSessions.slice(0, midpoint);
        const secondHalf = navSessions.slice(midpoint);

        const avgSpeedFirst = firstHalf.reduce((sum, s) => sum + s.speed, 0) / firstHalf.length;
        const avgSpeedSecond = secondHalf.reduce((sum, s) => sum + s.speed, 0) / secondHalf.length;

        const speedChange = ((avgSpeedSecond - avgSpeedFirst) / avgSpeedFirst) * 100;
        
        if (speedChange < -5) {
          ship.speedTrend = 'degrading';
        } else if (speedChange > 5) {
          ship.speedTrend = 'improving';
        }

        // Efficiency trend (lower is better, so reversed logic)
        const effFirst = firstHalf.filter(s => s.fuelEfficiency).map(s => s.fuelEfficiency!);
        const effSecond = secondHalf.filter(s => s.fuelEfficiency).map(s => s.fuelEfficiency!);
        
        if (effFirst.length > 0 && effSecond.length > 0) {
          const avgEffFirst = effFirst.reduce((a, b) => a + b, 0) / effFirst.length;
          const avgEffSecond = effSecond.reduce((a, b) => a + b, 0) / effSecond.length;
          const effChange = ((avgEffSecond - avgEffFirst) / avgEffFirst) * 100;
          
          if (effChange > 10) {
            ship.efficiencyTrend = 'degrading'; // Higher fuel per mile = worse
          } else if (effChange < -10) {
            ship.efficiencyTrend = 'improving';
          }
        }
      }

      // Limit sessions in response
      ship.sessions = ship.sessions.slice(0, 50);
    });

    // Calculate fleet totals
    const fleetTotals = {
      totalSessions: combinedSessions.length,
      totalDistance: Object.values(shipAnalysis).reduce((sum, s) => sum + s.totalDistance, 0),
      totalDuration: Object.values(shipAnalysis).reduce((sum, s) => sum + s.totalDuration, 0),
      totalConsumption: Object.values(shipAnalysis).reduce((sum, s) => sum + s.totalConsumption, 0),
      avgFuelEfficiency: 0,
      consumptionByFuelType: {} as { [key: string]: number },
      consumptionByEvent: {} as { [key: string]: number },
    };

    if (fleetTotals.totalDistance > 0) {
      fleetTotals.avgFuelEfficiency = (fleetTotals.totalConsumption / fleetTotals.totalDistance) * 100;
    }

    // Aggregate fuel types and events
    Object.values(shipAnalysis).forEach((ship) => {
      Object.entries(ship.consumptionByFuelType).forEach(([fuel, qty]) => {
        fleetTotals.consumptionByFuelType[fuel] = (fleetTotals.consumptionByFuelType[fuel] || 0) + qty;
      });
      Object.entries(ship.consumptionByEvent).forEach(([event, qty]) => {
        fleetTotals.consumptionByEvent[event] = (fleetTotals.consumptionByEvent[event] || 0) + qty;
      });
    });

    return NextResponse.json({
      success: true,
      totalSessionsProcessed: combinedSessions.length,
      totalShips: Object.keys(shipAnalysis).length,
      fleetTotals,
      ships: Object.values(shipAnalysis).sort((a, b) => b.totalConsumption - a.totalConsumption),
      availableShips: Object.keys(shipAnalysis).sort(),
    });

  } catch (error) {
    console.error('Error processing consumption data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

