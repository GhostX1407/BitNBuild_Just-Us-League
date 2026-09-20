import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsDelay } from '../../types/domain';

interface DelayChartProps {
  data: AnalyticsDelay;
}

export const DelayChart: React.FC<DelayChartProps> = ({ data }) => {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.by_priority}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="priority"
            stroke="#5B6579"
            fontSize={10}
            fontFamily="JetBrains Mono"
            tickLine={false}
          />
          <YAxis
            stroke="#5B6579"
            fontSize={10}
            fontFamily="JetBrains Mono"
            tickLine={false}
            unit="m"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="p-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs shadow-lg space-y-1">
                    <div className="font-semibold text-slate-900">Priority: {item.priority}</div>
                    <div className="text-amber-600">Assign Delay: {item.avg_assign_min} min</div>
                    <div className="text-blue-600">Arrival Time: {item.avg_arrival_min} min</div>
                    <div className="text-emerald-600 font-bold">SLA Compliance: {item.sla_pct}%</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="avg_assign_min" name="Assign Latency (min)" fill="#FF9E2C" radius={[2, 2, 0, 0]} />
          <Bar dataKey="avg_arrival_min" name="Arrival Latency (min)" fill="#4FA6FF" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
