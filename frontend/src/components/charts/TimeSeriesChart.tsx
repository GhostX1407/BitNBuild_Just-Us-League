import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { AnalyticsTimeSeries } from '../../types/domain';

interface TimeSeriesChartProps {
  data: AnalyticsTimeSeries[];
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
  return (
    <div className="w-full space-y-3">
      {/* Legend Indicator */}
      <div className="flex items-center justify-end gap-4 text-xs font-sans select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
          <span className="text-slate-600 font-medium text-[11px]">Total Incident Ingress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs animate-pulse" />
          <span className="text-slate-600 font-medium text-[11px]">P1 Critical Surges</span>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientTotalIngress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradientP1Surge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

            <XAxis
              dataKey="bucket"
              stroke="#64748B"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />

            <Tooltip
              cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as AnalyticsTimeSeries;
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/90 rounded-2xl text-xs shadow-xl space-y-1.5 min-w-[160px]"
                    >
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                        <span>Time Window:</span>
                        <span className="font-bold text-slate-700">{item.bucket}</span>
                      </div>
                      <div className="space-y-1 pt-1 border-t border-slate-100 font-mono">
                        <div className="flex items-center justify-between text-indigo-700">
                          <span className="font-sans text-slate-500">Total Ingress:</span>
                          <span className="font-bold">{item.count} calls</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600">
                          <span className="font-sans text-slate-500">P1 Critical:</span>
                          <span className="font-bold">{item.p1} surges</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366F1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradientTotalIngress)"
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              animationBegin={100}
              activeDot={{ r: 5, fill: '#6366F1', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="p1"
              stroke="#F43F5E"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradientP1Surge)"
              isAnimationActive={true}
              animationDuration={1700}
              animationEasing="ease-out"
              animationBegin={250}
              activeDot={{ r: 5, fill: '#F43F5E', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
