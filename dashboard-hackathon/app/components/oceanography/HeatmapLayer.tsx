'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  radius?: number;
  blur?: number;
  maxZoom?: number;
  minOpacity?: number;
  gradient?: { [key: number]: string };
}

export function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 18,
  minOpacity = 0.05,
  gradient,
}: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadHeatmap = async () => {
      if (loadedRef.current) return;

      try {
        // Dynamic import de leaflet.heat
        await import('leaflet.heat');
        loadedRef.current = true;

        if (!mounted) return;

        // Remover layer anterior se existir
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
        }

        // Criar gradiente padrão se não fornecido
        const defaultGradient: { [key: number]: string } = gradient || {
          0.0: 'rgba(59, 130, 246, 0)',      // Azul transparente (baixo)
          0.2: 'rgba(59, 130, 246, 0.3)',    // Azul claro
          0.4: 'rgba(34, 197, 94, 0.5)',     // Verde
          0.6: 'rgba(234, 179, 8, 0.7)',     // Amarelo
          0.8: 'rgba(249, 115, 22, 0.8)',    // Laranja
          1.0: 'rgba(239, 68, 68, 1)',       // Vermelho (alto)
        };

        // @ts-expect-error - leaflet.heat adiciona heatLayer ao L
        const heatLayer = L.heatLayer(points, {
          radius,
          blur,
          maxZoom,
          minOpacity,
          gradient: defaultGradient,
        });

        heatLayerRef.current = heatLayer;
        heatLayer.addTo(map);
      } catch (err) {
        console.error('Erro ao carregar heatmap:', err);
      }
    };

    loadHeatmap();

    return () => {
      mounted = false;
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxZoom, minOpacity, gradient]);

  return null;
}

