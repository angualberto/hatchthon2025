// ============================================
// BIOFOULING DASHBOARD - TYPE DEFINITIONS
// ============================================

// Vessel AIS Data Point
export interface AISDataPoint {
  nome: string;
  dataHora: Date;
  rumo: number; // heading in degrees
  velocidade: number; // speed in knots
  latitude: number;
  longitude: number;
}

// Vessel Information
export interface Vessel {
  id: string;
  name: string;
  type: 'tanker' | 'cargo' | 'support' | 'tug';
  imo: string;
  mmsi: string;
  length: number; // meters
  beam: number; // meters
  draft: number; // meters
  yearBuilt: number;
  lastDrydock: Date;
  nextDrydock: Date;
  currentPosition: {
    latitude: number;
    longitude: number;
  };
  currentSpeed: number;
  currentHeading: number;
  status: 'sailing' | 'anchored' | 'moored' | 'maintenance';
  biofoulingRisk: BiofoulingRisk;
  fuelEfficiency: FuelEfficiency;
}

// Biofouling Risk Assessment
export interface BiofoulingRisk {
  level: 'low' | 'moderate' | 'high' | 'critical';
  score: number; // 0-100
  lastAssessment: Date;
  predictedCleaningDate: Date;
  factors: BiofoulingFactor[];
  trend: 'improving' | 'stable' | 'degrading';
}

export interface BiofoulingFactor {
  name: string;
  impact: number; // 0-100
  description: string;
}

// Fuel Efficiency Metrics
export interface FuelEfficiency {
  current: number; // tons per nautical mile
  baseline: number; // clean hull baseline
  degradation: number; // percentage increase from baseline
  estimatedExtraFuel: number; // tons per day
  co2Impact: number; // extra CO2 tons per day
}

// Fleet Statistics
export interface FleetStats {
  totalVessels: number;
  activeVessels: number;
  vesselsAtRisk: number;
  averageBiofoulingScore: number;
  totalFuelWaste: number; // tons per day
  totalCO2Impact: number; // tons per day
  estimatedSavings: number; // USD per month
}

// Dashboard KPI Card
export interface KPIData {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  description?: string;
}

// Chart Data Types
export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface SpeedPerformanceData {
  date: string;
  expectedSpeed: number;
  actualSpeed: number;
  biofoulingImpact: number;
}

export interface FuelConsumptionData {
  date: string;
  baseline: number;
  actual: number;
  excess: number;
}

// Alert/Notification
export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success';
  title: string;
  message: string;
  vesselId?: string;
  vesselName?: string;
  timestamp: Date;
  read: boolean;
}

// Maintenance Record
export interface MaintenanceRecord {
  id: string;
  vesselId: string;
  type: 'drydock' | 'cleaning' | 'inspection' | 'repair';
  date: Date;
  description: string;
  cost?: number;
  biofoulingScoreBefore?: number;
  biofoulingScoreAfter?: number;
}

// Environmental Conditions
export interface EnvironmentalConditions {
  waterTemperature: number; // Celsius
  salinity: number; // PSU
  chlorophyll: number; // μg/L
  region: string;
  biofoulingPressure: 'low' | 'moderate' | 'high';
}

// Route Information
export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance: number; // nautical miles
  estimatedDuration: number; // hours
  waypoints: { lat: number; lng: number }[];
}

