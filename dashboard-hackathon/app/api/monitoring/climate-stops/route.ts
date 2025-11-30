import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface ClimateStopRecord {
  temperatura_agua: string;
  umidade: string;
  precipitacao: string;
  pressao: string;
  vento_velocidade: string;
  vento_direcao: string;
  altura_ondas: string;
  direcao_ondas: string;
  corrente_velocidade: string;
  corrente_direcao: string;
  fonte: string;
  timestamp_exato: string;
  latitude: string;
  longitude: string;
  timestamp: string;
  data_coleta: string;
  navio: string;
  tipo_ponto: string;
  duracao_parada_min: string;
  inicio_parada: string;
  fim_parada: string;
  salinidade: string;
  ph: string;
  oxigenio_dissolvido: string;
  turbidez: string;
  densidade_agua: string;
  regiao_oceanica: string;
}

interface ProcessedStop {
  vesselName: string;
  stop: {
    lat: number;
    lng: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
  climate: {
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
  oceanography: {
    salinity?: number;
    pH?: number;
    dissolvedOxygen?: number;
    turbidity?: number;
    waterDensity?: number;
  };
  region?: string;
  dataSource: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselFilter = searchParams.get('vessel');
    
    // Caminho para o arquivo CSV
    const csvPath = path.join(process.cwd(), '..', 'data', 'dados_clima_paradas_20251130_111204.csv');
    
    try {
      await fs.access(csvPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Climate stops data file not found' },
        { status: 404 }
      );
    }
    
    // Ler e parsear o arquivo CSV
    const fileContent = await fs.readFile(csvPath, 'utf-8');
    const parseResult = Papa.parse<ClimateStopRecord>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json({
        success: true,
        stops: [],
        summary: {
          totalStops: 0,
          vessels: [],
        },
      });
    }
    
    // Processar registros
    const processedStops: ProcessedStop[] = [];
    const vesselStats: { [key: string]: number } = {};
    
    for (const record of parseResult.data) {
      // Filtrar por embarcação se especificado
      if (vesselFilter && !record.navio?.toLowerCase().includes(vesselFilter.toLowerCase())) {
        continue;
      }
      
      // Validar coordenadas
      const lat = parseFloat(record.latitude);
      const lng = parseFloat(record.longitude);
      
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        continue;
      }
      
      // Processar dados climáticos
      const climate = {
        temperature: record.temperatura_agua ? parseFloat(record.temperatura_agua) : undefined,
        humidity: record.umidade ? parseFloat(record.umidade) : undefined,
        precipitation: record.precipitacao ? parseFloat(record.precipitacao) : undefined,
        pressure: record.pressao ? parseFloat(record.pressao) : undefined,
        windSpeed: record.vento_velocidade ? parseFloat(record.vento_velocidade) : undefined,
        windDirection: record.vento_direcao ? parseFloat(record.vento_direcao) : undefined,
        waveHeight: record.altura_ondas ? parseFloat(record.altura_ondas) : undefined,
        waveDirection: record.direcao_ondas ? parseFloat(record.direcao_ondas) : undefined,
        currentSpeed: record.corrente_velocidade ? parseFloat(record.corrente_velocidade) : undefined,
        currentDirection: record.corrente_direcao ? parseFloat(record.corrente_direcao) : undefined,
      };
      
      // Processar dados oceanográficos
      const oceanography = {
        salinity: record.salinidade ? parseFloat(record.salinidade) : undefined,
        pH: record.ph ? parseFloat(record.ph) : undefined,
        dissolvedOxygen: record.oxigenio_dissolvido ? parseFloat(record.oxigenio_dissolvido) : undefined,
        turbidity: record.turbidez ? parseFloat(record.turbidez) : undefined,
        waterDensity: record.densidade_agua ? parseFloat(record.densidade_agua) : undefined,
      };
      
      // Processar parada
      const durationMinutes = record.duracao_parada_min 
        ? parseFloat(record.duracao_parada_min) 
        : 0;
      
      const vesselName = record.navio?.trim() || 'UNKNOWN';
      
      processedStops.push({
        vesselName,
        stop: {
          lat,
          lng,
          startTime: record.inicio_parada || record.timestamp || '',
          endTime: record.fim_parada || record.timestamp || '',
          durationMinutes,
        },
        climate,
        oceanography,
        region: record.regiao_oceanica || undefined,
        dataSource: record.fonte || 'unknown',
        timestamp: record.timestamp || record.timestamp_exato || '',
      });
      
      // Contar paradas por embarcação
      if (!vesselStats[vesselName]) {
        vesselStats[vesselName] = 0;
      }
      vesselStats[vesselName]++;
    }
    
    // Calcular estatísticas agregadas
    const vessels = Object.keys(vesselStats);
    const avgTemperature = processedStops
      .filter(s => s.climate.temperature !== undefined)
      .reduce((acc, s) => acc + (s.climate.temperature || 0), 0) / 
      processedStops.filter(s => s.climate.temperature !== undefined).length || 0;
    
    const avgSalinity = processedStops
      .filter(s => s.oceanography.salinity !== undefined)
      .reduce((acc, s) => acc + (s.oceanography.salinity || 0), 0) / 
      processedStops.filter(s => s.oceanography.salinity !== undefined).length || 0;
    
    const avgWaveHeight = processedStops
      .filter(s => s.climate.waveHeight !== undefined)
      .reduce((acc, s) => acc + (s.climate.waveHeight || 0), 0) / 
      processedStops.filter(s => s.climate.waveHeight !== undefined).length || 0;
    
    return NextResponse.json({
      success: true,
      stops: processedStops,
      summary: {
        totalStops: processedStops.length,
        vessels: vessels,
        vesselCounts: vesselStats,
        avgTemperature: Math.round(avgTemperature * 10) / 10,
        avgSalinity: Math.round(avgSalinity * 100) / 100,
        avgWaveHeight: Math.round(avgWaveHeight * 100) / 100,
      },
    });
    
  } catch (error: any) {
    console.error('Error processing climate stops data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process climate stops data' },
      { status: 500 }
    );
  }
}

