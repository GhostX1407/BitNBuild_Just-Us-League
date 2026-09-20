import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { IncidentOut } from '../../types/domain';
import { getPriorityColor } from '../../utils/format';

interface IncidentMarkerProps {
  incident: IncidentOut;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({
  incident,
  isSelected,
  onSelect,
}) => {
  const color = getPriorityColor(incident.priority);
  const isP1 = incident.priority === 'P1';

  const customIcon = L.divIcon({
    className: 'custom-incident-icon',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; items-center; justify-content: center; cursor: pointer;">
        ${
          isP1
            ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: ${color}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="
          width: ${isSelected ? '30px' : '26px'};
          height: ${isSelected ? '30px' : '26px'};
          border-radius: 8px;
          background: #FFFFFF;
          border: 2.5px solid ${color};
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          font-family: 'JetBrains Mono', monospace;
          font-weight: 800;
          font-size: 11px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        ">
          ${incident.priority}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  return (
    <Marker
      position={[incident.lat, incident.lng]}
      icon={customIcon}
      eventHandlers={{
        click: () => onSelect(incident.id),
      }}
    >
      <Tooltip direction="top" offset={[0, -18]} opacity={0.98}>
        <div className="p-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl font-sans">
          <div className="font-bold flex items-center gap-1.5">
            <span style={{ color }}>{incident.code} ({incident.priority})</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 font-normal">{incident.area}</span>
          </div>
          <div className="text-slate-700 font-medium mt-0.5">{incident.title}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Status: {incident.status.toUpperCase()} · Reports: {incident.report_count}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
};
