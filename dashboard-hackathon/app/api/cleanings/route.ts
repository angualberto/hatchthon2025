import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface CleaningRecord {
  Classe?: string;
  Embarcação?: string;
  Sigla?: string;
  Data?: string;
  'Local de realização'?: string;
  'Regiões do casco limpas'?: string;
  'Condição geral da embarcação'?: string;
  'Tipo de incrustação da embarcação'?: string;
  'Condição do fundo chato'?: string;
  'Tipo de incrustação do fundo chato'?: string;
  'Condição do costado'?: string;
  'Tipo de incrustação do costado'?: string;
  'Condição do hélice'?: string;
  'Tipo de incrustação do hélice'?: string;
  [key: string]: any; // For unknown columns
}

interface CleaningEvent {
  shipName: string;
  date: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  type: string | null;
  port: string | null;
  shipClass?: string;
  cleanedRegions?: string;
  condition?: string;
  foulingType?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipFilter = searchParams.get('ship');

    // Try multiple possible paths for the CSV file
    const possiblePaths = [
      path.join(process.cwd(), '..', 'data', 'RelatoriosIWS.csv'),
      path.join(process.cwd(), 'data', 'RelatoriosIWS.csv'),
      path.resolve(process.cwd(), '..', 'data', 'RelatoriosIWS.csv'),
    ];

    let csvPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      const resolvedPath = path.resolve(possiblePath);
      if (fs.existsSync(resolvedPath)) {
        csvPath = resolvedPath;
        break;
      }
    }

    if (!csvPath) {
      return NextResponse.json({
        success: false,
        error: 'CSV file not found',
        attemptedPaths: possiblePaths.map(p => path.resolve(p)),
        currentWorkingDir: process.cwd(),
      }, { status: 404 });
    }

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const parseResult = Papa.parse<CleaningRecord>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Trim whitespace from headers
    });

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found in CSV file',
      }, { status: 404 });
    }

    const rawData = parseResult.data;

    // Normalize and process records
    const cleanings: CleaningEvent[] = [];

    for (const record of rawData) {
      // Get ship name from "Embarcação" column and normalize
      const shipName = record.Embarcação?.trim() || '';
      
      if (!shipName) continue;
      
      // Normalize ship name for filtering (case-insensitive)
      if (shipFilter && shipName.toUpperCase() !== shipFilter.toUpperCase()) continue;

      // Get date from "Data" column
      const dateValue = record.Data?.trim() || '';
      if (!dateValue) continue;

      // Parse date - handle different formats
      let dateStr: string; 
      try {
        // Handle date range format like "18/06/2025-23/06/2025"
        if (dateValue.includes('-')) {
          const firstDate = dateValue.split('-')[0].trim();
          const parsed = new Date(firstDate.split('/').reverse().join('-'));
          if (isNaN(parsed.getTime())) continue;
          dateStr = parsed.toISOString().split('T')[0];
        } else {
          // Handle standard format like "2025-08-29 00:00:00" or "18/06/2025"
          let parsed: Date;
          if (dateValue.includes('/')) {
            // DD/MM/YYYY format
            const parts = dateValue.split('/');
            if (parts.length === 3) {
              parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              parsed = new Date(dateValue);
            }
          } else {
            parsed = new Date(dateValue);
          }
          
          if (isNaN(parsed.getTime())) continue;
          dateStr = parsed.toISOString().split('T')[0];
        }
      } catch (err) {
        console.warn('Failed to parse date:', dateValue, err);
        continue;
      }

      // Get location from "Local de realização" column
      const location = record['Local de realização']?.trim() || null;

      // Extract port name from location (e.g., "Angra dos Reis/RJ" -> "Angra dos Reis")
      // Handle formats: "Angra dos Reis/RJ", "Niterói- RJ", "São Sebastião/SP"
      let port: string | null = null;
      if (location) {
        // Try splitting by / first
        if (location.includes('/')) {
          port = location.split('/')[0].trim();
        } 
        // Try splitting by - (with space)
        else if (location.includes('-')) {
          port = location.split('-')[0].trim();
        }
        // Otherwise use the whole location
        else {
          port = location.trim();
        }
      }

      // Get additional information
      const shipClass = record.Classe?.trim() || null;
      const cleanedRegions = record['Regiões do casco limpas']?.trim() || null;
      const condition = record['Condição geral da embarcação']?.trim() || null;
      const foulingType = record['Tipo de incrustação da embarcação']?.trim() || null;

      // Determine cleaning type based on cleaned regions
      let type = 'Limpeza';
      if (cleanedRegions) {
        if (cleanedRegions.toLowerCase().includes('geral')) {
          type = 'Limpeza Geral';
        } else if (cleanedRegions.toLowerCase().includes('fundo')) {
          type = 'Limpeza do Fundo';
        } else if (cleanedRegions.toLowerCase().includes('costado')) {
          type = 'Limpeza do Costado';
        } else if (cleanedRegions.toLowerCase().includes('hélice') || cleanedRegions.toLowerCase().includes('propulsor')) {
          type = 'Limpeza do Propulsor';
        }
      }

      cleanings.push({
        shipName,
        date: dateStr,
        location,
        latitude: null, // Will be filled later from port matching
        longitude: null,
        type,
        port,
        shipClass: shipClass || undefined,
        cleanedRegions: cleanedRegions || undefined,
        condition: condition || undefined,
        foulingType: foulingType || undefined,
      });
    }

    // Known port coordinates (for ports not in events file)
    const knownPorts: { [key: string]: { lat: number; lng: number } } = {
      'Angra dos Reis': { lat: -23.0067, lng: -44.3181 },
      'São Sebastião': { lat: -23.8103, lng: -45.4097 },
      'São Sebastiao': { lat: -23.8103, lng: -45.4097 },
      'Salvador': { lat: -12.9714, lng: -38.5014 },
      'Singapura': { lat: 1.2897, lng: 103.8501 },
      'Singapore': { lat: 1.2897, lng: 103.8501 },
      'Rotterdam': { lat: 51.9225, lng: 4.4772 },
      'Gibraltar': { lat: 36.1408, lng: -5.3536 },
      'Fujaira': { lat: 25.1288, lng: 56.3264 },
      'Fujairah': { lat: 25.1288, lng: 56.3264 },
      'Ipojuca': { lat: -8.3833, lng: -34.9500 },
      'Suape': { lat: -8.3833, lng: -34.9500 },
      'Fortaleza': { lat: -3.7172, lng: -38.5433 },
      'Niterói': { lat: -22.8834, lng: -43.1033 },
      'Niteroi': { lat: -22.8834, lng: -43.1033 },
      'Baía de todos os santos': { lat: -12.9714, lng: -38.5014 },
      'Baia de todos os santos': { lat: -12.9714, lng: -38.5014 },
    };

    // If no coordinates, try to match with port locations from events data
    const eventsPathOptions = [
      path.join(process.cwd(), '..', 'data', 'ResultadoQueryEventos.csv'),
      path.resolve(process.cwd(), '..', 'data', 'ResultadoQueryEventos.csv'),
    ];
    
    let eventsPath: string | null = null;
    for (const option of eventsPathOptions) {
      if (fs.existsSync(option)) {
        eventsPath = option;
        break;
      }
    }
    
    const portLocations: { [port: string]: { lat: number; lng: number } } = { ...knownPorts };
    
    if (eventsPath) {
      const eventsContent = fs.readFileSync(eventsPath, 'utf-8');
      const eventsParsed = Papa.parse(eventsContent, {
        header: true,
        skipEmptyLines: true,
      });

      // Add port locations from events file
      eventsParsed.data.forEach((event: any) => {
        if (event.Porto && event.decLatitude && event.decLongitude) {
          const port = event.Porto.trim();
          const lat = parseFloat(event.decLatitude);
          const lng = parseFloat(event.decLongitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            // Normalize port name (case-insensitive)
            const normalizedPort = port.toLowerCase();
            if (!portLocations[normalizedPort] && !Object.values(portLocations).some(p => 
              Math.abs(p.lat - lat) < 0.01 && Math.abs(p.lng - lng) < 0.01
            )) {
              portLocations[port] = { lat, lng };
              portLocations[normalizedPort] = { lat, lng };
            }
          }
        }
      });
    }

    // Function to find ship position from events data
    const findShipPositionFromEvents = (shipName: string, cleaningDate: string): { lat: number; lng: number } | null => {
      if (!eventsPath) return null;

      try {
        interface EventRecord {
          shipName?: string;
          startGMTDate?: string;
          decLatitude?: string;
          decLongitude?: string;
          Porto?: string;
        }

        const eventsContent = fs.readFileSync(eventsPath, 'utf-8');
        const eventsParsed = Papa.parse<EventRecord>(eventsContent, {
          header: true,
          skipEmptyLines: true,
        });

        const cleaningDateObj = new Date(cleaningDate);
        if (isNaN(cleaningDateObj.getTime())) return null;

        // Find events for this ship around cleaning date (within 7 days)
        let closestEvent: { lat: number; lng: number } | null = null;
        let minTimeDiff = Infinity;
        const maxDiffMs = 7 * 24 * 60 * 60 * 1000;

        for (const event of eventsParsed.data) {
          const eventShipName = event.shipName?.toString().trim().toUpperCase() || '';
          const normalizedShipName = shipName.toUpperCase();
          
          if (eventShipName !== normalizedShipName) continue;

          if (!event.startGMTDate || !event.decLatitude || !event.decLongitude) continue;

          try {
            const eventDate = new Date(event.startGMTDate);
            if (isNaN(eventDate.getTime())) continue;

            const timeDiff = Math.abs(eventDate.getTime() - cleaningDateObj.getTime());
            
            if (timeDiff < minTimeDiff && timeDiff <= maxDiffMs) {
              const lat = parseFloat(event.decLatitude);
              const lng = parseFloat(event.decLongitude);
              
              if (!isNaN(lat) && !isNaN(lng)) {
                minTimeDiff = timeDiff;
                closestEvent = { lat, lng };
              }
            }
          } catch (err) {
            continue;
          }
        }

        if (closestEvent) {
          const daysDiff = Math.round(minTimeDiff / (24 * 60 * 60 * 1000));
          console.log(`Found event position for ${shipName} on ${cleaningDate}: ${closestEvent.lat}, ${closestEvent.lng} (${daysDiff} days from cleaning)`);
          return closestEvent;
        }

        return null;
      } catch (error) {
        console.error(`Error finding event position for ${shipName}:`, error);
        return null;
      }
    };

    // Function to find ship position from AIS data
    const findShipPositionFromAIS = (shipName: string, cleaningDate: string): { lat: number; lng: number } | null => {
      try {
        // Normalize ship name to match CSV filename
        const normalizeShipName = (name: string): string => {
          return name
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, '')
            .trim();
        };

        const normalizedName = normalizeShipName(shipName);
        
        // Try to find AIS file
        const aisDataPath = path.join(process.cwd(), '..', 'Dados AIS frota TP');
        if (!fs.existsSync(aisDataPath)) {
          return null;
        }

        const files = fs.readdirSync(aisDataPath);
        const csvFiles = files.filter(f => f.endsWith('.csv'));
        
        // Find matching CSV file
        const matchingFile = csvFiles.find(file => {
          const fileName = file.replace('.csv', '').toUpperCase();
          return fileName === normalizedName || 
                 fileName.includes(normalizedName) || 
                 normalizedName.includes(fileName);
        });

        if (!matchingFile) {
          console.warn(`AIS file not found for ship: ${shipName} (normalized: ${normalizedName})`);
          return null;
        }

        // Read AIS file
        const aisFilePath = path.join(aisDataPath, matchingFile);
        const aisContent = fs.readFileSync(aisFilePath, 'utf-8');
        
        // Parse AIS CSV
        interface AISRecord {
          NOME?: string;
          DATAHORA?: string;
          RUMO?: string;
          VELOCIDADE?: string;
          LATITUDE?: string;
          LONGITUDE?: string;
        }

        const aisParsed = Papa.parse<AISRecord>(aisContent, {
          header: true,
          skipEmptyLines: true,
        });

        if (!aisParsed.data || aisParsed.data.length === 0) {
          return null;
        }

        // Parse cleaning date
        const cleaningDateObj = new Date(cleaningDate);
        if (isNaN(cleaningDateObj.getTime())) {
          return null;
        }

        // Find closest AIS record to cleaning date (within 30 days to catch stops)
        // Prioritize records with low speed (likely at port/cleaning location)
        let closestRecord: AISRecord | null = null;
        let minTimeDiff = Infinity;
        const maxDiffMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        for (const record of aisParsed.data) {
          if (!record.DATAHORA || !record.LATITUDE || !record.LONGITUDE) continue;

          try {
            const recordDate = new Date(record.DATAHORA);
            if (isNaN(recordDate.getTime())) continue;

            const timeDiff = Math.abs(recordDate.getTime() - cleaningDateObj.getTime());
            
            // Prefer records within 7 days, but accept up to 30 days
            if (timeDiff <= maxDiffMs) {
              // Prioritize records with low speed (likely stopped/at port)
              const speed = parseFloat(record.VELOCIDADE || '0') || 0;
              const speedBonus = speed < 2 ? 0.5 : speed < 5 ? 0.2 : 0; // Prefer slower speeds
              const adjustedTimeDiff = timeDiff - (speedBonus * 24 * 60 * 60 * 1000);
              
              if (adjustedTimeDiff < minTimeDiff) {
                minTimeDiff = timeDiff; // Store actual time diff for logging
                closestRecord = record;
              }
            }
          } catch (err) {
            continue;
          }
        }

        if (closestRecord && closestRecord.LATITUDE && closestRecord.LONGITUDE) {
          const lat = parseFloat(closestRecord.LATITUDE);
          const lng = parseFloat(closestRecord.LONGITUDE);
          
          if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            const daysDiff = Math.round(minTimeDiff / (24 * 60 * 60 * 1000));
            console.log(`Found AIS position for ${shipName} on ${cleaningDate}: ${lat}, ${lng} (${daysDiff} days from cleaning)`);
            return { lat, lng };
          }
        }

        return null;
      } catch (error) {
        console.error(`Error finding AIS position for ${shipName}:`, error);
        return null;
      }
    };

    // Match cleanings - PRIORITY: AIS data > Events data > Port locations
    // Always try AIS first (most accurate - real position on cleaning date)
    cleanings.forEach((cleaning) => {
      // FIRST: Try to find exact position from AIS data (most accurate)
      const aisPosition = findShipPositionFromAIS(cleaning.shipName, cleaning.date);
      if (aisPosition) {
        cleaning.latitude = aisPosition.lat;
        cleaning.longitude = aisPosition.lng;
        console.log(`✅ AIS: Found exact position for ${cleaning.shipName} on ${cleaning.date}: ${aisPosition.lat}, ${aisPosition.lng}`);
        return; // Skip other methods if AIS found
      }
      
      // SECOND: Try to find from events data
      const eventPosition = findShipPositionFromEvents(cleaning.shipName, cleaning.date);
      if (eventPosition) {
        cleaning.latitude = eventPosition.lat;
        cleaning.longitude = eventPosition.lng;
        console.log(`✅ EVENT: Found position for ${cleaning.shipName} on ${cleaning.date}: ${eventPosition.lat}, ${eventPosition.lng}`);
        return; // Skip port matching if event found
      }
      
      // THIRD: Only if no AIS/Event data, try port matching (less accurate)
      if (!cleaning.latitude && !cleaning.longitude && cleaning.location) {
        // Normalize location string - remove state/country codes and special chars
        const normalizePortName = (name: string): string[] => {
          const cleaned = name
            .replace(/\/[A-Z]{2}$/i, '') // Remove /RJ, /SP, etc.
            .replace(/\s*-\s*[A-Z]{2}$/i, '') // Remove - RJ, - SP, etc.
            .replace(/[^a-zA-Z0-9\s]/g, ' ') // Replace special chars with space
            .trim()
            .toLowerCase();
          
          return [
            cleaned,
            cleaned.replace(/\s+/g, ' '), // Normalize spaces
            name.trim().toLowerCase(), // Original lowercased
          ];
        };
        
        const locationVariations = normalizePortName(cleaning.location);
        const portVariations = cleaning.port ? normalizePortName(cleaning.port) : [];
        const allVariations = [...new Set([...locationVariations, ...portVariations])];
        
        // Try exact match first (case-insensitive)
        let portLocation: { lat: number; lng: number } | null = null;
        
        for (const variation of allVariations) {
          // Try direct lookup
          if (portLocations[variation]) {
            portLocation = portLocations[variation];
            break;
          }
          
          // Try case-insensitive lookup
          for (const [portName, coords] of Object.entries(portLocations)) {
            if (portName.toLowerCase() === variation) {
              portLocation = coords;
              break;
            }
          }
          
          if (portLocation) break;
        }
        
        // Try partial match if still no match
        if (!portLocation) {
          const searchTerms = allVariations.filter(v => v.length > 3); // Only meaningful terms
          
          for (const searchTerm of searchTerms) {
            for (const [portName, coords] of Object.entries(portLocations)) {
              const portNameLower = portName.toLowerCase();
              
              // Check if search term is contained in port name or vice versa
              if (portNameLower.includes(searchTerm) || searchTerm.includes(portNameLower)) {
                // Additional check: at least 70% of characters match
                const longer = searchTerm.length > portNameLower.length ? searchTerm : portNameLower;
                const shorter = searchTerm.length > portNameLower.length ? portNameLower : searchTerm;
                
                if (shorter.length / longer.length >= 0.7) {
                  portLocation = coords;
                  break;
                }
              }
            }
            
            if (portLocation) break;
          }
        }
        
        if (portLocation) {
          cleaning.latitude = portLocation.lat;
          cleaning.longitude = portLocation.lng;
          console.log(`⚠️ PORT: Using port location for ${cleaning.shipName} on ${cleaning.date}: ${portLocation.lat}, ${portLocation.lng} (location: ${cleaning.location})`);
        } else {
          console.warn(`❌ Could not find coordinates for cleaning: ${cleaning.shipName} on ${cleaning.date} at ${cleaning.location || cleaning.port || 'unknown location'}`);
        }
      }
    });

    // Group by ship
    const cleaningsByShip: { [shipName: string]: CleaningEvent[] } = {};
    cleanings.forEach((cleaning) => {
      if (!cleaningsByShip[cleaning.shipName]) {
        cleaningsByShip[cleaning.shipName] = [];
      }
      cleaningsByShip[cleaning.shipName].push(cleaning);
    });

    // Calculate statistics
    const stats = {
      totalCleanings: cleanings.length,
      totalShips: Object.keys(cleaningsByShip).length,
      cleaningsWithLocation: cleanings.filter(c => c.latitude && c.longitude).length,
      cleaningsByYear: {} as { [year: string]: number },
      cleaningsWithoutLocation: cleanings.filter(c => !c.latitude || !c.longitude).map(c => ({
        shipName: c.shipName,
        location: c.location,
        port: c.port,
        date: c.date,
      })),
    };

    cleanings.forEach((c) => {
      const year = c.date.split('-')[0];
      stats.cleaningsByYear[year] = (stats.cleaningsByYear[year] || 0) + 1;
    });

    // Log warnings for cleanings without location
    if (stats.cleaningsWithoutLocation.length > 0) {
      console.warn(`Found ${stats.cleaningsWithoutLocation.length} cleanings without coordinates:`, 
        stats.cleaningsWithoutLocation);
    }

    return NextResponse.json({
      success: true,
      stats,
      cleanings: cleanings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      cleaningsByShip,
      availableShips: Object.keys(cleaningsByShip).sort(),
    });

  } catch (error) {
    console.error('Error processing cleaning data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

