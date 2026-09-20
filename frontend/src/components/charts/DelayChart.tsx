import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { AnalyticsDelay } from '../../types/domain';

interface DelayChartProps {
  data: AnalyticsDelay;
}

export const DelayChart: React.FC<DelayChartProps> = ({ data }) => {
  return (
    <div className="w-full space-y-3">
      {/* Legend Header */}
      <div className="flex items-center justify-end gap-4 text-xs font-sans select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-xs" />
          <span className="text-slate-600 font-medium text-[11px]">Assign Latency</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-xs" />
          <span className="text-slate-600 font-medium text-[11px]">Arrival Time</span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.by_priority}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barGap={6}
          >
            <defs>
              <linearGradient id="assignGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="arrivalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#4338CA" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

            <XAxis
              dataKey="priority"
              stroke="#64748B"
              fontSize={11}
              fontWeight={600}
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
              unit="m"
            />

            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)', radius: 8 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/90 rounded-2xl text-xs shadow-xl space-y-2 min-w-[170px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-slate-900">
                          Priority {item.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.sla_pct}% SLA
                        </span>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-100 text-xs font-mono">
                        <div className="flex items-center justify-between text-amber-700">
                          <span className="font-sans text-slate-500">Assign Delay:</span>
                          <span className="font-bold">{item.avg_assign_min} min</span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-700">
                          <span className="font-sans text-slate-500">Arrival Time:</span>
                          <span className="font-bold">{item.avg_arrival_min} min</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              }}
            />

            <Bar
              dataKey="avg_assign_min"
              name="Assign Latency (min)"
              fill="url(#assignGrad)"
              radius={[6, 6, 2, 2]}
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
              animationBegin={150}
            />
            <Bar
              dataKey="avg_arrival_min"
              name="Arrival Latency (min)"
              fill="url(#arrivalGrad)"
              radius={[6, 6, 2, 2]}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              animationBegin={250}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
