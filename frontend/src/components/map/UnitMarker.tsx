import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { UnitOut } from '../../types/domain';
import { getUnitStatusBadge } from '../../utils/format';

interface UnitMarkerProps {
  unit: UnitOut;
}

export const UnitMarker: React.FC<UnitMarkerProps> = ({ unit }) => {
  const { dotColor } = getUnitStatusBadge(unit.status);

  const isVehicle = unit.category === 'vehicle';
  const customIcon = L.divIcon({
    className: 'custom-unit-icon',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="
          width: ${isVehicle ? '24px' : '20px'};
          height: ${isVehicle ? '24px' : '20px'};
          border-radius: ${isVehicle ? '6px' : '50%'};
          background: #FFFFFF;
          border: 2px solid ${dotColor};
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0F172A;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
        ">
          ${unit.kind.slice(0, 2).toUpperCase()}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <Marker position={[unit.lat, unit.lng]} icon={customIcon}>
      <Tooltip direction="bottom" offset={[0, 14]} opacity={0.98}>
        <div className="p-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl font-sans">
          <div className="font-bold text-slate-900">{unit.name}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {unit.agency} · <span style={{ color: dotColor }} className="font-bold">{unit.status.toUpperCase()}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Crew: {unit.crew_size} | Fatigue: {(unit.fatigue * 100).toFixed(0)}%
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
};
