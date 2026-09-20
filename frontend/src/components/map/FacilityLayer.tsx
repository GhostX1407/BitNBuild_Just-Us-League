import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { FacilityOut } from '../../types/domain';

interface FacilityLayerProps {
  facilities: FacilityOut[];
}

export const FacilityLayer: React.FC<FacilityLayerProps> = ({ facilities }) => {
  return (
    <>
      {facilities.map((fac) => {
        const isHospital = fac.kind === 'hospital';
        const color = isHospital ? '#059669' : '#64748B';

        const customIcon = L.divIcon({
          className: 'custom-facility-icon',
          html: `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
              <div style="
                width: 20px;
                height: 20px;
                border-radius: 5px;
                background: #FFFFFF;
                border: 1.5px solid ${color};
                box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${color};
                font-family: 'JetBrains Mono', monospace;
                font-size: 9px;
                font-weight: bold;
              ">
                ${isHospital ? 'H' : 'FS'}
              </div>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        return (
          <Marker key={fac.id} position={[fac.lat, fac.lng]} icon={customIcon}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.98}>
              <div className="p-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl font-sans">
                <div className="font-bold text-slate-900">{fac.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Type: {fac.kind.toUpperCase()}
                  {isHospital && ` · Beds: ${fac.beds_free}/${fac.beds_total}`}
                </div>
                {fac.on_diversion && (
                  <div className="text-[10px] text-rose-600 font-bold mt-1">ON DIVERSION</div>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
};
