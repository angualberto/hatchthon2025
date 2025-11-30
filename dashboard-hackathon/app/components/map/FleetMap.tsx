'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vessel } from '@/app/types';
import { cn } from '@/app/utils/helpers';

// Fix for default marker icons
const createShipIcon = (status: string, isSelected: boolean) => {
  const color = status === 'sailing' ? '#10b981' 
    : status === 'anchored' ? '#3b82f6'
    : status === 'moored' ? '#f59e0b'
    : '#64748b';
  
  const size = isSelected ? 40 : 30;
  
  return L.divIcon({
    className: 'custom-ship-icon',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid ${isSelected ? '#06b6d4' : 'white'};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        ${isSelected ? 'transform: scale(1.2);' : ''}
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
          <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
          <path d="M12 10v4"/>
          <path d="M12 2v3"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Component to update map view when selected vessel changes
function MapUpdater({ selectedVessel, vessels }: { selectedVessel: string | null; vessels: Vessel[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedVessel) {
      const vessel = vessels.find((v) => v.id === selectedVessel);
      if (vessel) {
        map.flyTo(
          [vessel.currentPosition.latitude, vessel.currentPosition.longitude],
          10,
          { duration: 1 }
        );
      }
    }
  }, [selectedVessel, vessels, map]);

  return null;
}

interface FleetMapProps {
  vessels: Vessel[];
  selectedVessel: string | null;
  onSelectVessel: (id: string) => void;
}

export default function FleetMap({ vessels, selectedVessel, onSelectVessel }: FleetMapProps) {
  // Calculate center of all vessels
  const centerLat = vessels.reduce((acc, v) => acc + v.currentPosition.latitude, 0) / vessels.length;
  const centerLng = vessels.reduce((acc, v) => acc + v.currentPosition.longitude, 0) / vessels.length;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={5}
      style={{ height: '100%', width: '100%', borderRadius: '0 0 16px 16px' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater selectedVessel={selectedVessel} vessels={vessels} />
      
      {vessels.map((vessel) => (
        <Marker
          key={vessel.id}
          position={[vessel.currentPosition.latitude, vessel.currentPosition.longitude]}
          icon={createShipIcon(vessel.status, selectedVessel === vessel.id)}
          eventHandlers={{
            click: () => onSelectVessel(vessel.id),
          }}
        >
          <Popup className="custom-popup">
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-slate-900 mb-2">{vessel.name}</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p><strong>Status:</strong> {
                  vessel.status === 'sailing' ? 'Navegando' :
                  vessel.status === 'anchored' ? 'Ancorado' :
                  vessel.status === 'moored' ? 'Atracado' : 'Manutenção'
                }</p>
                <p><strong>Velocidade:</strong> {vessel.currentSpeed.toFixed(1)} nós</p>
                <p><strong>Rumo:</strong> {vessel.currentHeading.toFixed(0)}°</p>
                <p><strong>Biofouling:</strong> {vessel.biofoulingRisk.score}/100</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

