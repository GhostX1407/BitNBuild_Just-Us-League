import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsShortage } from '../../types/domain';

interface ShortageChartProps {
  data: AnalyticsShortage[];
}

export const ShortageChart: React.FC<ShortageChartProps> = ({ data }) => {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
        >
          <XAxis
            type="number"
            stroke="#5B6579"
            fontSize={10}
            fontFamily="JetBrains Mono"
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="subtype"
            stroke="#8C99AD"
            fontSize={10}
            fontFamily="JetBrains Mono"
            tickLine={false}
            width={120}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as AnalyticsShortage;
                return (
                  <div className="p-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs shadow-lg space-y-1">
                    <div className="font-semibold text-slate-900">{item.subtype}</div>
                    <div className="text-slate-500">Required Demand: {item.demand}</div>
                    <div className="text-emerald-600 font-medium">Available: {item.available}</div>
                    <div className="text-rose-600 font-bold">Unmet Shortage: {item.unmet_count}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="available" name="Available Stock" fill="#17D6B2" stackId="a" />
          <Bar dataKey="unmet_count" name="Unmet Deficit" fill="#FF4747" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
