'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { fuelConsumptionData } from '@/app/data/mockData';

export function FuelConsumptionChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Consumo de Combustível</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#008140]" />
              <span className="text-slate-400">Baseline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F5C22E]" />
              <span className="text-slate-400">Real</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={fuelConsumptionData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008140" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#008140" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5C22E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F5C22E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#008140" opacity={0.2} />
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
                tickFormatter={(value) => `${value}t`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#142236',
                  border: '1px solid rgba(0, 129, 64, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: '#F7F7F7' }}
                itemStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [`${value} toneladas`, '']}
              />
              <Area
                type="monotone"
                dataKey="baseline"
                name="Baseline (casco limpo)"
                stroke="#008140"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBaseline)"
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Consumo Real"
                stroke="#F5C22E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActual)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Excesso total 2024:</span>
            <span className="font-semibold text-[#F5C22E]">2.100 toneladas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Custo estimado:</span>
            <span className="font-semibold text-red-400">R$ 4.2M</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
