import React from 'react';
import { motion } from 'framer-motion';
import { AnalyticsHotspot } from '../../types/domain';
import { MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/format';

interface HotspotTableProps {
  data: AnalyticsHotspot[];
}

export const HotspotTable: React.FC<HotspotTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto select-none rounded-xl border border-slate-200/70">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold tracking-wider">
          <tr>
            <th className="p-3">Vulnerability Sector & Ward</th>
            <th className="p-3">Cumulative Incidents</th>
            <th className="p-3">Risk Saturation Index</th>
            <th className="p-3">Municipal Threat Level</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((hs, idx) => {
            const isSevere = hs.weight > 0.8;
            const isElevated = hs.weight > 0.6 && !isSevere;
            return (
              <tr
                key={idx}
                className="hover:bg-slate-50/80 transition-colors group cursor-default"
              >
                <td className="p-3 flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs',
                      isSevere
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : isElevated
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-sky-50 text-sky-600 border border-sky-200'
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-heading font-bold text-slate-900 font-sans block group-hover:text-blue-600 transition-colors">
                      {hs.area}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      Vadodara Command Sector {idx + 1}
                    </span>
                  </div>
                </td>

                <td className="p-3 font-bold text-slate-900 font-mono text-sm">
                  {hs.count}
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${hs.weight * 100}%` }}
                        transition={{ duration: 1.2, delay: 0.1 * idx, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                          'h-full rounded-full',
                          isSevere
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                            : isElevated
                            ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                            : 'bg-gradient-to-r from-sky-400 to-blue-600'
                        )}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      {(hs.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>

                <td className="p-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wide border',
                      isSevere
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isElevated
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSevere ? 'bg-rose-500 animate-pulse' : isElevated ? 'bg-amber-500' : 'bg-sky-500'
                      )}
                    />
                    {isSevere ? 'Severe Red Alert' : isElevated ? 'Elevated Watch' : 'Moderate Advisory'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
