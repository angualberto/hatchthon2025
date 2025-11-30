'use client';

import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Ship,
  BarChart3,
  PieChart,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  FilePdf,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Badge } from '../components/ui/Badge';
import { vessels } from '../data/mockData';
import { cn, formatDate } from '../utils/helpers';

// Available report types
const reportTypes = [
  {
    id: 'biofouling-monthly',
    name: 'Relatório Mensal de Biofouling',
    description: 'Análise completa do estado de biofouling da frota',
    icon: BarChart3,
    frequency: 'Mensal',
    lastGenerated: new Date('2024-11-01'),
  },
  {
    id: 'fuel-efficiency',
    name: 'Eficiência de Combustível',
    description: 'Comparativo de consumo vs baseline',
    icon: TrendingUp,
    frequency: 'Semanal',
    lastGenerated: new Date('2024-11-25'),
  },
  {
    id: 'co2-emissions',
    name: 'Emissões de CO₂',
    description: 'Relatório de sustentabilidade e emissões',
    icon: PieChart,
    frequency: 'Mensal',
    lastGenerated: new Date('2024-11-01'),
  },
  {
    id: 'vessel-detail',
    name: 'Relatório por Embarcação',
    description: 'Análise detalhada de embarcação específica',
    icon: Ship,
    frequency: 'Sob demanda',
    lastGenerated: new Date('2024-11-20'),
  },
  {
    id: 'maintenance-schedule',
    name: 'Cronograma de Manutenção',
    description: 'Planejamento de docagens e limpezas',
    icon: Calendar,
    frequency: 'Quinzenal',
    lastGenerated: new Date('2024-11-15'),
  },
  {
    id: 'executive-summary',
    name: 'Resumo Executivo',
    description: 'Visão geral para gestão',
    icon: FileText,
    frequency: 'Mensal',
    lastGenerated: new Date('2024-11-01'),
  },
];

// Recent reports history
const recentReports = [
  {
    id: 'r001',
    name: 'Relatório Mensal Biofouling - Nov/2024',
    type: 'biofouling-monthly',
    generatedAt: new Date('2024-11-25T10:30:00'),
    format: 'PDF',
    size: '2.4 MB',
    status: 'completed',
  },
  {
    id: 'r002',
    name: 'Eficiência de Combustível - Semana 47',
    type: 'fuel-efficiency',
    generatedAt: new Date('2024-11-24T14:15:00'),
    format: 'Excel',
    size: '1.1 MB',
    status: 'completed',
  },
  {
    id: 'r003',
    name: 'Análise EDUARDO COSTA',
    type: 'vessel-detail',
    generatedAt: new Date('2024-11-23T09:00:00'),
    format: 'PDF',
    size: '3.2 MB',
    status: 'completed',
  },
  {
    id: 'r004',
    name: 'Emissões CO₂ - Out/2024',
    type: 'co2-emissions',
    generatedAt: new Date('2024-11-01T08:00:00'),
    format: 'PDF',
    size: '1.8 MB',
    status: 'completed',
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('last-30');
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    
    setGenerating(true);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGenerating(false);
    alert('Relatório gerado com sucesso! Download iniciará em breve.');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Relatórios</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Gere e exporte relatórios detalhados sobre a frota
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Novo Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Report Types Grid */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-3">
                Tipo de Relatório
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reportTypes.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl text-left transition-all',
                      'border',
                      selectedReport === report.id
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/30'
                        : 'bg-[var(--background-card)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      selectedReport === report.id ? 'bg-[var(--color-primary)]/20' : 'bg-[var(--background-secondary)]'
                    )}>
                      <report.icon className={cn(
                        'w-5 h-5',
                        selectedReport === report.id ? 'text-[var(--color-primary)]' : 'text-[var(--foreground-muted)]'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--foreground)] text-sm">{report.name}</h3>
                      <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{report.description}</p>
                      <p className="text-xs text-[var(--foreground-muted)] mt-1">
                        Frequência: {report.frequency}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Embarcação
                </label>
                <select
                  value={selectedVessel}
                  onChange={(e) => setSelectedVessel(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  <option value="all">Todas as embarcações</option>
                  {vessels.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Período
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  <option value="last-7">Últimos 7 dias</option>
                  <option value="last-30">Últimos 30 dias</option>
                  <option value="last-90">Últimos 90 dias</option>
                  <option value="ytd">Ano atual</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Formato
                </label>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
                    <FilePdf className="w-4 h-4" />
                    PDF
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateReport}
                disabled={!selectedReport || generating}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all',
                  selectedReport && !generating
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-blue-500 text-white hover:from-[var(--color-primary)]/90 hover:to-blue-400 shadow-lg shadow-[var(--color-primary)]/25'
                    : 'bg-[var(--background-card)] text-[var(--foreground-muted)] cursor-not-allowed'
                )}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Gerar Relatório
                  </>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatórios Recentes</CardTitle>
            <Badge variant="info">{recentReports.length} relatórios</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-xl bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    report.format === 'PDF' ? 'bg-red-500/20' : 'bg-emerald-500/20'
                  )}>
                    {report.format === 'PDF' ? (
                      <FilePdf className="w-5 h-5 text-red-400" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--foreground)] text-sm">{report.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.generatedAt)}
                      </span>
                      <span>•</span>
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle className="w-4 h-4" />
                    Concluído
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--background-secondary)] text-[var(--foreground-secondary)] text-sm hover:bg-[var(--background-hover)] hover:text-[var(--foreground)] transition-all">
                    <Download className="w-4 h-4" />
                    Baixar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Agendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.slice(0, 3).map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl bg-[var(--background-card)] border border-[var(--border)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <report.icon className="w-4 h-4 text-[var(--foreground-muted)]" />
                    <span className="text-sm font-medium text-[var(--foreground)]">{report.name}</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-[var(--foreground-muted)]">
                  <div className="flex items-center justify-between">
                    <span>Frequência:</span>
                    <span className="text-[var(--foreground-secondary)]">{report.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Última geração:</span>
                    <span className="text-[var(--foreground-secondary)]">{formatDate(report.lastGenerated)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Próxima geração:</span>
                    <span className="text-[var(--color-primary)]">
                      {report.frequency === 'Mensal' ? '01/12/2024' : 
                       report.frequency === 'Semanal' ? '02/12/2024' : 'Sob demanda'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

