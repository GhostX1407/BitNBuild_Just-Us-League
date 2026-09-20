import React from 'react';
import { Circle } from 'react-leaflet';
import { MOCK_ANALYTICS } from '../../services/mock';

export const HeatLayer: React.FC = () => {
  const hotspots = MOCK_ANALYTICS.hotspots;

  return (
    <>
      {hotspots.map((hs, idx) => (
        <Circle
          key={idx}
          center={[hs.lat, hs.lng]}
          radius={600 * hs.weight}
          pathOptions={{
            color: hs.weight > 0.8 ? '#FF4747' : '#FF9E2C',
            fillColor: hs.weight > 0.8 ? '#FF4747' : '#FF9E2C',
            fillOpacity: 0.22,
            weight: 1.5,
            dashArray: '5, 5',
          }}
        />
      ))}
    </>
  );
};
