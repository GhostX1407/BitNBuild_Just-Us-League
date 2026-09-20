import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsTimeSeries } from '../../types/domain';

interface TimeSeriesChartProps {
  data: AnalyticsTimeSeries[];
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF9E2C" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#FF9E2C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorP1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF4747" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#FF4747" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="bucket"
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
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as AnalyticsTimeSeries;
                return (
                  <div className="p-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs shadow-lg space-y-1">
                    <div className="text-slate-400 font-medium">Time: {item.bucket}</div>
                    <div className="text-amber-600 font-bold">Total: {item.count} reports</div>
                    <div className="text-rose-600 font-bold">P1 Critical: {item.p1}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#FF9E2C"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
          <Area
            type="monotone"
            dataKey="p1"
            stroke="#FF4747"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorP1)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
