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
import { AnalyticsShortage } from '../../types/domain';

interface ShortageChartProps {
  data: AnalyticsShortage[];
}

export const ShortageChart: React.FC<ShortageChartProps> = ({ data }) => {
  return (
    <div className="w-full space-y-3">
      {/* Legend Indicator */}
      <div className="flex items-center justify-end gap-4 text-xs font-sans select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
          <span className="text-slate-600 font-medium text-[11px]">Available Active Stock</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
          <span className="text-slate-600 font-medium text-[11px]">Unmet Resource Deficit</span>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
            barSize={16}
          >
            <defs>
              <linearGradient id="availStockGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="deficitGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />

            <XAxis
              type="number"
              stroke="#64748B"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              type="category"
              dataKey="subtype"
              stroke="#475569"
              fontSize={10}
              fontWeight={500}
              fontFamily="JetBrains Mono, monospace"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              width={125}
            />

            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)', radius: 8 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as AnalyticsShortage;
                  const fulfillPct =
                    item.demand > 0 ? Math.round((item.available / item.demand) * 100) : 100;
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/90 rounded-2xl text-xs shadow-xl space-y-2 min-w-[180px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-slate-900 capitalize">
                          {item.subtype.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            item.unmet_count > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {fulfillPct}% Stocked
                        </span>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-100 text-xs font-mono">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-sans">Required Demand:</span>
                          <span className="font-bold text-slate-800">{item.demand} units</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-700">
                          <span className="font-sans text-slate-500">Available:</span>
                          <span className="font-bold">{item.available} units</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600">
                          <span className="font-sans text-slate-500">Unmet Shortage:</span>
                          <span className="font-bold">{item.unmet_count} units</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              }}
            />

            <Bar
              dataKey="available"
              name="Available Stock"
              fill="url(#availStockGrad)"
              stackId="stockStack"
              radius={[4, 0, 0, 4]}
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
              animationBegin={100}
            />
            <Bar
              dataKey="unmet_count"
              name="Unmet Deficit"
              fill="url(#deficitGrad)"
              stackId="stockStack"
              radius={[0, 4, 4, 0]}
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
