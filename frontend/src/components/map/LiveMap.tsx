import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { Layers, Compass, Eye, Shield, Radio, Flame, Cpu } from 'lucide-react';
import { IncidentMarker } from './IncidentMarker';
import { UnitMarker } from './UnitMarker';
import { FacilityLayer } from './FacilityLayer';
import { SensorLayer } from './SensorLayer';
import { HeatLayer } from './HeatLayer';
import { useIncidentsStore } from '../../store/incidents';
import { useUnitsStore } from '../../store/units';
import { VADODARA_CENTER } from '../../utils/geo';
import { cn } from '../../utils/format';

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export const LiveMap: React.FC = () => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const selectedIncidentId = useIncidentsStore((state) => state.selectedIncidentId);
  const selectIncident = useIncidentsStore((state) => state.selectIncident);

  const units = useUnitsStore((state) => state.units);
  const facilities = useUnitsStore((state) => state.facilities);
  const sensors = useUnitsStore((state) => state.sensors);

  // Layer Visibility Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  // Route lines between selected incident and assigned units
  const routeLines: Array<{ start: [number, number]; end: [number, number]; key: string }> = [];
  if (showRoutes && selectedIncident) {
    selectedIncident.assignments.forEach((asg) => {
      if (asg.unit_id) {
        const unit = units.find((u) => u.id === asg.unit_id);
        if (unit) {
          routeLines.push({
            start: [selectedIncident.lat, selectedIncident.lng],
            end: [unit.lat, unit.lng],
            key: `${selectedIncident.id}-${unit.id}`,
          });
        }
      }
    });
  }

  const mapCenter: [number, number] = selectedIncident
    ? [selectedIncident.lat, selectedIncident.lng]
    : VADODARA_CENTER;

  return (
    <div className="relative w-full h-full light-map overflow-hidden bg-slate-50 select-none">
      <MapContainer
        center={VADODARA_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        attributionControl={false}
      >
        <MapCenterController center={mapCenter} />

        {/* Clean Standard OpenStreetMap Light Tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Heatmap Layer */}
        {showHeatmap && <HeatLayer />}

        {/* Facility Pins (Hospitals, Stations) */}
        {showFacilities && <FacilityLayer facilities={facilities} />}

        {/* IoT Sensors */}
        {showSensors && <SensorLayer sensors={sensors} />}

        {/* Assigned Unit Dispatch Route Polylines */}
        {routeLines.map((line) => (
          <Polyline
            key={line.key}
            positions={[line.start, line.end]}
            pathOptions={{
              color: '#2563EB',
              weight: 2.5,
              dashArray: '6, 8',
              opacity: 0.85,
            }}
          />
        ))}

        {/* Emergency Units */}
        {showUnits &&
          units.map((unit) => <UnitMarker key={unit.id} unit={unit} />)}

        {/* Active Incidents */}
        {showIncidents &&
          incidents.map((incident) => (
            <IncidentMarker
              key={incident.id}
              incident={incident}
              isSelected={incident.id === selectedIncidentId}
              onSelect={selectIncident}
            />
          ))}
      </MapContainer>

      {/* Clean Floating Layer Bar (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 border border-slate-200/90 rounded-xl p-2 backdrop-blur-md shadow-lg flex flex-wrap items-center gap-1.5 max-w-sm">
        <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-100 mb-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Map Layers</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Vadodara Urban Grid</span>
        </div>

        <button
          onClick={() => setShowIncidents(!showIncidents)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-medium',
            showIncidents
              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
              : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200/60'
          )}
        >
          <Flame className="w-3 h-3 text-rose-500" />
          Incidents ({incidents.length})
        </button>

        <button
          onClick={() => setShowUnits(!showUnits)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-medium',
            showUnits
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
              : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200/60'
          )}
        >
          <Radio className="w-3 h-3 text-emerald-500" />
          Units ({units.length})
        </button>

        <button
          onClick={() => setShowFacilities(!showFacilities)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-medium',
            showFacilities
              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
              : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200/60'
          )}
        >
          <Shield className="w-3 h-3 text-blue-500" />
          Hospitals ({facilities.length})
        </button>

        <button
          onClick={() => setShowSensors(!showSensors)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-medium',
            showSensors
              ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold'
              : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200/60'
          )}
        >
          <Cpu className="w-3 h-3 text-amber-500" />
          Sensors ({sensors.length})
        </button>

        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-medium',
            showHeatmap
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
              : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200/60'
          )}
        >
          <Eye className="w-3 h-3 text-indigo-500" />
          Hotspots
        </button>

        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-medium',
            showRoutes
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200/60'
          )}
        >
          <Compass className="w-3 h-3" />
          Routes
        </button>
      </div>
    </div>
  );
};
