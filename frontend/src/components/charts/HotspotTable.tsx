import React from 'react';
import { AnalyticsHotspot } from '../../types/domain';
import { MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/format';

interface HotspotTableProps {
  data: AnalyticsHotspot[];
}

export const HotspotTable: React.FC<HotspotTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto select-none">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
          <tr>
            <th className="p-2.5">Vulnerability Zone</th>
            <th className="p-2.5">Incidents</th>
            <th className="p-2.5">Risk Weight</th>
            <th className="p-2.5">Alert Level</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80">
          {data.map((hs, idx) => (
            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
              <td className="p-2.5 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="font-semibold text-slate-900 font-sans">{hs.area}</span>
              </td>
              <td className="p-2.5 font-bold text-slate-900">{hs.count}</td>
              <td className="p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        hs.weight > 0.8 ? 'bg-rose-500' : hs.weight > 0.6 ? 'bg-amber-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${hs.weight * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{(hs.weight * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="p-2.5">
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                    hs.weight > 0.8
                      ? 'bg-rose-100 text-rose-800'
                      : hs.weight > 0.6
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  )}
                >
                  {hs.weight > 0.8 ? 'Severe' : hs.weight > 0.6 ? 'Elevated' : 'Moderate'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
