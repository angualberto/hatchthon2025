import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface ConsumptionRecord {
  SESSION_ID: string;
  CONSUMED_QUANTITY: string;
  DESCRIPTION: string;
}

interface EventRecord {
  sessionId: string;
  shipName: string;
  class: string;
  eventName: string;
  startGMTDate: string;
  endGMTDate: string;
  duration: string;
  distance: string;
  speed: string;
}

// GET - Fetch fuel consumption data with vessel info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselName = searchParams.get('vessel');
    const fuelType = searchParams.get('fuelType');
    const limit = parseInt(searchParams.get('limit') || '5000');
    
    // Paths to data files
    const consumptionPath = path.join(process.cwd(), '..', 'data', 'ResultadoQueryConsumo.csv');
    const eventsPath = path.join(process.cwd(), '..', 'data', 'ResultadoQueryEventos.csv');
    
    // Read consumption data
    const consumptionContent = await fs.readFile(consumptionPath, 'utf-8');
    const consumptionParsed = Papa.parse<ConsumptionRecord>(consumptionContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Read events data for session mapping
    const eventsContent = await fs.readFile(eventsPath, 'utf-8');
    const eventsParsed = Papa.parse<EventRecord>(eventsContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Create session to vessel mapping
    const sessionToVessel: { [key: string]: { shipName: string; eventName: string; date: string; speed: number | null; distance: number | null; duration: number } } = {};
    eventsParsed.data.forEach(event => {
      sessionToVessel[event.sessionId] = {
        shipName: event.shipName,
        eventName: event.eventName,
        date: event.startGMTDate,
        speed: parseFloat(event.speed) || null,
        distance: parseFloat(event.distance) || null,
        duration: parseFloat(event.duration) || 0,
      };
    });
    
    // Process consumption data
    let consumptionData = consumptionParsed.data
      .filter(r => r.CONSUMED_QUANTITY && parseFloat(r.CONSUMED_QUANTITY) > 0)
      .map(record => {
        const session = sessionToVessel[record.SESSION_ID];
        return {
          sessionId: parseInt(record.SESSION_ID) || 0,
          consumedQuantity: parseFloat(record.CONSUMED_QUANTITY) || 0,
          fuelType: record.DESCRIPTION,
          shipName: session?.shipName || 'Unknown',
          eventName: session?.eventName || 'Unknown',
          date: session?.date || '',
          speed: session?.speed,
          distance: session?.distance,
          duration: session?.duration || 0,
        };
      });
    
    // Apply filters
    if (vesselName) {
      consumptionData = consumptionData.filter(r => 
        r.shipName.toLowerCase().includes(vesselName.toLowerCase())
      );
    }
    
    if (fuelType) {
      consumptionData = consumptionData.filter(r => 
        r.fuelType.toLowerCase().includes(fuelType.toLowerCase())
      );
    }
    
    // Limit results
    consumptionData = consumptionData.slice(0, limit);
    
    // Get unique vessels and fuel types
    const vessels = [...new Set(consumptionData.map(r => r.shipName).filter(Boolean))];
    const fuelTypes = [...new Set(consumptionParsed.data.map(r => r.DESCRIPTION).filter(Boolean))];
    
    // Calculate statistics
    const totalConsumption = consumptionData.reduce((acc, r) => acc + r.consumedQuantity, 0);
    const avgConsumption = consumptionData.length > 0 ? totalConsumption / consumptionData.length : 0;
    
    // Group by vessel
    const byVessel: { [key: string]: { total: number; count: number; avgSpeed: number; totalDistance: number } } = {};
    consumptionData.forEach(r => {
      if (!byVessel[r.shipName]) {
        byVessel[r.shipName] = { total: 0, count: 0, avgSpeed: 0, totalDistance: 0 };
      }
      byVessel[r.shipName].total += r.consumedQuantity;
      byVessel[r.shipName].count += 1;
      if (r.speed) byVessel[r.shipName].avgSpeed += r.speed;
      if (r.distance) byVessel[r.shipName].totalDistance += r.distance;
    });
    
    // Calculate fuel efficiency (consumption per nautical mile)
    const vesselEfficiency = Object.entries(byVessel).map(([vessel, data]) => ({
      vessel,
      totalConsumption: data.total,
      totalDistance: data.totalDistance,
      efficiency: data.totalDistance > 0 ? data.total / data.totalDistance : 0,
      avgSpeed: data.count > 0 ? data.avgSpeed / data.count : 0,
    })).sort((a, b) => b.efficiency - a.efficiency);
    
    // Group by fuel type
    const byFuelType: { [key: string]: number } = {};
    consumptionData.forEach(r => {
      byFuelType[r.fuelType] = (byFuelType[r.fuelType] || 0) + r.consumedQuantity;
    });
    
    const stats = {
      totalRecords: consumptionParsed.data.length,
      returnedRecords: consumptionData.length,
      vessels,
      fuelTypes,
      totalConsumption,
      avgConsumption,
      byVessel: vesselEfficiency,
      byFuelType,
      // CO2 emissions estimate (3.17 tons CO2 per ton of fuel)
      estimatedCO2: totalConsumption * 3.17,
    };
    
    return NextResponse.json({
      success: true,
      stats,
      data: consumptionData,
    });
    
  } catch (error) {
    console.error('Error processing consumption data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process consumption data' },
      { status: 500 }
    );
  }
}

