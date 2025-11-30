'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { BrazilCoastMap } from '../components/oceanography';
import { 
  Waves, 
  Info,
  MapPin,
  AlertTriangle,
  Fish,
  Ship,
  Search,
  X,
} from 'lucide-react';
import { cn } from '../utils/helpers';

// Vessel names from CSV files
const AVAILABLE_VESSELS = [
  'BRUNO LIMA', 'CARLA SILVA', 'DANIEL PEREIRA', 'EDUARDO COSTA',
  'FABIO SANTOS', 'FELIPE RIBEIRO', 'GABRIELA MARTINS', 'GISELLE CARVALHO',
  'HENRIQUE ALVES', 'LUCAS MEDONCA', 'MARCOS CAVALCANTI', 'MARIA VALENTINA',
  'PAULO MOURA', 'RAFAEL SANTOS', 'RAUL MARTINS', 'RICARDO BARBOSA',
  'RODRIGO PINHEIRO', 'ROMARIO SILVA', 'THIAGO FERNANDES', 'VICTOR OLIVEIRA'
];

interface VesselStopSummary {
  totalStops: number;
  avgTemperature: number;
  avgChlorophyll: number;
  avgBiofoulingRisk: number;
  zonesVisited: Array<{
    zoneId: string;
    zoneName: string;
    visitCount: number;
  }>;
}

export default function OceanographyPage() {
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stopSummary, setStopSummary] = useState<VesselStopSummary | null>(null);
  const [vesselStops, setVesselStops] = useState<any[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);

  // Buscar dados das paradas quando embarcações são selecionadas
  useEffect(() => {
    if (selectedVessels.length === 0) {
      setStopSummary(null);
      setVesselStops([]);
      return;
    }

    const fetchStopData = async () => {
      try {
        setLoadingStops(true);
        const response = await fetch(
          `/api/oceanography/vessel-stops?vessels=${selectedVessels.join(',')}`
        );
        const data = await response.json();

        if (data.success) {
          if (data.summary) {
            setStopSummary(data.summary);
          }
          if (data.stops) {
            setVesselStops(data.stops);
          }
        }
      } catch (error) {
        console.error('Error fetching stop data:', error);
      } finally {
        setLoadingStops(false);
      }
    };

    fetchStopData();
  }, [selectedVessels]);

  const filteredVessels = AVAILABLE_VESSELS.filter(vessel =>
    vessel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVessel = (vesselName: string) => {
    if (selectedVessels.includes(vesselName)) {
      setSelectedVessels(prev => prev.filter(v => v !== vesselName));
    } else {
      setSelectedVessels(prev => [...prev, vesselName]);
    }
  };

  const clearSelection = () => {
    setSelectedVessels([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
            <Waves className="h-8 w-8 text-[var(--color-primary)]" />
            Dados Oceanográficos - Costa Brasileira
          </h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Monitoramento de fatores oceanográficos que influenciam o biofouling na costa brasileira
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Super Agente de Dados Marinhos
              </h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Este sistema consulta automaticamente múltiplas APIs de dados oceanográficos (ERDDAP/NOAA) 
                focadas na costa brasileira. Selecione uma ou mais embarcações para ver os dados oceanográficos 
                (temperatura, clorofila, risco de biofouling) das zonas onde cada embarcação fez paradas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Embarcações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            Selecionar Embarcações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder="Buscar embarcação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background-card)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
          </div>

          {/* Lista de embarcações */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredVessels.map((vessel) => {
              const isSelected = selectedVessels.includes(vessel);
              return (
                <button
                  key={vessel}
                  onClick={() => toggleVessel(vessel)}
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-lg border transition-all',
                    isSelected
                      ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
                      : 'bg-[var(--background-card)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--border-hover)]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{vessel}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ações */}
          {selectedVessels.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-sm text-[var(--foreground-muted)]">
                {selectedVessels.length} embarcação{selectedVessels.length > 1 ? 'ões' : ''} selecionada{selectedVessels.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-[var(--color-secondary)] hover:text-[var(--color-secondary)]/80 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpar seleção
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo dos Dados das Paradas */}
      {stopSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Ship className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Total de Paradas</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {stopSummary.totalStops}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Temp. Média das Paradas</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {stopSummary.avgTemperature.toFixed(1)}°C
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Fish className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Clorofila Média</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {stopSummary.avgChlorophyll.toFixed(2)} mg/m³
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Risco Médio</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {stopSummary.avgBiofoulingRisk}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Zonas Visitadas */}
      {stopSummary && stopSummary.zonesVisited.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zonas Visitadas pelas Embarcações Selecionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stopSummary.zonesVisited
                .sort((a, b) => b.visitCount - a.visitCount)
                .map((zone) => (
                  <div
                    key={zone.zoneId}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background-card)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {zone.zoneName}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                        {zone.visitCount} parada{zone.visitCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Mapa Interativo */}
      <BrazilCoastMap dataType="all" vesselStops={vesselStops} />

      {/* Legenda e Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Como Interpretar o Mapa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Níveis de Risco</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600" />
                  <span className="text-[var(--foreground-secondary)]">Crítico (≥70%) - Requer atenção imediata</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="text-[var(--foreground-secondary)]">Alto (50-70%) - Monitoramento intensivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="text-[var(--foreground-secondary)]">Médio (30-50%) - Monitoramento regular</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="text-[var(--foreground-secondary)]">Baixo (&lt;30%) - Risco controlado</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Divisão Regional</h4>
              <p className="text-sm text-[var(--foreground-muted)]">
                A costa brasileira foi dividida em 13 zonas geográficas precisas, cada uma 
                correspondendo a regiões costeiras específicas com características oceanográficas distintas. 
                Cada zona é calculada com base em dados de temperatura, clorofila e salinidade.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fish className="w-5 h-5" />
              Fatores de Biofouling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-[var(--background-secondary)]">
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Temperatura</h4>
              <p className="text-sm text-[var(--foreground-muted)]">
                Águas mais quentes (acima de 25°C) aceleram o metabolismo de organismos marinhos, 
                aumentando a taxa de crescimento de biofouling. A costa brasileira apresenta 
                temperaturas ideais para desenvolvimento de incrustações.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--background-secondary)]">
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Biodiversidade (Clorofila-a)</h4>
              <p className="text-sm text-[var(--foreground-muted)]">
                A concentração de clorofila-a indica a produtividade primária do oceano. 
                Áreas com alta clorofila têm maior diversidade de organismos, incluindo 
                aqueles que causam biofouling (algas, cracas, mexilhões, etc.).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--background-secondary)]">
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Salinidade</h4>
              <p className="text-sm text-[var(--foreground-muted)]">
                A salinidade ideal para biofouling está entre 30-36 PSU (Practical Salinity Units). 
                A costa brasileira apresenta salinidade dentro desta faixa, favorecendo o 
                desenvolvimento de organismos incrustantes.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <h4 className="font-semibold text-red-500 mb-2">⚠️ Recomendação</h4>
              <p className="text-sm text-[var(--foreground-muted)]">
                Embarcações que navegam em zonas de alto risco (vermelho/laranja) devem considerar 
                limpezas mais frequentes do casco e uso de tintas anti-incrustantes mais eficazes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
