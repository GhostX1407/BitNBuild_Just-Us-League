import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalyticsTypeCount } from '../../types/domain';
import { formatTypeLabel } from '../../utils/format';

interface TypeChartProps {
  data: AnalyticsTypeCount[];
}

const TYPE_COLORS: Record<string, string> = {
  flood: '#4FA6FF',
  fire: '#FF4747',
  road_accident: '#FF9E2C',
  industrial_hazard: '#F2C230',
  medical: '#17D6B2',
  building_collapse: '#FF9E2C',
  gas_leak: '#F2C230',
  other: '#8C99AD',
};

export const TypeChart: React.FC<TypeChartProps> = ({ data }) => {
  return (
    <div className="w-full h-56 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={TYPE_COLORS[entry.type] || '#8C99AD'}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as AnalyticsTypeCount;
                return (
                  <div className="p-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs shadow-lg space-y-0.5">
                    <div className="font-semibold">{formatTypeLabel(item.type)}</div>
                    <div className="text-blue-600 font-bold">{item.count} Incidents</div>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
