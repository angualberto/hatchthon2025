'use client';

import { useState } from 'react';
import { Ship, Filter, Search, Grid, List } from 'lucide-react';
import { VesselCard } from '../components/fleet';
import { Badge } from '../components/ui';
import { vessels } from '../data/mockData';
import { cn } from '../utils/helpers';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'sailing' | 'anchored' | 'moored' | 'maintenance';
type FilterRisk = 'all' | 'low' | 'moderate' | 'high' | 'critical';

export default function FleetPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRisk, setFilterRisk] = useState<FilterRisk>('all');

  const filteredVessels = vessels.filter((vessel) => {
    const matchesSearch = vessel.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || vessel.status === filterStatus;
    const matchesRisk = filterRisk === 'all' || vessel.biofoulingRisk.level === filterRisk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const statusCounts = {
    all: vessels.length,
    sailing: vessels.filter((v) => v.status === 'sailing').length,
    anchored: vessels.filter((v) => v.status === 'anchored').length,
    moored: vessels.filter((v) => v.status === 'moored').length,
    maintenance: vessels.filter((v) => v.status === 'maintenance').length,
  };

  const riskCounts = {
    all: vessels.length,
    low: vessels.filter((v) => v.biofoulingRisk.level === 'low').length,
    moderate: vessels.filter((v) => v.biofoulingRisk.level === 'moderate').length,
    high: vessels.filter((v) => v.biofoulingRisk.level === 'high').length,
    critical: vessels.filter((v) => v.biofoulingRisk.level === 'critical').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Frota</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Gerencie e monitore todas as embarcações da frota Transpetro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">
            <Ship className="w-3 h-3 mr-1" />
            {vessels.length} embarcações
          </Badge>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 rounded-2xl bg-[var(--background-card)] border border-[var(--border)]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Buscar embarcação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--foreground-muted)]" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
          >
            <option value="all">Todos os status ({statusCounts.all})</option>
            <option value="sailing">Navegando ({statusCounts.sailing})</option>
            <option value="anchored">Ancorado ({statusCounts.anchored})</option>
            <option value="moored">Atracado ({statusCounts.moored})</option>
            <option value="maintenance">Manutenção ({statusCounts.maintenance})</option>
          </select>
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-2">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as FilterRisk)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
          >
            <option value="all">Todos os riscos ({riskCounts.all})</option>
            <option value="low">Baixo ({riskCounts.low})</option>
            <option value="moderate">Moderado ({riskCounts.moderate})</option>
            <option value="high">Alto ({riskCounts.high})</option>
            <option value="critical">Crítico ({riskCounts.critical})</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)]">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'grid'
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            )}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'list'
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--foreground-muted)]">
          Mostrando <span className="text-[var(--foreground)] font-medium">{filteredVessels.length}</span> de{' '}
          <span className="text-[var(--foreground)] font-medium">{vessels.length}</span> embarcações
        </p>
      </div>

      {/* Vessels Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVessels.map((vessel) => (
            <VesselCard key={vessel.id} vessel={vessel} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVessels.map((vessel) => (
            <VesselCard key={vessel.id} vessel={vessel} compact />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredVessels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--background-card)] flex items-center justify-center mb-4">
            <Ship className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Nenhuma embarcação encontrada
          </h3>
          <p className="text-sm text-[var(--foreground-muted)] max-w-md">
            Não encontramos embarcações que correspondam aos filtros selecionados. 
            Tente ajustar os critérios de busca.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
              setFilterRisk('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)]/30 transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

