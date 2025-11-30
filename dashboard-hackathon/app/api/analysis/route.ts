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
  displacement: string;
  speed: string;
  speedGps: string;
}

interface ConsumptionRecord {
  SESSION_ID: string;
  CONSUMED_QUANTITY: string;
  DESCRIPTION: string;
}

// Calculate biofouling score based on speed degradation and other factors
function calculateBiofoulingScore(
  speedDegradation: number,
  daysInPort: number,
  daysSinceLastCleaning: number
): number {
  // Weights for different factors
  const speedWeight = 0.5;
  const portWeight = 0.2;
  const timeWeight = 0.3;
  
  // Normalize factors (0-100)
  const speedScore = Math.min(100, speedDegradation * 3); // 30% degradation = 90 score
  const portScore = Math.min(100, (daysInPort / 30) * 100); // 30 days in port = 100 score
  const timeScore = Math.min(100, (daysSinceLastCleaning / 365) * 100); // 1 year = 100 score
  
  return Math.round(
    speedScore * speedWeight +
    portScore * portWeight +
    timeScore * timeWeight
  );
}

// Determine risk level based on score
function getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

// POST - Analyze biofouling for the fleet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vesselFilter = searchParams.get('vessel');
    
    // Paths to data files
    const eventsPath = path.join(process.cwd(), '..', 'data', 'ResultadoQueryEventos.csv');
    const consumptionPath = path.join(process.cwd(), '..', 'data', 'ResultadoQueryConsumo.csv');
    
    // Read events data
    const eventsContent = await fs.readFile(eventsPath, 'utf-8');
    const eventsParsed = Papa.parse<EventRecord>(eventsContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Read consumption data
    const consumptionContent = await fs.readFile(consumptionPath, 'utf-8');
    const consumptionParsed = Papa.parse<ConsumptionRecord>(consumptionContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Create consumption mapping by session
    const consumptionBySession: { [key: string]: number } = {};
    consumptionParsed.data.forEach(r => {
      const qty = parseFloat(r.CONSUMED_QUANTITY) || 0;
      if (qty > 0) {
        consumptionBySession[r.SESSION_ID] = (consumptionBySession[r.SESSION_ID] || 0) + qty;
      }
    });
    
    // Get unique vessels
    const vessels = [...new Set(eventsParsed.data.map(r => r.shipName).filter(Boolean))];
    
    // Analyze each vessel
    const vesselAnalysis = vessels
      .filter(v => !vesselFilter || v.toLowerCase().includes(vesselFilter.toLowerCase()))
      .map(vesselName => {
        // Get vessel events
        const vesselEvents = eventsParsed.data.filter(e => e.shipName === vesselName);
        
        // Navigation events (for speed analysis)
        const navigationEvents = vesselEvents
          .filter(e => e.eventName === 'NAVEGACAO' && parseFloat(e.speed) > 5)
          .map(e => ({
            date: new Date(e.startGMTDate),
            speed: parseFloat(e.speed) || 0,
            distance: parseFloat(e.distance) || 0,
            duration: parseFloat(e.duration) || 0,
            displacement: parseFloat(e.displacement) || 0,
            consumption: consumptionBySession[e.sessionId] || 0,
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Port events
        const portEvents = vesselEvents
          .filter(e => e.eventName === 'EM PORTO')
          .map(e => ({
            date: new Date(e.startGMTDate),
            duration: parseFloat(e.duration) || 0,
          }));
        
        // Calculate total port time in days
        const totalPortHours = portEvents.reduce((acc, e) => acc + e.duration, 0);
        const totalPortDays = totalPortHours / 24;
        
        // Group navigation by month for trend analysis
        const monthlyData: { [key: string]: { speeds: number[]; consumptions: number[]; distances: number[] } } = {};
        navigationEvents.forEach(e => {
          const monthKey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { speeds: [], consumptions: [], distances: [] };
          }
          if (e.speed > 0) monthlyData[monthKey].speeds.push(e.speed);
          if (e.consumption > 0) monthlyData[monthKey].consumptions.push(e.consumption);
          if (e.distance > 0) monthlyData[monthKey].distances.push(e.distance);
        });
        
        // Calculate monthly averages
        const monthlyAnalysis = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => {
            const avgSpeed = data.speeds.length > 0 
              ? data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length 
              : 0;
            const totalConsumption = data.consumptions.reduce((a, b) => a + b, 0);
            const totalDistance = data.distances.reduce((a, b) => a + b, 0);
            const efficiency = totalDistance > 0 ? totalConsumption / totalDistance : 0;
            
            return {
              month,
              avgSpeed: parseFloat(avgSpeed.toFixed(2)),
              totalConsumption: parseFloat(totalConsumption.toFixed(2)),
              totalDistance: parseFloat(totalDistance.toFixed(2)),
              efficiency: parseFloat(efficiency.toFixed(4)),
              dataPoints: data.speeds.length,
            };
          });
        
        // Calculate baseline (first 3 months average) vs current
        const baselineMonths = monthlyAnalysis.slice(0, 3);
        const recentMonths = monthlyAnalysis.slice(-3);
        
        const baselineSpeed = baselineMonths.length > 0
          ? baselineMonths.reduce((acc, m) => acc + m.avgSpeed, 0) / baselineMonths.length
          : 12; // Default baseline
        
        const currentSpeed = recentMonths.length > 0
          ? recentMonths.reduce((acc, m) => acc + m.avgSpeed, 0) / recentMonths.length
          : baselineSpeed;
        
        const speedDegradation = baselineSpeed > 0
          ? ((baselineSpeed - currentSpeed) / baselineSpeed) * 100
          : 0;
        
        // Efficiency analysis
        const baselineEfficiency = baselineMonths.length > 0 && baselineMonths.some(m => m.efficiency > 0)
          ? baselineMonths.filter(m => m.efficiency > 0).reduce((acc, m) => acc + m.efficiency, 0) / baselineMonths.filter(m => m.efficiency > 0).length
          : 0;
        
        const currentEfficiency = recentMonths.length > 0 && recentMonths.some(m => m.efficiency > 0)
          ? recentMonths.filter(m => m.efficiency > 0).reduce((acc, m) => acc + m.efficiency, 0) / recentMonths.filter(m => m.efficiency > 0).length
          : 0;
        
        const efficiencyDegradation = baselineEfficiency > 0
          ? ((currentEfficiency - baselineEfficiency) / baselineEfficiency) * 100
          : 0;
        
        // Calculate days since start (simulating days since last cleaning)
        const firstEvent = vesselEvents[0]?.startGMTDate 
          ? new Date(vesselEvents[0].startGMTDate)
          : new Date();
        const daysSinceStart = Math.floor((Date.now() - firstEvent.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate biofouling score
        const biofoulingScore = calculateBiofoulingScore(
          Math.max(0, speedDegradation),
          totalPortDays,
          daysSinceStart
        );
        
        // Estimate fuel penalty (approximately 1% fuel increase per 1% speed loss)
        const fuelPenalty = Math.max(0, efficiencyDegradation);
        
        // Estimate CO2 impact
        const avgDailyConsumption = recentMonths.length > 0
          ? recentMonths.reduce((acc, m) => acc + m.totalConsumption, 0) / recentMonths.length / 30
          : 30; // Default estimate
        const excessCO2 = avgDailyConsumption * (fuelPenalty / 100) * 3.17; // 3.17 tons CO2 per ton fuel
        
        // Predict cleaning date
        const degradationRate = monthlyAnalysis.length > 1
          ? (monthlyAnalysis[monthlyAnalysis.length - 1].avgSpeed - monthlyAnalysis[0].avgSpeed) / monthlyAnalysis.length
          : -0.1;
        
        const monthsUntilCritical = degradationRate < 0
          ? Math.floor((currentSpeed - baselineSpeed * 0.75) / Math.abs(degradationRate))
          : 12;
        
        const predictedCleaningDate = new Date();
        predictedCleaningDate.setMonth(predictedCleaningDate.getMonth() + Math.max(1, monthsUntilCritical));
        
        return {
          vesselName,
          vesselClass: vesselEvents[0]?.class || 'Unknown',
          biofoulingScore,
          riskLevel: getRiskLevel(biofoulingScore),
          
          speedAnalysis: {
            baselineSpeed: parseFloat(baselineSpeed.toFixed(2)),
            currentSpeed: parseFloat(currentSpeed.toFixed(2)),
            speedLoss: parseFloat((baselineSpeed - currentSpeed).toFixed(2)),
            speedDegradation: parseFloat(Math.max(0, speedDegradation).toFixed(2)),
          },
          
          fuelAnalysis: {
            baselineEfficiency: parseFloat(baselineEfficiency.toFixed(4)),
            currentEfficiency: parseFloat(currentEfficiency.toFixed(4)),
            fuelPenalty: parseFloat(Math.max(0, fuelPenalty).toFixed(2)),
            co2ImpactPerDay: parseFloat(excessCO2.toFixed(2)),
          },
          
          operationalData: {
            totalPortDays: parseFloat(totalPortDays.toFixed(1)),
            totalNavigationEvents: navigationEvents.length,
            dataStartDate: vesselEvents[0]?.startGMTDate || '',
            dataEndDate: vesselEvents[vesselEvents.length - 1]?.endGMTDate || '',
          },
          
          prediction: {
            predictedCleaningDate: predictedCleaningDate.toISOString().split('T')[0],
            monthsUntilCritical: Math.max(1, monthsUntilCritical),
            trend: speedDegradation > 5 ? 'degrading' : speedDegradation > 0 ? 'stable' : 'improving',
          },
          
          monthlyTrend: monthlyAnalysis,
        };
      })
      .sort((a, b) => b.biofoulingScore - a.biofoulingScore);
    
    // Fleet summary
    const fleetSummary = {
      totalVessels: vesselAnalysis.length,
      criticalVessels: vesselAnalysis.filter(v => v.riskLevel === 'critical').length,
      highRiskVessels: vesselAnalysis.filter(v => v.riskLevel === 'high').length,
      moderateRiskVessels: vesselAnalysis.filter(v => v.riskLevel === 'moderate').length,
      lowRiskVessels: vesselAnalysis.filter(v => v.riskLevel === 'low').length,
      avgBiofoulingScore: parseFloat((vesselAnalysis.reduce((acc, v) => acc + v.biofoulingScore, 0) / vesselAnalysis.length).toFixed(1)),
      avgSpeedDegradation: parseFloat((vesselAnalysis.reduce((acc, v) => acc + v.speedAnalysis.speedDegradation, 0) / vesselAnalysis.length).toFixed(2)),
      totalCO2ImpactPerDay: parseFloat(vesselAnalysis.reduce((acc, v) => acc + v.fuelAnalysis.co2ImpactPerDay, 0).toFixed(2)),
      avgFuelPenalty: parseFloat((vesselAnalysis.reduce((acc, v) => acc + v.fuelAnalysis.fuelPenalty, 0) / vesselAnalysis.length).toFixed(2)),
    };
    
    return NextResponse.json({
      success: true,
      fleetSummary,
      vessels: vesselAnalysis,
    });
    
  } catch (error) {
    console.error('Error analyzing biofouling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze biofouling data', details: String(error) },
      { status: 500 }
    );
  }
}

