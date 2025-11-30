# BioFoul Monitor - Transpetro Dashboard

Sistema de monitoramento e predição de biofouling para a frota Transpetro. Otimize eficiência operacional, reduza consumo de combustível e apoie a descarbonização.

## 🚀 Início Rápido

### Instalação

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### Executar em Desenvolvimento

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Build para Produção

```bash
npm run build
npm start
```

---

## 📊 Documentação Técnica - Página Dashboard

### Visão Geral

A página Dashboard (`app/page.tsx`) é a tela principal do sistema, exibindo métricas em tempo real, gráficos de tendências e informações críticas sobre a frota Transpetro. Ela serve como ponto central de monitoramento de biofouling e eficiência operacional.

### Arquitetura Técnica

#### Estrutura de Componentes

```
app/page.tsx (Dashboard Principal)
├── KPICard (Métricas Principais)
│   ├── Embarcações Ativas
│   ├── Embarcações em Risco
│   ├── Desperdício de Combustível
│   └── Impacto CO₂
├── KPICard (Métricas Secundárias)
│   ├── Score Médio Biofouling
│   ├── Economia Potencial
│   └── Eficiência Operacional
├── FuelConsumptionChart (Gráfico de Consumo)
├── BiofoulingTrendChart (Tendência de Biofouling)
├── CO2EmissionsChart (Emissões de CO₂)
├── RiskDistributionChart (Distribuição de Risco)
├── VesselCard (Embarcações Críticas)
├── AlertsList (Lista de Alertas)
└── Quick Actions (Ações Rápidas)
```

#### Fluxo de Dados

Atualmente, o dashboard utiliza dados mockados localizados em `app/data/mockData.ts`. O fluxo é:

```
mockData.ts → page.tsx → Componentes de UI
```

**Para integrar dados reais**, o fluxo deve ser:

```
API Externa → API Routes (/api/*) → Hooks (useRealData.ts) → page.tsx → Componentes
```

### Fonte de Dados Atual

#### Dados Mockados (`app/data/mockData.ts`)

O arquivo contém:

- **`vessels`**: Array de objetos `Vessel` com informações das embarcações
- **`fleetStats`**: Estatísticas agregadas da frota
- **`alerts`**: Lista de alertas do sistema
- **`fuelConsumptionData`**: Dados históricos de consumo
- **`biofoulingTrendData`**: Dados de tendência de biofouling

**Estrutura de um Vessel:**
```typescript
interface Vessel {
  id: string;
  name: string;
  type: string;
  imo: string;
  mmsi: string;
  status: 'sailing' | 'anchored' | 'moored' | 'maintenance';
  biofoulingRisk: {
    level: 'low' | 'moderate' | 'high' | 'critical';
    score: number; // 0-100
    lastAssessment: Date;
    predictedCleaningDate: Date;
    factors: Array<{ name: string; impact: number; description: string }>;
    trend: 'improving' | 'stable' | 'degrading';
  };
  fuelEfficiency: {
    current: number;
    baseline: number;
    degradation: number; // %
    estimatedExtraFuel: number; // ton/dia
    co2Impact: number; // ton/dia
  };
  // ... outros campos
}
```

**Estrutura de FleetStats:**
```typescript
interface FleetStats {
  totalVessels: number;
  activeVessels: number;
  vesselsAtRisk: number;
  totalFuelWaste: number; // ton/dia
  totalCO2Impact: number; // ton/dia
  averageBiofoulingScore: number; // 0-100
  estimatedSavings: number; // R$
}
```

---

## 🔌 Integração de Dados Externos

### Opção 1: Integração via API Routes (Recomendado)

#### Passo 1: Criar API Route

Crie uma nova rota em `app/api/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 1. Buscar dados da sua API externa
    const response = await fetch('https://sua-api.com/fleet/stats', {
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const externalData = await response.json();

    // 2. Transformar dados para o formato esperado
    const fleetStats = {
      totalVessels: externalData.total_ships,
      activeVessels: externalData.active_ships,
      vesselsAtRisk: externalData.ships_at_risk,
      totalFuelWaste: externalData.fuel_waste_per_day,
      totalCO2Impact: externalData.co2_impact_per_day,
      averageBiofoulingScore: externalData.avg_biofouling_score,
      estimatedSavings: externalData.estimated_monthly_savings,
    };

    // 3. Retornar dados formatados
    return NextResponse.json({
      success: true,
      fleetStats,
      vessels: externalData.vessels,
      alerts: externalData.alerts,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### Passo 2: Criar Hook Customizado

Crie ou atualize `app/hooks/useDashboardData.ts`:

```typescript
import { useState, useEffect } from 'react';
import { FleetStats, Vessel, Alert } from '../types';

interface DashboardData {
  fleetStats: FleetStats;
  vessels: Vessel[];
  alerts: Alert[];
  lastUpdate: string;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard');
        const result = await response.json();

        if (result.success) {
          setData(result);
          setError(null);
        } else {
          setError(result.error || 'Erro ao carregar dados');
        }
      } catch (err: any) {
        setError(err.message || 'Erro de conexão');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
}
```

#### Passo 3: Atualizar Dashboard Page

Modifique `app/page.tsx`:

```typescript
'use client';

import { useDashboardData } from './hooks/useDashboardData';
// ... outros imports

export default function DashboardPage() {
  const { data, loading, error } = useDashboardData();

  // Fallback para dados mockados se houver erro
  const fleetStats = data?.fleetStats || mockFleetStats;
  const vessels = data?.vessels || mockVessels;
  const alerts = data?.alerts || mockAlerts;

  if (loading) {
    return <DashboardSkeleton />; // Componente de loading
  }

  // ... resto do código
}
```

### Opção 2: Integração com Banco de Dados

#### Exemplo com PostgreSQL

1. **Instalar dependências:**
```bash
npm install @vercel/postgres
# ou
npm install pg
```

2. **Criar API Route:**
```typescript
// app/api/dashboard/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Buscar estatísticas da frota
    const fleetStats = await sql`
      SELECT 
        COUNT(*) as total_vessels,
        COUNT(CASE WHEN status = 'sailing' THEN 1 END) as active_vessels,
        COUNT(CASE WHEN biofouling_risk_level IN ('high', 'critical') THEN 1 END) as vessels_at_risk,
        SUM(fuel_waste_per_day) as total_fuel_waste,
        SUM(co2_impact_per_day) as total_co2_impact,
        AVG(biofouling_score) as average_biofouling_score
      FROM vessels
      WHERE active = true
    `;

    // Buscar embarcações críticas
    const criticalVessels = await sql`
      SELECT * FROM vessels
      WHERE biofouling_risk_level IN ('high', 'critical')
      ORDER BY biofouling_score DESC
      LIMIT 10
    `;

    // Transformar para formato esperado
    const stats = {
      totalVessels: fleetStats.rows[0].total_vessels,
      activeVessels: fleetStats.rows[0].active_vessels,
      // ... mapear outros campos
    };

    return NextResponse.json({ success: true, fleetStats: stats, vessels: criticalVessels.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### Opção 3: Integração com Arquivos CSV/Excel

O projeto já possui exemplos de integração com CSV em:
- `app/api/events/route.ts` - Processa `ResultadoQueryEventos.csv`
- `app/api/consumption/route.ts` - Processa `ResultadoQueryConsumo.csv`
- `app/api/routes/route.ts` - Processa arquivos AIS da pasta `Dados AIS frota TP`

**Exemplo de integração:**
```typescript
// app/api/dashboard/route.ts
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function GET() {
  try {
    // Ler arquivo CSV
    const filePath = path.join(process.cwd(), 'data', 'fleet_stats.csv');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Parse CSV
    const parsed = Papa.parse(fileContent, { header: true });
    
    // Processar dados
    const fleetStats = calculateStats(parsed.data);
    
    return NextResponse.json({ success: true, fleetStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

## 🔧 Manutenção e Customização

### Atualizar Métricas do Dashboard

#### 1. Adicionar Novo KPI Card

Em `app/page.tsx`, adicione um novo `KPICard`:

```typescript
<KPICard
  title="Nova Métrica"
  value={novaMetrica}
  unit="unidade"
  icon={NovoIcone}
  iconColor="text-[var(--color-primary)]"
  change={5}
  trend="up"
  changeLabel="vs. período anterior"
/>
```

#### 2. Modificar Cálculo de Estatísticas

Se estiver usando dados mockados, edite `app/data/mockData.ts`:

```typescript
export const fleetStats: FleetStats = {
  // ... campos existentes
  novaMetrica: calcularNovaMetrica(),
};
```

Se estiver usando API, modifique a rota correspondente em `app/api/dashboard/route.ts`.

### Adicionar Novo Gráfico

1. **Criar componente de gráfico** em `app/components/charts/`:

```typescript
// app/components/charts/NovoGrafico.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export function NovoGrafico() {
  const data = [
    { name: 'Jan', value: 100 },
    { name: 'Fev', value: 120 },
    // ... mais dados
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Gráfico</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#008140" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

2. **Adicionar ao dashboard** em `app/page.tsx`:

```typescript
import { NovoGrafico } from './components/charts';

// No JSX:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <NovoGrafico />
  {/* outros gráficos */}
</div>
```

### Atualizar Frequência de Atualização

Para atualizar dados automaticamente, modifique o hook:

```typescript
// app/hooks/useDashboardData.ts
useEffect(() => {
  fetchData();
  
  // Atualizar a cada 1 minuto (ao invés de 5)
  const interval = setInterval(fetchData, 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

### Personalizar Cores e Estilo

O sistema usa variáveis CSS para temas. Edite `app/globals.css`:

```css
:root {
  --color-primary: #008140; /* Verde Petrobras */
  --color-secondary: #F5C22E; /* Amarelo Petrobras */
  --background: #F7F7F7; /* Branco */
  /* ... outras variáveis */
}
```

### Adicionar Filtros e Períodos

Para adicionar filtros de data/período ao dashboard:

```typescript
// app/page.tsx
const [dateRange, setDateRange] = useState({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
  end: new Date(),
});

// Passar para API
const response = await fetch(
  `/api/dashboard?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`
);
```

---

## 📁 Estrutura de Arquivos Relevantes

```
dashboard-hackathon/
├── app/
│   ├── page.tsx                    # Dashboard principal
│   ├── data/
│   │   └── mockData.ts            # Dados mockados (substituir por API)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── KPICard.tsx        # Componente de métrica
│   │   │   └── Card.tsx           # Componente de card
│   │   └── charts/
│   │       ├── FuelConsumptionChart.tsx
│   │       ├── BiofoulingTrendChart.tsx
│   │       ├── CO2EmissionsChart.tsx
│   │       └── RiskDistributionChart.tsx
│   ├── hooks/
│   │   └── useRealData.ts         # Hooks para dados reais
│   └── api/
│       ├── dashboard/             # API do dashboard (criar)
│       ├── analysis/              # Análise de biofouling
│       ├── consumption/            # Dados de consumo
│       └── events/                 # Eventos operacionais
├── types/
│   └── index.ts                    # Tipos TypeScript
└── utils/
    └── helpers.ts                  # Funções utilitárias
```

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env.local` para configurações:

```env
# API Externa
API_BASE_URL=https://sua-api.com
API_TOKEN=seu-token-aqui

# Banco de Dados (se usar)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Configurações
NEXT_PUBLIC_UPDATE_INTERVAL=300000  # 5 minutos em ms
NEXT_PUBLIC_ENABLE_REAL_DATA=true
```

---

## 🐛 Troubleshooting

### Dashboard não atualiza dados

1. Verifique se a API está retornando dados corretos:
   ```bash
   curl http://localhost:3000/api/dashboard
   ```

2. Verifique o console do navegador para erros

3. Verifique se os dados estão no formato esperado (veja tipos em `app/types/index.ts`)

### Gráficos não aparecem

1. Verifique se `recharts` está instalado: `npm list recharts`
2. Verifique se os dados estão no formato correto para o gráfico
3. Verifique o console para erros de renderização

### Performance lenta

1. Limite a quantidade de dados retornados pela API
2. Implemente paginação para listas grandes
3. Use `React.memo()` para componentes pesados
4. Considere usar `useMemo()` para cálculos complexos

---

## 📚 Recursos Adicionais

- [Next.js Documentation](https://nextjs.org/docs)
- [Recharts Documentation](https://recharts.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks](https://react.dev/reference/react)

---

## 🤝 Contribuindo

Para contribuir com melhorias no dashboard:

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto foi desenvolvido para o Hackathon Transpetro 2024.
