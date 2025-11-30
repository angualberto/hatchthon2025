'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

// Updated risk distribution with Petrobras colors
const riskDistribution = [
  { name: 'Baixo', value: 8, color: '#008140' },
  { name: 'Moderado', value: 7, color: '#F5C22E' },
  { name: 'Alto', value: 4, color: '#f97316' },
  { name: 'Crítico', value: 1, color: '#ef4444' },
];

export function RiskDistributionChart() {
  const total = riskDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Distribuição de Risco</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#142236',
                    border: '1px solid rgba(0, 129, 64, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} embarcações`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-[#F7F7F7]">
                    {item.value}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({((item.value / total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#008140]/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total de embarcações monitoradas</span>
            <span className="font-semibold text-[#F7F7F7]">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
