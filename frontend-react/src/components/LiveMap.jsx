import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet CSS must be imported for the map to render correctly
import 'leaflet/dist/leaflet.css';

// ----------------------------------------------------------------------
// Custom Leaflet Icons
// ----------------------------------------------------------------------

// Fix default marker icon issues with Webpack/Vite if any fallback is needed
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper function to create dynamically styled DivIcons using Tailwind CSS
const createMarkerIcon = (severity) => {
  let innerHtml = '';

  if (severity === 'High') {
    // Red/rose with subtle CSS pulsing animation
    innerHtml = `
      <div class="relative flex h-5 w-5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-rose-500 border-2 border-white shadow-md"></span>
      </div>
    `;
  } else if (severity === 'Medium') {
    // Amber static marker
    innerHtml = `
      <div class="relative flex h-5 w-5">
        <span class="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border-2 border-white shadow-sm"></span>
      </div>
    `;
  } else {
    // Emerald static marker (Low / Fallback)
    innerHtml = `
      <div class="relative flex h-5 w-5">
        <span class="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white shadow-sm"></span>
      </div>
    `;
  }

  return new L.divIcon({
    html: innerHtml,
    className: 'bg-transparent border-none', // Override default Leaflet icon background
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Center the icon over the coordinate
    popupAnchor: [0, -12], // Position popup right above the icon
  });
};

// ----------------------------------------------------------------------
// Map Updater Component
// ----------------------------------------------------------------------
// This component cleanly reacts to `center` or `zoom` prop changes 
// and repositions the map without recreating the MapContainer instance.
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// ----------------------------------------------------------------------
// Main LiveMap Component
// ----------------------------------------------------------------------
export default function LiveMap({
  incidents = [],
  center = [28.6139, 77.2090], // Default: New Delhi
  zoom = 12,
}) {
  
  // Memoize icons to avoid recreating Leaflet DivIcons on every render
  const icons = useMemo(() => ({
    High: createMarkerIcon('High'),
    Medium: createMarkerIcon('Medium'),
    Low: createMarkerIcon('Low'),
  }), []);

  // Filter out incidents with missing or malformed coordinates
  const validIncidents = incidents.filter(
    (inc) =>
      inc &&
      typeof inc.latitude === 'number' &&
      typeof inc.longitude === 'number' &&
      inc.latitude >= -90 && inc.latitude <= 90 &&
      inc.longitude >= -180 && inc.longitude <= 180
  );

  return (
    <div className="w-full h-[450px] bg-slate-100 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Update Map View if props change */}
        <MapUpdater center={center} zoom={zoom} />

        {/* Base Map Tiles - OpenStreetMap is reliable and open for MVP use */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic Incident Markers */}
        {validIncidents.map((incident) => {
          const sevKey = ['High', 'Medium', 'Low'].includes(incident.severity) 
            ? incident.severity 
            : 'Low';

          return (
            <Marker
              key={incident.id}
              position={[incident.latitude, incident.longitude]}
              icon={icons[sevKey]}
            >
              <Popup className="emergency-popup">
                {/* Popup Content */}
                <div className="p-1 min-w-[200px] flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">
                        INC-{incident.id} • {incident.category}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 m-0 leading-tight">
                        {incident.title}
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed m-0 line-clamp-3">
                    {incident.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    {/* Severity Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        sevKey === 'High'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : sevKey === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {sevKey}
                    </span>
                    
                    {/* Status Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                      {incident.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
