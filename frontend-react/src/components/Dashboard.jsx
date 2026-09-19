import React, { useState, useEffect } from 'react';
import MetricsBanner from './MetricsBanner';
import LiveMap from './LiveMap';
import IncidentCard from './IncidentCard';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Poll for incidents
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8001/api/incidents/');
        const data = await response.json();
        setIncidents(data);
      } catch (error) {
        console.error('Failed to fetch incidents', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000); // 15 second polling
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = (updatedIncident) => {
    setIncidents(prevIncidents => 
      prevIncidents.map(inc => (inc.id === updatedIncident.id ? updatedIncident : inc))
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading control room...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control Room</h1>
          <p className="text-sm text-slate-500">Smart Disaster & Emergency Management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">System Online</span>
        </div>
      </header>

      {/* Metrics Header */}
      <MetricsBanner incidents={incidents} />

      {/* Main Grid: Map on left, incidents feed on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
        <div className="lg:col-span-2">
           <LiveMap incidents={incidents} />
        </div>
        
        {/* Incident Feed */}
        <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-50 py-2 z-10 border-b border-slate-200">
            Live Feed
          </h3>
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No incidents currently reported.</p>
          ) : (
            incidents.map(incident => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                onStatusChange={handleStatusChange} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
