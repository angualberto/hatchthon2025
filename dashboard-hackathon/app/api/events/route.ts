import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface EventRecord {
  sessionId: string;
  shipName: string;
  class: string;
  eventName: string;
  startGMTDate: string;
  endGMTDate: string;
  duration: string;
  distance: string;
  aftDraft: string;
  fwdDraft: string;
  midDraft: string;
  TRIM: string;
  displacement: string;
  beaufortScale: string;
  seaCondition: string;
  beaufortScaleDesc: string;
  seaConditionDesc: string;
  speed: string;
  speedGps: string;
  Porto: string;
  decLatitude: string;
  decLongitude: string;
}

// GET - Fetch operational events data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselName = searchParams.get('vessel');
    const eventType = searchParams.get('event');
    const limit = parseInt(searchParams.get('limit') || '5000');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Path to data folder
    const dataPath = path.join(process.cwd(), '..', 'data', 'ResultadoQueryEventos.csv');
    
    // Check if file exists
    try {
      await fs.access(dataPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Events data file not found' },
        { status: 404 }
      );
    }
    
    // Read and parse CSV
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    
    const parsed = Papa.parse<EventRecord>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Filter data
    let filteredData = parsed.data;
    
    if (vesselName) {
      filteredData = filteredData.filter(r => 
        r.shipName?.toLowerCase().includes(vesselName.toLowerCase())
      );
    }
    
    if (eventType) {
      filteredData = filteredData.filter(r => 
        r.eventName?.toLowerCase() === eventType.toLowerCase()
      );
    }
    
    if (startDate) {
      filteredData = filteredData.filter(r => 
        new Date(r.startGMTDate) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filteredData = filteredData.filter(r => 
        new Date(r.endGMTDate) <= new Date(endDate)
      );
    }
    
    // Transform data
    const data = filteredData.slice(0, limit).map((record) => ({
      sessionId: parseInt(record.sessionId) || 0,
      shipName: record.shipName,
      class: record.class,
      eventName: record.eventName,
      startGMTDate: record.startGMTDate,
      endGMTDate: record.endGMTDate,
      duration: parseFloat(record.duration) || 0,
      distance: parseFloat(record.distance) || null,
      aftDraft: parseFloat(record.aftDraft) || null,
      fwdDraft: parseFloat(record.fwdDraft) || null,
      midDraft: parseFloat(record.midDraft) || null,
      trim: parseFloat(record.TRIM) || null,
      displacement: parseFloat(record.displacement) || null,
      beaufortScale: parseInt(record.beaufortScale) || null,
      seaCondition: parseInt(record.seaCondition) || null,
      beaufortScaleDesc: record.beaufortScaleDesc || null,
      seaConditionDesc: record.seaConditionDesc || null,
      speed: parseFloat(record.speed) || null,
      speedGps: parseFloat(record.speedGps) || null,
      porto: record.Porto || null,
      latitude: parseFloat(record.decLatitude) || null,
      longitude: parseFloat(record.decLongitude) || null,
    }));
    
    // Get unique vessels
    const vessels = [...new Set(parsed.data.map(r => r.shipName).filter(Boolean))];
    
    // Get unique event types
    const eventTypes = [...new Set(parsed.data.map(r => r.eventName).filter(Boolean))];
    
    // Calculate statistics
    const navigationEvents = data.filter(d => d.eventName === 'NAVEGACAO');
    const portEvents = data.filter(d => d.eventName === 'EM PORTO');
    
    const stats = {
      totalRecords: parsed.data.length,
      returnedRecords: data.length,
      vessels,
      eventTypes,
      navigation: {
        totalHours: navigationEvents.reduce((acc, e) => acc + e.duration, 0),
        totalDistance: navigationEvents.reduce((acc, e) => acc + (e.distance || 0), 0),
        avgSpeed: navigationEvents.length > 0 
          ? navigationEvents.filter(e => e.speed).reduce((acc, e) => acc + (e.speed || 0), 0) / navigationEvents.filter(e => e.speed).length
          : 0,
      },
      port: {
        totalHours: portEvents.reduce((acc, e) => acc + e.duration, 0),
        events: portEvents.length,
      },
    };
    
    return NextResponse.json({
      success: true,
      stats,
      data,
    });
    
  } catch (error) {
    console.error('Error processing events data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process events data' },
      { status: 500 }
    );
  }
}

