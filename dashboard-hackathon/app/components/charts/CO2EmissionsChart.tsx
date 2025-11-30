'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { co2EmissionsData } from '@/app/data/mockData';

export function CO2EmissionsChart() {
  const getBarColor = (value: number) => {
    if (value < 4000) return '#008140';
    if (value < 4500) return '#F5C22E';
    return '#ef4444';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Emissões de CO₂</CardTitle>
          <div className="text-xs text-slate-400">
            Toneladas/mês
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={co2EmissionsData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#008140" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#142236',
                  border: '1px solid rgba(0, 129, 64, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: '#F7F7F7' }}
                formatter={(value: number) => [`${value.toLocaleString()} ton CO₂`, 'Emissões']}
                cursor={{ fill: 'rgba(0, 129, 64, 0.1)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {co2EmissionsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#008140]" />
              <span className="text-slate-400">&lt;4000t</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F5C22E]" />
              <span className="text-slate-400">4000-4500t</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-400">&gt;4500t</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Média: </span>
            <span className="font-semibold text-[#F5C22E]">4.359t/mês</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
