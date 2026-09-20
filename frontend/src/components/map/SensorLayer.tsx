import React from 'react';
import { Marker, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import { SensorOut } from '../../types/domain';

interface SensorLayerProps {
  sensors: SensorOut[];
}

export const SensorLayer: React.FC<SensorLayerProps> = ({ sensors }) => {
  return (
    <>
      {sensors.map((sensor) => {
        const isBreach = sensor.state === 'breach';
        const isWarn = sensor.state === 'warn';
        const color = isBreach ? '#EF4444' : isWarn ? '#F59E0B' : '#0284C7';

        const customIcon = L.divIcon({
          className: 'custom-sensor-icon',
          html: `
            <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
              <div style="
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: ${color};
                box-shadow: 0 2px 6px ${color}66;
                border: 2.5px solid #FFFFFF;
              "></div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        return (
          <React.Fragment key={sensor.id}>
            {isBreach && (
              <Circle
                center={[sensor.lat, sensor.lng]}
                radius={350}
                pathOptions={{
                  color: '#EF4444',
                  fillColor: '#EF4444',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '4, 4',
                }}
              />
            )}
            <Marker position={[sensor.lat, sensor.lng]} icon={customIcon}>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.98}>
                <div className="p-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl font-sans">
                  <div className="font-bold text-slate-900">SENSOR: {sensor.id}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {sensor.kind.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold mt-1">
                    Value: {sensor.last_value} {sensor.unit} (Threshold: {sensor.threshold} {sensor.unit})
                  </div>
                  <div className="text-[10px] text-rose-600 font-bold uppercase mt-0.5">
                    Status: {sensor.state}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
};
