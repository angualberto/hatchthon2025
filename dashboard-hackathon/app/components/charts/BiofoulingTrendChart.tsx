'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { biofoulingHistory } from '@/app/data/mockData';

export function BiofoulingTrendChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tendência de Biofouling - Frota</CardTitle>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Score médio mensal</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={biofoulingHistory}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="biofoulingGradient" x1="0" y1="0" x2="0" y2="1">
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
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#142236',
                  border: '1px solid rgba(0, 129, 64, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: '#F7F7F7' }}
                formatter={(value: number) => [`Score: ${value}`, 'Biofouling']}
              />
              {/* Reference lines for risk levels */}
              <ReferenceLine
                y={30}
                stroke="#008140"
                strokeDasharray="5 5"
                label={{ value: 'Baixo', fill: '#008140', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={50}
                stroke="#F5C22E"
                strokeDasharray="5 5"
                label={{ value: 'Moderado', fill: '#F5C22E', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={70}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: 'Alto', fill: '#ef4444', fontSize: 10, position: 'right' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#F5C22E"
                strokeWidth={3}
                dot={{ fill: '#F5C22E', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#F5C22E', strokeWidth: 2, fill: '#142236' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-[#008140]/10 border border-[#008140]/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-[#008140]">8</div>
            <div className="text-xs text-slate-400">Risco Baixo</div>
          </div>
          <div className="bg-[#F5C22E]/10 border border-[#F5C22E]/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-[#F5C22E]">7</div>
            <div className="text-xs text-slate-400">Risco Moderado</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">5</div>
            <div className="text-xs text-slate-400">Risco Alto/Crítico</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
