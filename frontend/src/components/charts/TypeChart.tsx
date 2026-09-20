import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { AnalyticsTypeCount } from '../../types/domain';
import { formatTypeLabel } from '../../utils/format';

interface TypeChartProps {
  data: AnalyticsTypeCount[];
}

// Executive modern color palette with distinct professional tones
export const TYPE_PALETTE: Record<string, { fill: string; gradient: [string, string]; label: string; textClass: string }> = {
  flood: {
    fill: '#0284C7', // Ocean / Sky
    gradient: ['#38BDF8', '#0284C7'],
    label: 'Flooding & Inundation',
    textClass: 'text-sky-600',
  },
  fire: {
    fill: '#E11D48', // Ruby Carmine
    gradient: ['#FB7185', '#E11D48'],
    label: 'Fire & Combustion',
    textClass: 'text-rose-600',
  },
  road_accident: {
    fill: '#F59E0B', // Radiant Amber Gold
    gradient: ['#FCD34D', '#F59E0B'],
    label: 'Traffic & Collision',
    textClass: 'text-amber-600',
  },
  industrial_hazard: {
    fill: '#8B5CF6', // Electric Violet
    gradient: ['#C4B5FD', '#8B5CF6'],
    label: 'Chemical & Industrial',
    textClass: 'text-violet-600',
  },
  medical: {
    fill: '#10B981', // Vivid Emerald Jade
    gradient: ['#6EE7B7', '#10B981'],
    label: 'Medical & Trauma',
    textClass: 'text-emerald-600',
  },
  building_collapse: {
    fill: '#D97706', // Warm Ochre
    gradient: ['#FBBF24', '#D97706'],
    label: 'Structural Collapse',
    textClass: 'text-amber-700',
  },
  gas_leak: {
    fill: '#EC4899', // Hot Pink Neon
    gradient: ['#F472B6', '#EC4899'],
    label: 'Toxic Gas Leak',
    textClass: 'text-pink-600',
  },
  other: {
    fill: '#64748B', // Steel Slate
    gradient: ['#94A3B8', '#64748B'],
    label: 'Miscellaneous',
    textClass: 'text-slate-600',
  },
};

export const TypeChart: React.FC<TypeChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalIncidents = data.reduce((sum, item) => sum + item.count, 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-4">
      {/* Donut Chart with Center HUD */}
      <div className="relative w-full md:w-1/2 h-60 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry) => {
                const colors = TYPE_PALETTE[entry.type] || TYPE_PALETTE.other;
                return (
                  <linearGradient
                    key={`typeGrad-${entry.type}`}
                    id={`typeGrad-${entry.type}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={colors.gradient[0]} />
                    <stop offset="100%" stopColor={colors.gradient[1]} />
                  </linearGradient>
                );
              })}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={86}
              paddingAngle={4}
              cornerRadius={6}
              dataKey="count"
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
              animationBegin={100}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data.map((entry, index) => {
                const isSelected = activeIndex === index;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#typeGrad-${entry.type})`}
                    stroke={isSelected ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer transition-all duration-300 filter drop-shadow-xs hover:opacity-90"
                    style={{
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: 'center center',
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as AnalyticsTypeCount;
                  const config = TYPE_PALETTE[item.type] || TYPE_PALETTE.other;
                  const pct = totalIncidents > 0 ? ((item.count / totalIncidents) * 100).toFixed(1) : '0';
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/90 rounded-2xl text-xs shadow-xl space-y-1.5 min-w-[150px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: config.fill }}
                        />
                        <span className="font-heading font-bold text-slate-900">
                          {formatTypeLabel(item.type)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Incident Volume:</span>
                        <span className="font-mono font-bold text-slate-900">{item.count}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Share of Total:</span>
                        <span className={`font-mono font-bold ${config.textClass}`}>{pct}%</span>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut HUD Indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {activeIndex !== null ? formatTypeLabel(data[activeIndex]?.type || '') : 'Total Dispatched'}
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 tracking-tight">
            {activeIndex !== null ? data[activeIndex]?.count : totalIncidents}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            {activeIndex !== null
              ? `${(((data[activeIndex]?.count || 0) / (totalIncidents || 1)) * 100).toFixed(0)}% mix`
              : '100% telemetry'}
          </span>
        </div>
      </div>

      {/* Modern Legend Breakdown Badges */}
      <div className="w-full md:w-1/2 flex flex-col justify-center space-y-1.5">
        {data.map((entry, index) => {
          const config = TYPE_PALETTE[entry.type] || TYPE_PALETTE.other;
          const pct = totalIncidents > 0 ? ((entry.count / totalIncidents) * 100).toFixed(0) : '0';
          const isSelected = activeIndex === index;
          return (
            <div
              key={entry.type}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-xs ${
                isSelected
                  ? 'bg-slate-100/90 border-slate-300 shadow-sm scale-[1.01]'
                  : 'bg-white/60 border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0 transition-transform"
                  style={{
                    backgroundColor: config.fill,
                    transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
                <span className="font-medium text-slate-700">{formatTypeLabel(entry.type)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{entry.count}</span>
                <span className="text-[11px] font-mono font-medium text-slate-400 w-8 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
