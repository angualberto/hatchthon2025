import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

// AIS data point interface
interface AISRecord {
  NOME: string;
  DATAHORA: string;
  RUMO: string;
  VELOCIDADE: string;
  LATITUDE: string;
  LONGITUDE: string;
}

interface ParsedAISData {
  name: string;
  timestamp: string;
  heading: number;
  speed: number;
  latitude: number;
  longitude: number;
}

// GET - Fetch AIS data for a specific vessel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselName = searchParams.get('vessel');
    const limit = parseInt(searchParams.get('limit') || '1000');
    
    // Path to AIS data folder
    const aisDataPath = path.join(process.cwd(), '..', 'Dados AIS frota TP');
    
    // List available vessels
    const files = await fs.readdir(aisDataPath);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    // If no vessel specified, return list of available vessels
    if (!vesselName) {
      const vesselList = csvFiles.map(f => f.replace('.csv', ''));
      return NextResponse.json({
        success: true,
        vessels: vesselList,
        count: vesselList.length,
      });
    }
    
    // Find the vessel file
    const vesselFile = csvFiles.find(
      f => f.toLowerCase().replace('.csv', '') === vesselName.toLowerCase().replace(/_/g, ' ')
        || f.toLowerCase().includes(vesselName.toLowerCase())
    );
    
    if (!vesselFile) {
      return NextResponse.json(
        { success: false, error: 'Vessel not found' },
        { status: 404 }
      );
    }
    
    // Read and parse CSV
    const filePath = path.join(aisDataPath, vesselFile);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    const parsed = Papa.parse<AISRecord>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Transform data
    const data: ParsedAISData[] = parsed.data.slice(0, limit).map((record) => ({
      name: record.NOME,
      timestamp: record.DATAHORA,
      heading: parseFloat(record.RUMO) || 0,
      speed: parseFloat(record.VELOCIDADE) || 0,
      latitude: parseFloat(record.LATITUDE) || 0,
      longitude: parseFloat(record.LONGITUDE) || 0,
    }));
    
    // Calculate statistics
    const speeds = data.map(d => d.speed).filter(s => s > 0);
    const stats = {
      totalRecords: parsed.data.length,
      returnedRecords: data.length,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      minSpeed: speeds.length > 0 ? Math.min(...speeds) : 0,
      dateRange: {
        start: data[data.length - 1]?.timestamp,
        end: data[0]?.timestamp,
      },
    };
    
    return NextResponse.json({
      success: true,
      vessel: vesselFile.replace('.csv', ''),
      stats,
      data,
    });
    
  } catch (error) {
    console.error('Error processing AIS data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process AIS data' },
      { status: 500 }
    );
  }
}

// POST - Analyze biofouling based on AIS speed data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vesselName, baselineSpeed } = body;
    
    if (!vesselName || !baselineSpeed) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: vesselName, baselineSpeed' },
        { status: 400 }
      );
    }
    
    // Path to AIS data folder
    const aisDataPath = path.join(process.cwd(), '..', 'Dados AIS frota TP');
    const files = await fs.readdir(aisDataPath);
    const vesselFile = files.find(f => 
      f.toLowerCase().includes(vesselName.toLowerCase().replace(/ /g, '_')) ||
      f.toLowerCase().includes(vesselName.toLowerCase())
    );
    
    if (!vesselFile) {
      return NextResponse.json(
        { success: false, error: 'Vessel not found' },
        { status: 404 }
      );
    }
    
    // Read and parse CSV
    const filePath = path.join(aisDataPath, vesselFile);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    const parsed = Papa.parse<AISRecord>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Filter for sailing data (speed > 5 knots)
    const sailingData = parsed.data
      .filter(r => parseFloat(r.VELOCIDADE) > 5)
      .map(r => ({
        timestamp: new Date(r.DATAHORA),
        speed: parseFloat(r.VELOCIDADE),
      }));
    
    // Group by month and calculate average speeds
    const monthlyData: { [key: string]: number[] } = {};
    sailingData.forEach(d => {
      const monthKey = `${d.timestamp.getFullYear()}-${String(d.timestamp.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = [];
      monthlyData[monthKey].push(d.speed);
    });
    
    // Calculate monthly averages and degradation
    const analysis = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, speeds]) => {
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const degradation = ((baselineSpeed - avgSpeed) / baselineSpeed) * 100;
        const biofoulingScore = Math.min(100, Math.max(0, degradation * 3)); // Simplified model
        const fuelPenalty = degradation * 0.5; // Simplified: 0.5% fuel penalty per 1% speed loss
        
        return {
          month,
          avgSpeed: parseFloat(avgSpeed.toFixed(2)),
          baselineSpeed,
          speedLoss: parseFloat((baselineSpeed - avgSpeed).toFixed(2)),
          degradation: parseFloat(degradation.toFixed(2)),
          biofoulingScore: parseFloat(biofoulingScore.toFixed(0)),
          estimatedFuelPenalty: parseFloat(fuelPenalty.toFixed(2)),
          dataPoints: speeds.length,
        };
      });
    
    // Current status (most recent month)
    const currentStatus = analysis[analysis.length - 1];
    
    // Prediction (simple linear extrapolation)
    const recentMonths = analysis.slice(-3);
    const avgDegradationRate = recentMonths.length > 1
      ? (recentMonths[recentMonths.length - 1].biofoulingScore - recentMonths[0].biofoulingScore) / recentMonths.length
      : 2; // Default 2 points per month
    
    const prediction = {
      currentScore: currentStatus?.biofoulingScore || 0,
      predictedScore30Days: Math.min(100, (currentStatus?.biofoulingScore || 0) + avgDegradationRate),
      predictedScore60Days: Math.min(100, (currentStatus?.biofoulingScore || 0) + avgDegradationRate * 2),
      predictedScore90Days: Math.min(100, (currentStatus?.biofoulingScore || 0) + avgDegradationRate * 3),
      recommendedCleaningDate: avgDegradationRate > 0
        ? new Date(Date.now() + ((70 - (currentStatus?.biofoulingScore || 0)) / avgDegradationRate) * 30 * 24 * 60 * 60 * 1000)
        : null,
      riskLevel: currentStatus?.biofoulingScore > 70 ? 'critical'
        : currentStatus?.biofoulingScore > 50 ? 'high'
        : currentStatus?.biofoulingScore > 30 ? 'moderate'
        : 'low',
    };
    
    return NextResponse.json({
      success: true,
      vessel: vesselFile.replace('.csv', ''),
      analysis,
      currentStatus,
      prediction,
      summary: {
        totalDataPoints: sailingData.length,
        monthsAnalyzed: analysis.length,
        avgSpeedLoss: parseFloat((analysis.reduce((a, b) => a + b.speedLoss, 0) / analysis.length).toFixed(2)),
        maxBiofoulingScore: Math.max(...analysis.map(a => a.biofoulingScore)),
      },
    });
    
  } catch (error) {
    console.error('Error analyzing biofouling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze biofouling data' },
      { status: 500 }
    );
  }
}

