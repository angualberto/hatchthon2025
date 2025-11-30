'use client';

import { useState, useEffect, useCallback } from 'react';

// Types for API responses
interface FleetAnalysis {
  success: boolean;
  fleetSummary: {
    totalVessels: number;
    criticalVessels: number;
    highRiskVessels: number;
    moderateRiskVessels: number;
    lowRiskVessels: number;
    avgBiofoulingScore: number;
    avgSpeedDegradation: number;
    totalCO2ImpactPerDay: number;
    avgFuelPenalty: number;
  };
  vessels: VesselAnalysis[];
}

interface VesselAnalysis {
  vesselName: string;
  vesselClass: string;
  biofoulingScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  speedAnalysis: {
    baselineSpeed: number;
    currentSpeed: number;
    speedLoss: number;
    speedDegradation: number;
  };
  fuelAnalysis: {
    baselineEfficiency: number;
    currentEfficiency: number;
    fuelPenalty: number;
    co2ImpactPerDay: number;
  };
  operationalData: {
    totalPortDays: number;
    totalNavigationEvents: number;
    dataStartDate: string;
    dataEndDate: string;
  };
  prediction: {
    predictedCleaningDate: string;
    monthsUntilCritical: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  monthlyTrend: {
    month: string;
    avgSpeed: number;
    totalConsumption: number;
    totalDistance: number;
    efficiency: number;
    dataPoints: number;
  }[];
}

interface EventsData {
  success: boolean;
  stats: {
    totalRecords: number;
    returnedRecords: number;
    vessels: string[];
    eventTypes: string[];
    navigation: {
      totalHours: number;
      totalDistance: number;
      avgSpeed: number;
    };
    port: {
      totalHours: number;
      events: number;
    };
  };
  data: OperationalEvent[];
}

interface OperationalEvent {
  sessionId: number;
  shipName: string;
  class: string;
  eventName: string;
  startGMTDate: string;
  endGMTDate: string;
  duration: number;
  distance: number | null;
  speed: number | null;
  speedGps: number | null;
  porto: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ConsumptionData {
  success: boolean;
  stats: {
    totalConsumption: number;
    avgConsumption: number;
    estimatedCO2: number;
    byVessel: {
      vessel: string;
      totalConsumption: number;
      totalDistance: number;
      efficiency: number;
      avgSpeed: number;
    }[];
    byFuelType: { [key: string]: number };
  };
}

// Hook to fetch fleet analysis
export function useFleetAnalysis(vesselFilter?: string) {
  const [data, setData] = useState<FleetAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url = vesselFilter 
        ? `/api/analysis?vessel=${encodeURIComponent(vesselFilter)}`
        : '/api/analysis';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch analysis');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Error fetching fleet analysis:', err);
    } finally {
      setLoading(false);
    }
  }, [vesselFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook to fetch operational events
export function useEvents(options?: { vessel?: string; event?: string; limit?: number }) {
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options?.vessel) params.set('vessel', options.vessel);
      if (options?.event) params.set('event', options.event);
      if (options?.limit) params.set('limit', options.limit.toString());
      
      const url = `/api/events?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [options?.vessel, options?.event, options?.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook to fetch fuel consumption data
export function useConsumption(options?: { vessel?: string; fuelType?: string }) {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options?.vessel) params.set('vessel', options.vessel);
      if (options?.fuelType) params.set('fuelType', options.fuelType);
      
      const url = `/api/consumption?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch consumption data');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Error fetching consumption:', err);
    } finally {
      setLoading(false);
    }
  }, [options?.vessel, options?.fuelType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Combined hook for dashboard data
export function useDashboardData() {
  const analysis = useFleetAnalysis();
  const consumption = useConsumption();

  return {
    analysis,
    consumption,
    loading: analysis.loading || consumption.loading,
    error: analysis.error || consumption.error,
  };
}

export type { FleetAnalysis, VesselAnalysis, EventsData, ConsumptionData, OperationalEvent };

