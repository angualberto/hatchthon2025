// ============================================
// REAL DATA TYPE DEFINITIONS
// Based on Transpetro Hackathon Data Files
// ============================================

// ResultadoQueryEventos.csv - Operational Events
export interface OperationalEvent {
  sessionId: number;
  shipName: string;
  class: 'Aframax' | 'Suezmax' | 'VLCC' | 'Panamax' | string;
  eventName: 'NAVEGACAO' | 'EM PORTO' | 'FUNDEIO' | 'MANOBRA' | string;
  startGMTDate: string;
  endGMTDate: string;
  duration: number; // hours
  distance: number | null; // nautical miles
  aftDraft: number | null;
  fwdDraft: number | null;
  midDraft: number | null;
  trim: number | null;
  displacement: number | null; // tons
  beaufortScale: number | null;
  seaCondition: number | null;
  beaufortScaleDesc: string | null;
  seaConditionDesc: string | null;
  speed: number | null; // knots
  speedGps: number | null; // knots
  porto: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ResultadoQueryConsumo.csv - Fuel Consumption
export interface FuelConsumption {
  sessionId: number;
  consumedQuantity: number | null; // tons
  description: 'LSHFO 0.5' | 'ULSMGO 0.1' | string; // Fuel type
}

// RelatoriosIWS.xlsx - Hull Inspection/Cleaning Reports
export interface HullInspectionReport {
  vesselName: string;
  inspectionDate: string;
  inspectionType: 'UNDERWATER' | 'DRYDOCK' | 'CLEANING' | string;
  location: string;
  foulingLevel: number; // 1-10 scale
  foulingDescription: string;
  recommendations: string;
  cleaningPerformed: boolean;
  nextInspectionDate: string | null;
  reportId: string;
}

// Dados Navios Hackathon.xlsx - Vessel Construction Data
export interface VesselConstructionData {
  vesselName: string;
  imoNumber: string;
  mmsi: string;
  class: string;
  dwt: number; // Deadweight tonnage
  lengthOverall: number; // meters
  beam: number; // meters
  draft: number; // meters
  yearBuilt: number;
  
  // Docking information
  lastDrydockDate: string;
  nextDrydockDate: string;
  dockingCycleMonths: number;
  
  // Paint specifications
  paintType: string;
  paintManufacturer: string;
  applicationDate: string;
  antifoulingType: 'SPC' | 'FOUL_RELEASE' | 'BIOCIDE' | string;
  expectedLifeMonths: number;
  
  // Hull area
  underwaterArea: number; // m²
  flatBottomArea: number; // m²
  verticalSideArea: number; // m²
}

// Processed analysis types
export interface SpeedAnalysis {
  vesselName: string;
  period: string;
  avgSpeed: number;
  baselineSpeed: number;
  speedLoss: number;
  speedLossPercentage: number;
  dataPoints: number;
}

export interface FuelAnalysis {
  vesselName: string;
  period: string;
  totalConsumption: number;
  avgDailyConsumption: number;
  navigationHours: number;
  portHours: number;
  fuelType: string;
}

export interface BiofoulingAnalysis {
  vesselName: string;
  currentScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  speedDegradation: number;
  fuelPenalty: number;
  co2Impact: number;
  daysSinceLastCleaning: number;
  predictedCleaningDate: string;
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
}

// Event type mapping for Portuguese
export const EVENT_TYPES = {
  'NAVEGACAO': 'Navegação',
  'EM PORTO': 'Em Porto',
  'FUNDEIO': 'Fundeio',
  'MANOBRA': 'Manobra',
  'ATRACADO': 'Atracado',
} as const;

// Fuel type mapping
export const FUEL_TYPES = {
  'LSHFO 0.5': 'Low Sulphur Heavy Fuel Oil (0.5%)',
  'ULSMGO 0.1': 'Ultra Low Sulphur Marine Gas Oil (0.1%)',
} as const;

// Beaufort Scale descriptions
export const BEAUFORT_SCALE = {
  0: 'Calm',
  1: 'Light air',
  2: 'Light breeze',
  3: 'Gentle breeze',
  4: 'Moderate breeze',
  5: 'Fresh breeze',
  6: 'Strong breeze',
  7: 'Near gale',
  8: 'Gale',
  9: 'Strong gale',
  10: 'Storm',
  11: 'Violent storm',
  12: 'Hurricane',
} as const;

// Sea condition descriptions
export const SEA_CONDITIONS = {
  0: 'Calm (glassy)',
  1: 'Calm (rippled)',
  2: 'Smooth (wavelets)',
  3: 'Slight',
  4: 'Moderate',
  5: 'Rough',
  6: 'Very rough',
  7: 'High',
  8: 'Very high',
  9: 'Phenomenal',
} as const;

