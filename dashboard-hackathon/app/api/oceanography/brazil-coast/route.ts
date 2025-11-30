export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

// Costa brasileira - limites completos (de Oiapoque/AP até Chuí/RS)
// Latitude: -33.7° (Chuí, RS) até 4.3° (Oiapoque, AP)
// Longitude: -52.0° (extremo leste) até -34.0° (extremo oeste, incluindo recôncavo baiano)
const BRAZIL_COAST_BOUNDS = {
  minLat: -34.0,  // Sul (Chuí, RS)
  maxLat: 5.0,    // Norte (Oiapoque, AP)
  minLon: -52.0,  // Leste (mais distante da costa)
  maxLon: -34.0,  // Oeste (incluindo baía de Todos os Santos e recôncavo)
};

const ERDDAP_BASE_URL = "https://www.ncei.noaa.gov/erddap";

// Datasets relevantes para biofouling na costa brasileira
const BIOFOULING_DATASETS = {
  seaSurfaceTemperature: {
    datasetId: "jplMURSST41",
    variable: "analysed_sst",
    name: "Temperatura da Superfície do Mar",
    unit: "°C",
    description: "Temperatura da superfície do mar - fator crítico para crescimento de biofouling",
  },
  chlorophyll: {
    datasetId: "erdMH1chlamday",
    variable: "chlorophyll",
    name: "Clorofila-a",
    unit: "mg/m³",
    description: "Concentração de clorofila - indicador de produtividade biológica",
  },
  salinity: {
    datasetId: "jplAquariusSSS3Month",
    variable: "sss",
    name: "Salinidade",
    unit: "PSU",
    description: "Salinidade da superfície do mar",
  },
  seaLevel: {
    datasetId: "jplGMSL",
    variable: "gmsl",
    name: "Nível do Mar",
    unit: "mm",
    description: "Variação do nível do mar",
  },
};

interface OceanDataPoint {
  lat: number;
  lng: number;
  temperature?: number;
  chlorophyll?: number;
  salinity?: number;
  biofoulingRisk?: number;
  biodiversity?: "high" | "medium" | "low";
  timestamp: string;
}

interface BiofoulingZone {
  id: string;
  name: string;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  avgTemperature: number;
  avgChlorophyll: number;
  biodiversity: "high" | "medium" | "low";
  biofoulingRisk: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  dataPoints: OceanDataPoint[];
}

// Calcular risco de biofouling baseado em múltiplos fatores
function calculateBiofoulingRisk(
  temperature: number,
  chlorophyll: number,
  salinity: number
): number {
  // Fatores de risco:
  // - Temperatura alta (>25°C) = maior risco
  // - Clorofila alta (>2 mg/m³) = maior biodiversidade = maior risco
  // - Salinidade moderada (30-36 PSU) = ideal para biofouling
  
  let risk = 0;
  
  // Temperatura (0-40 pontos)
  if (temperature >= 28) risk += 40;
  else if (temperature >= 25) risk += 30;
  else if (temperature >= 22) risk += 20;
  else if (temperature >= 18) risk += 10;
  
  // Clorofila (0-35 pontos)
  if (chlorophyll >= 3) risk += 35;
  else if (chlorophyll >= 2) risk += 25;
  else if (chlorophyll >= 1) risk += 15;
  else if (chlorophyll >= 0.5) risk += 8;
  
  // Salinidade (0-25 pontos) - ideal entre 30-36
  if (salinity >= 30 && salinity <= 36) risk += 25;
  else if (salinity >= 28 && salinity <= 38) risk += 15;
  else risk += 5;
  
  return Math.min(100, Math.round(risk));
}

// Determinar biodiversidade baseado em clorofila
function determineBiodiversity(chlorophyll: number): "high" | "medium" | "low" {
  if (chlorophyll >= 2) return "high";
  if (chlorophyll >= 1) return "medium";
  return "low";
}

// Determinar nível de risco
function getRiskLevel(risk: number): "low" | "medium" | "high" | "critical" {
  if (risk >= 70) return "critical";
  if (risk >= 50) return "high";
  if (risk >= 30) return "medium";
  return "low";
}

// Buscar dados do ERDDAP com timeout e retry
async function fetchERDDAPData(
  datasetId: string,
  variable: string,
  bounds: typeof BRAZIL_COAST_BOUNDS
): Promise<any[]> {
  const maxRetries = 2;
  const timeout = 30000; // 30 segundos
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const dataUrl = `${ERDDAP_BASE_URL}/tabledap/${datasetId}.csv?time,latitude,longitude,${variable}&latitude>=${bounds.minLat}&latitude<=${bounds.maxLat}&longitude>=${bounds.minLon}&longitude<=${bounds.maxLon}&orderBy("time")&orderBy("latitude")&orderBy("longitude")`;
      
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(dataUrl, {
        headers: { Accept: "text/csv" },
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt < maxRetries && response.status >= 500) {
          // Retry em caso de erro do servidor
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        console.warn(`Failed to fetch ${datasetId}: ${response.status} ${response.statusText}`);
        return [];
      }

      const csvText = await response.text();
      
      if (!csvText || csvText.trim().length === 0) {
        console.warn(`Empty response for ${datasetId}`);
        return [];
      }

      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
      });

      if (!records || records.length === 0) {
        return [];
      }

      return records.map((r: any) => ({
        time: r.time || "",
        lat: parseFloat(r.latitude) || 0,
        lng: parseFloat(r.longitude) || 0,
        value: parseFloat(r[variable]) || 0,
      }));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`Timeout fetching ${datasetId} (attempt ${attempt + 1})`);
      } else {
        console.error(`Error fetching ${datasetId} (attempt ${attempt + 1}):`, error.message);
      }
      
      // Se não for a última tentativa, espera e tenta novamente
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      return [];
    }
  }
  
  return [];
}

// Zonas geográficas precisas da costa brasileira
const BRAZIL_COAST_ZONES = [
  {
    id: 'norte-extremo',
    name: 'Norte - Amapá',
    bounds: {
      minLat: 0.0,
      maxLat: 5.0,
      minLon: -52.0,
      maxLon: -48.0,
    },
    states: ['AP'],
  },
  {
    id: 'norte-para',
    name: 'Norte - Pará',
    bounds: {
      minLat: -2.0,
      maxLat: 0.0,
      minLon: -50.0,
      maxLon: -47.0,
    },
    states: ['PA'],
  },
  {
    id: 'nordeste-maranhao',
    name: 'Nordeste - Maranhão',
    bounds: {
      minLat: -5.0,
      maxLat: -2.0,
      minLon: -45.0,
      maxLon: -42.0,
    },
    states: ['MA'],
  },
  {
    id: 'nordeste-piaui-ceara',
    name: 'Nordeste - Piauí e Ceará',
    bounds: {
      minLat: -7.0,
      maxLat: -3.0,
      minLon: -41.0,
      maxLon: -38.0,
    },
    states: ['PI', 'CE'],
  },
  {
    id: 'nordeste-rn-pb-pe',
    name: 'Nordeste - RN, PB e PE',
    bounds: {
      minLat: -9.0,
      maxLat: -6.0,
      minLon: -38.0,
      maxLon: -34.5,
    },
    states: ['RN', 'PB', 'PE'],
  },
  {
    id: 'nordeste-al-se',
    name: 'Nordeste - Alagoas e Sergipe',
    bounds: {
      minLat: -11.5,
      maxLat: -9.0,
      minLon: -38.0,
      maxLon: -36.0,
    },
    states: ['AL', 'SE'],
  },
  {
    id: 'nordeste-bahia',
    name: 'Nordeste - Bahia',
    bounds: {
      minLat: -18.0,
      maxLat: -11.5,
      minLon: -40.0,
      maxLon: -36.0,
    },
    states: ['BA'],
  },
  {
    id: 'sudeste-espirito-santo',
    name: 'Sudeste - Espírito Santo',
    bounds: {
      minLat: -21.0,
      maxLat: -18.0,
      minLon: -41.0,
      maxLon: -39.0,
    },
    states: ['ES'],
  },
  {
    id: 'sudeste-rio-janeiro',
    name: 'Sudeste - Rio de Janeiro',
    bounds: {
      minLat: -23.5,
      maxLat: -21.0,
      minLon: -45.0,
      maxLon: -41.0,
    },
    states: ['RJ'],
  },
  {
    id: 'sudeste-sao-paulo',
    name: 'Sudeste - São Paulo',
    bounds: {
      minLat: -25.0,
      maxLat: -23.5,
      minLon: -48.0,
      maxLon: -45.0,
    },
    states: ['SP'],
  },
  {
    id: 'sul-parana',
    name: 'Sul - Paraná',
    bounds: {
      minLat: -26.5,
      maxLat: -25.0,
      minLon: -49.0,
      maxLon: -48.0,
    },
    states: ['PR'],
  },
  {
    id: 'sul-santa-catarina',
    name: 'Sul - Santa Catarina',
    bounds: {
      minLat: -29.0,
      maxLat: -26.5,
      minLon: -49.5,
      maxLon: -48.0,
    },
    states: ['SC'],
  },
  {
    id: 'sul-rio-grande-sul',
    name: 'Sul - Rio Grande do Sul',
    bounds: {
      minLat: -34.0,
      maxLat: -29.0,
      minLon: -52.0,
      maxLon: -49.5,
    },
    states: ['RS'],
  },
];

// Criar zonas de biofouling baseadas em dados e regiões geográficas precisas
function createBiofoulingZones(dataPoints: OceanDataPoint[]): BiofoulingZone[] {
  return BRAZIL_COAST_ZONES.map((zoneDef) => {
    // Filtrar pontos que estão dentro dos bounds desta zona
    const zonePoints = dataPoints.filter((point) => {
      return (
        point.lat >= zoneDef.bounds.minLat &&
        point.lat <= zoneDef.bounds.maxLat &&
        point.lng >= zoneDef.bounds.minLon &&
        point.lng <= zoneDef.bounds.maxLon
      );
    });

    if (zonePoints.length === 0) {
      // Se não houver pontos, retornar zona com valores padrão
      return {
        id: zoneDef.id,
        name: zoneDef.name,
        bounds: zoneDef.bounds,
        avgTemperature: 22,
        avgChlorophyll: 1.0,
        biodiversity: 'medium' as const,
        biofoulingRisk: 30,
        riskLevel: 'medium' as const,
        dataPoints: [],
      };
    }

    // Calcular médias dos dados
    const temps = zonePoints.map((p) => p.temperature || 0).filter((t) => t > 0);
    const chlors = zonePoints.map((p) => p.chlorophyll || 0).filter((c) => c > 0);
    const risks = zonePoints.map((p) => p.biofoulingRisk || 0).filter((r) => r > 0);

    const avgTemp =
      temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 22;
    const avgChlor =
      chlors.length > 0 ? chlors.reduce((a, b) => a + b, 0) / chlors.length : 1.0;
    const avgRisk =
      risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 30;

    const biodiversity: 'high' | 'medium' | 'low' =
      avgChlor >= 2 ? 'high' : avgChlor >= 1 ? 'medium' : 'low';

    return {
      id: zoneDef.id,
      name: zoneDef.name,
      bounds: zoneDef.bounds,
      avgTemperature: avgTemp,
      avgChlorophyll: avgChlor,
      biodiversity,
      biofoulingRisk: avgRisk,
      riskLevel: getRiskLevel(avgRisk),
      dataPoints: zonePoints,
    };
  });
}

// Gerar dados mockados para fallback
function generateMockData(bounds: typeof BRAZIL_COAST_BOUNDS, type: 'temperature' | 'chlorophyll'): any[] {
  const data: any[] = [];
  const now = new Date().toISOString();
  
  // Criar grid denso de pontos ao longo da costa brasileira
  // Usar steps menores para cobertura contínua (heatmap)
  const latStep = 0.15; // ~16km entre pontos
  const lonStep = 0.15; // ~16km entre pontos
  
  // Função para calcular longitude aproximada da costa baseada na latitude
  const getCoastLongitude = (lat: number): number => {
    if (lat >= 4) {
      // Oiapoque, AP - extremo norte
      return -51.0;
    } else if (lat >= 0) {
      // Amapá e Pará (norte)
      return -50.0 + (lat - 0) * 0.3;
    } else if (lat >= -5) {
      // Maranhão e Ceará (nordeste)
      return -38.0 - (lat + 5) * 0.2;
    } else if (lat >= -10) {
      // Pernambuco, Alagoas, Sergipe (nordeste)
      return -35.0 - (lat + 10) * 0.15;
    } else if (lat >= -15) {
      // Bahia (nordeste)
      return -38.0 - (lat + 15) * 0.3;
    } else if (lat >= -20) {
      // Espírito Santo (sudeste)
      return -40.0 - (lat + 20) * 0.2;
    } else if (lat >= -25) {
      // Rio de Janeiro e São Paulo (sudeste)
      return -43.0 - (lat + 25) * 0.15;
    } else if (lat >= -30) {
      // Paraná e Santa Catarina (sul)
      return -48.0 - (lat + 30) * 0.1;
    } else {
      // Rio Grande do Sul (sul)
      return -50.0 - (lat + 34) * 0.05;
    }
  };
  
  // Criar pontos ao longo de toda a extensão da costa
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    const coastLon = getCoastLongitude(lat);
    
    // Criar faixa de pontos ao redor da linha da costa
    // De -3 graus (oeste) até +3 graus (leste) da costa (~300km de cada lado)
    for (let lon = coastLon - 3; lon <= coastLon + 3; lon += lonStep) {
      // Apenas pontos dentro dos bounds
      if (lon >= bounds.minLon && lon <= bounds.maxLon) {
        // Calcular distância da costa para suavizar valores
        const distanceFromCoast = Math.abs(lon - coastLon);
        
        if (type === 'temperature') {
          // Temperatura varia de 18°C (sul) a 28°C (norte)
          // Valores mais próximos da costa são ligeiramente mais quentes
          const baseTemp = 18 + (lat + 34) * 0.25;
          const coastEffect = Math.max(0, 1 - distanceFromCoast / 2) * 1.5; // Efeito da costa
          const variation = (Math.random() - 0.5) * 1.5; // Variação aleatória
          const temp = baseTemp + coastEffect + variation;
          
          data.push({
            time: now,
            lat: lat,
            lng: lon,
            value: Math.max(16, Math.min(30, temp)),
          });
        } else {
          // Clorofila varia de 0.3 (sul) a 3.5 (norte)
          // Valores mais altos próximos da costa (águas mais produtivas)
          const baseChlor = 0.3 + (lat + 34) * 0.08;
          const coastEffect = Math.max(0, 1 - distanceFromCoast / 2) * 1.2; // Efeito da costa
          const variation = (Math.random() - 0.5) * 0.4;
          const chlor = baseChlor + coastEffect + variation;
          
          data.push({
            time: now,
            lat: lat,
            lng: lon,
            value: Math.max(0.1, Math.min(4, chlor)),
          });
        }
      }
    }
  }
  
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get("type") || "all"; // all, temperature, chlorophyll, zones
    const useMock = searchParams.get("mock") === "true"; // Para testes
    
    let tempData: any[] = [];
    let chlorophyllData: any[] = [];
    
    if (useMock) {
      // Usar dados mockados
      tempData = generateMockData(BRAZIL_COAST_BOUNDS, 'temperature');
      chlorophyllData = generateMockData(BRAZIL_COAST_BOUNDS, 'chlorophyll');
    } else {
      // Buscar dados reais do ERDDAP
      try {
        const [temp, chlor] = await Promise.all([
          fetchERDDAPData(
            BIOFOULING_DATASETS.seaSurfaceTemperature.datasetId,
            BIOFOULING_DATASETS.seaSurfaceTemperature.variable,
            BRAZIL_COAST_BOUNDS
          ),
          fetchERDDAPData(
            BIOFOULING_DATASETS.chlorophyll.datasetId,
            BIOFOULING_DATASETS.chlorophyll.variable,
            BRAZIL_COAST_BOUNDS
          )
        ]);
        
        tempData = temp;
        chlorophyllData = chlor;
        
        // Se não conseguiu dados reais, usar mock como fallback
        if (tempData.length === 0 && chlorophyllData.length === 0) {
          console.warn('ERDDAP unavailable, using mock data as fallback');
          tempData = generateMockData(BRAZIL_COAST_BOUNDS, 'temperature');
          chlorophyllData = generateMockData(BRAZIL_COAST_BOUNDS, 'chlorophyll');
        }
      } catch (error: any) {
        console.error('Error fetching ERDDAP data, using mock fallback:', error.message);
        tempData = generateMockData(BRAZIL_COAST_BOUNDS, 'temperature');
        chlorophyllData = generateMockData(BRAZIL_COAST_BOUNDS, 'chlorophyll');
      }
    }
    
    // Combinar dados
    const dataMap = new Map<string, OceanDataPoint>();
    
    // Adicionar dados de temperatura
    tempData.forEach((d) => {
      const key = `${d.lat.toFixed(2)}_${d.lng.toFixed(2)}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          lat: d.lat,
          lng: d.lng,
          timestamp: d.time,
        });
      }
      const point = dataMap.get(key)!;
      point.temperature = d.value;
    });
    
    // Adicionar dados de clorofila
    chlorophyllData.forEach((d) => {
      const key = `${d.lat.toFixed(2)}_${d.lng.toFixed(2)}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          lat: d.lat,
          lng: d.lng,
          timestamp: d.time,
        });
      }
      const point = dataMap.get(key)!;
      point.chlorophyll = d.value;
      point.biodiversity = determineBiodiversity(d.value);
    });
    
    // Calcular risco de biofouling para cada ponto
    const dataPoints: OceanDataPoint[] = Array.from(dataMap.values()).map((point) => {
      const risk = calculateBiofoulingRisk(
        point.temperature || 20,
        point.chlorophyll || 0.5,
        35 // Salinidade padrão para costa brasileira
      );
      return {
        ...point,
        biofoulingRisk: risk,
      };
    });
    
    // Criar zonas
    const zones = createBiofoulingZones(dataPoints);
    
    // Filtrar dados baseado no tipo solicitado
    if (dataType === "temperature") {
      return NextResponse.json({
        type: "temperature",
        data: dataPoints.filter(p => p.temperature !== undefined).map(p => ({
          lat: p.lat,
          lng: p.lng,
          value: p.temperature,
          risk: p.biofoulingRisk,
        })),
        metadata: BIOFOULING_DATASETS.seaSurfaceTemperature,
      });
    }
    
    if (dataType === "chlorophyll") {
      return NextResponse.json({
        type: "chlorophyll",
        data: dataPoints.filter(p => p.chlorophyll !== undefined).map(p => ({
          lat: p.lat,
          lng: p.lng,
          value: p.chlorophyll,
          biodiversity: p.biodiversity,
        })),
        metadata: BIOFOULING_DATASETS.chlorophyll,
      });
    }
    
    if (dataType === "zones") {
      return NextResponse.json({
        type: "zones",
        zones,
        bounds: BRAZIL_COAST_BOUNDS,
      });
    }
    
    // Retornar todos os dados
    return NextResponse.json({
      type: "all",
      dataPoints: dataPoints.slice(0, 1000), // Limitar para performance
      zones,
      bounds: BRAZIL_COAST_BOUNDS,
      datasets: BIOFOULING_DATASETS,
      summary: {
        totalPoints: dataPoints.length,
        avgTemperature: dataPoints.reduce((sum, p) => sum + (p.temperature || 0), 0) / dataPoints.filter(p => p.temperature).length,
        avgChlorophyll: dataPoints.reduce((sum, p) => sum + (p.chlorophyll || 0), 0) / dataPoints.filter(p => p.chlorophyll).length,
        avgRisk: dataPoints.reduce((sum, p) => sum + (p.biofoulingRisk || 0), 0) / dataPoints.length,
      },
    });
  } catch (error: any) {
    console.error("Brazil Coast Oceanography API Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

