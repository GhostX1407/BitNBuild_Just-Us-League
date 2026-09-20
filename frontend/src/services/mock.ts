// ResQGrid Mock Data and Realtime Simulation Engine
import {
  Snapshot,
  IncidentOut,
  UnitOut,
  FacilityOut,
  SensorOut,
  AlertOut,
  NotificationOut,
  ReportOut,
  AiSummary,
  AiSop,
  AiBrief,
  AnalyticsOverview,
  AnalyticsTypeCount,
  AnalyticsDelay,
  AnalyticsShortage,
  AnalyticsHotspot,
  AnalyticsTimeSeries,
  AnalyticsSource,
  TrackData,
  IngestResponse,
  RecommendationPlan,
} from '../types/domain';

// Seed Initial Incidents in Vadodara
const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60000).toISOString();
const minutesFromNow = (m: number) => new Date(now + m * 60000).toISOString();

export const INITIAL_INCIDENTS: IncidentOut[] = [
  {
    id: 'inc-001',
    code: 'INC-0101',
    type: 'flood',
    title: 'Severe Vishwamitri Overflow & Waterlogging at Sayaji Baug',
    summary: 'Water level breached 26ft mark. Multiple citizens stranded near zoo perimeter and Kala Ghoda bridge.',
    severity: 5,
    priority: 'P1',
    confidence: 0.96,
    status: 'dispatched',
    escalated: true,
    escalation_level: 2,
    lat: 22.3134,
    lng: 73.1895,
    area: 'Sayaji Baug / Kala Ghoda',
    people_affected: 35,
    hazards: ['Rapid flood current', 'Submerged power junction', 'Trapped zoo staff'],
    report_count: 5,
    sources: ['sensor', 'citizen', 'call'],
    created_at: minutesAgo(18),
    triaged_at: minutesAgo(17),
    first_assigned_at: minutesAgo(14),
    first_arrival_at: null,
    resolved_at: null,
    sla_due_at: minutesFromNow(4),
    track_id: 'TRK-9821',
    decision_log: [
      { ts: minutesAgo(18), action: 'INGEST', reason: 'Sensor VG-01 trigger + 3 caller corroborations', actor: 'Automated Pipeline' },
      { ts: minutesAgo(17), action: 'TRIAGE', reason: 'Severity 5 evaluated due to life hazard & vulnerable location', actor: 'LLM Classifier' },
      { ts: minutesAgo(14), action: 'AUTO_RECOMMEND', reason: 'Dispatched 2 Inflatable Boats, 1 NDRF Squad, 1 Ambulance', actor: 'Dispatcher 04' }
    ],
    assignments: [
      {
        id: 'asg-01',
        incident_id: 'inc-001',
        unit_id: 'unit-boat-01',
        target_name: 'NDRF Rescue Boat Alpha',
        kind: 'boat',
        requirement_key: 'boat:flood',
        score: 0.94,
        score_breakdown: { proximity: 0.95, capability: 1.0, readiness: 0.9, load: 0.9 },
        eta_min: 6,
        status: 'en_route'
      },
      {
        id: 'asg-02',
        incident_id: 'inc-001',
        unit_id: 'unit-ndrf-01',
        target_name: 'NDRF 6th Bn Disaster Crew',
        kind: 'rescue',
        requirement_key: 'rescue:team',
        score: 0.91,
        score_breakdown: { proximity: 0.88, capability: 1.0, readiness: 0.95, load: 0.85 },
        eta_min: 8,
        status: 'en_route'
      }
    ],
    shortages: [
      { subtype: 'high_capacity_pump', qty_missing: 2 }
    ]
  },
  {
    id: 'inc-002',
    code: 'INC-0102',
    type: 'industrial_hazard',
    title: 'Chemical Solvent Fire & Toxic Plume at Makarpura GIDC',
    summary: 'Flammable chemical storage barrel ruptured with secondary explosions. Dense acrid smoke drifting towards residential sector.',
    severity: 5,
    priority: 'P1',
    confidence: 0.98,
    status: 'on_scene',
    escalated: true,
    escalation_level: 1,
    lat: 22.2541,
    lng: 73.1956,
    area: 'Makarpura GIDC Phase-II',
    people_affected: 60,
    hazards: ['Toxic fumes (VOC/Benzene)', 'Combustible drums', 'Structural collapse of shed'],
    report_count: 8,
    sources: ['sensor', 'citizen', 'field', 'call'],
    created_at: minutesAgo(32),
    triaged_at: minutesAgo(31),
    first_assigned_at: minutesAgo(29),
    first_arrival_at: minutesAgo(12),
    resolved_at: null,
    sla_due_at: minutesAgo(2), // breached
    track_id: 'TRK-4412',
    decision_log: [
      { ts: minutesAgo(32), action: 'INGEST', reason: 'Industrial Gas Sensor MK-02 detected 480ppm threshold breach', actor: 'Automated Pipeline' },
      { ts: minutesAgo(29), action: 'DISPATCH', reason: 'Dispatched Foam Tender FT-01 and Hazmat Crew', actor: 'Supervisor Dave' },
      { ts: minutesAgo(12), action: 'ON_SCENE', reason: 'First responder confirmed active chemical ignition', actor: 'Unit FT-01' }
    ],
    assignments: [
      {
        id: 'asg-03',
        incident_id: 'inc-002',
        unit_id: 'unit-foam-01',
        target_name: 'Foam Crash Tender FT-01',
        kind: 'engine',
        requirement_key: 'engine:foam',
        score: 0.96,
        score_breakdown: { proximity: 0.98, capability: 1.0, readiness: 0.95, load: 0.9 },
        eta_min: 2,
        status: 'arrived'
      },
      {
        id: 'asg-04',
        incident_id: 'inc-002',
        unit_id: 'unit-hazmat-01',
        target_name: 'HazMat Chemical Containment Unit',
        kind: 'hazmat',
        requirement_key: 'hazmat:crew',
        score: 0.89,
        score_breakdown: { proximity: 0.82, capability: 1.0, readiness: 0.9, load: 0.85 },
        eta_min: 4,
        status: 'en_route'
      }
    ],
    shortages: [
      { subtype: 'hazmat_breathing_apparatus', qty_missing: 4 }
    ]
  },
  {
    id: 'inc-003',
    code: 'INC-0103',
    type: 'road_accident',
    title: 'Multi-Vehicle Pileup & Bus Collision on NH48 Golden Crossroads',
    summary: 'Interstate express bus and 2 freight trailers collided in heavy morning fog. Multiple passengers trapped in wreckage.',
    severity: 4,
    priority: 'P2',
    confidence: 0.92,
    status: 'en_route',
    escalated: false,
    escalation_level: 0,
    lat: 22.3524,
    lng: 73.2381,
    area: 'NH48 Golden Crossroads',
    people_affected: 22,
    hazards: ['Fuel spill on highway', 'Extrication required', 'Gridlocked traffic'],
    report_count: 4,
    sources: ['citizen', 'call'],
    created_at: minutesAgo(14),
    triaged_at: minutesAgo(13),
    first_assigned_at: minutesAgo(10),
    first_arrival_at: null,
    resolved_at: null,
    sla_due_at: minutesFromNow(6),
    track_id: 'TRK-7719',
    decision_log: [
      { ts: minutesAgo(14), action: 'INGEST', reason: 'Highway patrol phone report', actor: 'Automated Pipeline' },
      { ts: minutesAgo(10), action: 'DISPATCH', reason: 'Hydraulic cutter rescue van and 3 ALS Ambulances assigned', actor: 'Dispatcher 02' }
    ],
    assignments: [
      {
        id: 'asg-05',
        incident_id: 'inc-003',
        unit_id: 'unit-amb-01',
        target_name: 'ALS Trauma Ambulance 108-A',
        kind: 'ambulance',
        requirement_key: 'ambulance:trauma',
        score: 0.88,
        score_breakdown: { proximity: 0.85, capability: 0.95, readiness: 0.9, load: 0.8 },
        eta_min: 7,
        status: 'en_route'
      }
    ],
    shortages: []
  },
  {
    id: 'inc-004',
    code: 'INC-0104',
    type: 'building_collapse',
    title: 'Partial Facade & Balcony Collapse at Mandvi Heritage Ward',
    summary: 'Portion of 90-year-old two-storey heritage structure collapsed onto bazaar arcade. Debris blocking narrow lane.',
    severity: 3,
    priority: 'P2',
    confidence: 0.87,
    status: 'triaged',
    escalated: false,
    escalation_level: 0,
    lat: 22.3012,
    lng: 73.2085,
    area: 'Mandvi / Old City',
    people_affected: 8,
    hazards: ['Unstable masonry overhead', 'Narrow access alley', 'Crowd gathering'],
    report_count: 3,
    sources: ['citizen', 'field'],
    created_at: minutesAgo(24),
    triaged_at: minutesAgo(22),
    first_assigned_at: null,
    first_arrival_at: null,
    resolved_at: null,
    sla_due_at: minutesFromNow(1),
    track_id: 'TRK-2201',
    decision_log: [
      { ts: minutesAgo(24), action: 'INGEST', reason: 'Citizen mobile upload with photo', actor: 'Automated Pipeline' },
      { ts: minutesAgo(22), action: 'TRIAGE', reason: 'Corroborated by beat constable on ground', actor: 'Dispatcher 01' }
    ],
    assignments: [],
    shortages: [
      { subtype: 'hydraulic_shoring_jack', qty_missing: 2 }
    ]
  },
  {
    id: 'inc-005',
    code: 'INC-0105',
    type: 'gas_leak',
    title: 'Pungent Mercaptan Gas Odour reported near Alkapuri Commercial Hub',
    summary: 'Suspected PNG underground pipeline rupture near shopping plaza basement parking. High odor intensity.',
    severity: 3,
    priority: 'P3',
    confidence: 0.81,
    status: 'new',
    escalated: false,
    escalation_level: 0,
    lat: 22.3115,
    lng: 73.1678,
    area: 'Alkapuri RC Dutt Road',
    people_affected: 15,
    hazards: ['Flammable vapor accumulation', 'Enclosed parking space'],
    report_count: 2,
    sources: ['citizen', 'call'],
    created_at: minutesAgo(7),
    triaged_at: null,
    first_assigned_at: null,
    first_arrival_at: null,
    resolved_at: null,
    sla_due_at: minutesFromNow(12),
    track_id: 'TRK-5582',
    decision_log: [
      { ts: minutesAgo(7), action: 'INGEST', reason: 'Two 112 calls from building security', actor: 'Automated Pipeline' }
    ],
    assignments: [],
    shortages: []
  },
  {
    id: 'inc-006',
    code: 'INC-0106',
    type: 'medical',
    title: 'Emergency Pediatric Trauma Evacuation at Karelibaug',
    summary: 'School van brake malfunction causing collision with utility pole. 4 minors requiring urgent pediatric care.',
    severity: 4,
    priority: 'P2',
    confidence: 0.94,
    status: 'en_route',
    escalated: false,
    escalation_level: 0,
    lat: 22.3245,
    lng: 73.1998,
    area: 'Karelibaug Water Tank Road',
    people_affected: 6,
    hazards: ['Pediatric injuries', 'Live electric wire dangling'],
    report_count: 4,
    sources: ['call', 'citizen', 'hospital'],
    created_at: minutesAgo(16),
    triaged_at: minutesAgo(15),
    first_assigned_at: minutesAgo(13),
    first_arrival_at: null,
    resolved_at: null,
    sla_due_at: minutesFromNow(4),
    track_id: 'TRK-3390',
    decision_log: [
      { ts: minutesAgo(16), action: 'INGEST', reason: 'School administrator direct distress call', actor: 'Emergency Dispatch' },
      { ts: minutesAgo(13), action: 'DISPATCH', reason: 'Assigned 2 Ambulances and alerted SSG Pediatric ICU', actor: 'Dispatcher 03' }
    ],
    assignments: [
      {
        id: 'asg-06',
        incident_id: 'inc-006',
        unit_id: 'unit-amb-02',
        target_name: 'Pediatric EMS Van 108-C',
        kind: 'ambulance',
        requirement_key: 'ambulance:pediatric',
        score: 0.93,
        score_breakdown: { proximity: 0.95, capability: 0.98, readiness: 0.9, load: 0.9 },
        eta_min: 4,
        status: 'en_route'
      }
    ],
    shortages: []
  },
  {
    id: 'inc-007',
    code: 'INC-0107',
    type: 'flood',
    title: 'Severe Underpass Submersion at Gorwa Railway Crossing',
    summary: 'Storm drain blockage caused 4.5ft water accumulation under railway subway. 1 delivery vehicle stalled.',
    severity: 2,
    priority: 'P4',
    confidence: 0.89,
    status: 'contained',
    escalated: false,
    escalation_level: 0,
    lat: 22.3389,
    lng: 73.1554,
    area: 'Gorwa Industrial Area',
    people_affected: 2,
    hazards: ['Submerged vehicle', 'Traffic congestion'],
    report_count: 2,
    sources: ['sensor', 'citizen'],
    created_at: minutesAgo(45),
    triaged_at: minutesAgo(43),
    first_assigned_at: minutesAgo(38),
    first_arrival_at: minutesAgo(28),
    resolved_at: null,
    sla_due_at: minutesAgo(15),
    track_id: 'TRK-1198',
    decision_log: [
      { ts: minutesAgo(45), action: 'INGEST', reason: 'Sensor Gorwa Level Sensor breach 1.2m', actor: 'Automated Pipeline' },
      { ts: minutesAgo(28), action: 'ON_SCENE', reason: 'Towing crane arrived, drainage pump operating', actor: 'Unit TR-02' }
    ],
    assignments: [],
    shortages: []
  },
  {
    id: 'inc-008',
    code: 'INC-0108',
    type: 'fire',
    title: 'Vegetation & Scrap Yard Fire near Waghodia Ring Road',
    summary: 'Dry scrub ignited scrap rubber pile. Fast spreading smoke towards residential enclave.',
    severity: 2,
    priority: 'P3',
    confidence: 0.91,
    status: 'resolved',
    escalated: false,
    escalation_level: 0,
    lat: 22.2891,
    lng: 73.2345,
    area: 'Waghodia Ring Road',
    people_affected: 4,
    hazards: ['Thick smoke', 'Near dry brush'],
    report_count: 3,
    sources: ['citizen', 'field'],
    created_at: minutesAgo(80),
    triaged_at: minutesAgo(78),
    first_assigned_at: minutesAgo(72),
    first_arrival_at: minutesAgo(60),
    resolved_at: minutesAgo(10),
    sla_due_at: minutesAgo(50),
    track_id: 'TRK-6643',
    decision_log: [
      { ts: minutesAgo(80), action: 'INGEST', reason: 'Citizen alert via mobile web', actor: 'Automated Pipeline' },
      { ts: minutesAgo(10), action: 'RESOLVED', reason: 'Fire doused completely, cooling operation finished', actor: 'Station Officer Parmar' }
    ],
    assignments: [],
    shortages: []
  }
];

// Seed Emergency Units in Vadodara
export const INITIAL_UNITS: UnitOut[] = [
  {
    id: 'unit-boat-01',
    name: 'NDRF Inflatable Rescue Boat Alpha',
    kind: 'boat',
    category: 'vehicle',
    agency: 'NDRF 6th Battalion',
    capabilities: ['flood_rescue', 'diver_support', 'night_search'],
    equipment: { life_jackets: 12, inflatable_rafts: 2, first_aid_kit: 3 },
    crew_size: 4,
    status: 'en_route',
    lat: 22.3168,
    lng: 73.1834,
    station_id: 'st-ndrf-01',
    current_incident_id: 'inc-001',
    fatigue: 0.15,
    phone: '+91 98250 11001',
    speed_kmh: 35
  },
  {
    id: 'unit-ndrf-01',
    name: 'NDRF Urban Search & Rescue Squad',
    kind: 'rescue',
    category: 'team',
    agency: 'NDRF 6th Battalion',
    capabilities: ['collapse_rescue', 'flood_rescue', 'confined_space'],
    equipment: { hydraulic_cutters: 2, search_cameras: 1, sonar: 1 },
    crew_size: 8,
    status: 'en_route',
    lat: 22.3182,
    lng: 73.1852,
    station_id: 'st-ndrf-01',
    current_incident_id: 'inc-001',
    fatigue: 0.2,
    phone: '+91 98250 11002',
    speed_kmh: 40
  },
  {
    id: 'unit-foam-01',
    name: 'Foam Crash Tender FT-01 (VMC Fire)',
    kind: 'engine',
    category: 'vehicle',
    agency: 'Vadodara Fire & Emergency Services',
    capabilities: ['chemical_fire', 'foam_cannon', 'high_reach_nozzle'],
    equipment: { aqueous_foam_liters: 4500, breathing_kits: 6 },
    crew_size: 6,
    status: 'on_scene',
    lat: 22.2548,
    lng: 73.1952,
    station_id: 'st-fire-makarpura',
    current_incident_id: 'inc-002',
    fatigue: 0.45,
    phone: '+91 98250 11003',
    speed_kmh: 45
  },
  {
    id: 'unit-hazmat-01',
    name: 'HazMat Chemical Response Unit',
    kind: 'hazmat',
    category: 'team',
    agency: 'Gujarat Disaster Management Authority',
    capabilities: ['toxic_neutralization', 'gas_detection', 'decontamination'],
    equipment: { level_a_hazmat_suits: 6, air_analyzers: 2, absorbent_pads: 50 },
    crew_size: 5,
    status: 'en_route',
    lat: 22.2612,
    lng: 73.1921,
    station_id: 'st-hazmat-depot',
    current_incident_id: 'inc-002',
    fatigue: 0.1,
    phone: '+91 98250 11004',
    speed_kmh: 50
  },
  {
    id: 'unit-amb-01',
    name: 'ALS Trauma Ambulance 108-A',
    kind: 'ambulance',
    category: 'vehicle',
    agency: 'GVK-EMRI 108 Emergency',
    capabilities: ['icu_transport', 'ventilator', 'trauma_management'],
    equipment: { ventilator: 1, defibrillator: 1, oxygen_cylinders: 4 },
    crew_size: 3,
    status: 'en_route',
    lat: 22.3481,
    lng: 73.2298,
    station_id: 'st-hosp-ssg',
    current_incident_id: 'inc-003',
    fatigue: 0.3,
    phone: '+91 98250 11005',
    speed_kmh: 60
  },
  {
    id: 'unit-amb-02',
    name: 'Pediatric EMS Van 108-C',
    kind: 'ambulance',
    category: 'vehicle',
    agency: 'GVK-EMRI 108 Emergency',
    capabilities: ['pediatric_icu', 'neonatal_incubator', 'cpr'],
    equipment: { infant_incubator: 1, pediatric_splints: 4 },
    crew_size: 3,
    status: 'en_route',
    lat: 22.3212,
    lng: 73.1965,
    station_id: 'st-hosp-ssg',
    current_incident_id: 'inc-006',
    fatigue: 0.25,
    phone: '+91 98250 11006',
    speed_kmh: 55
  },
  {
    id: 'unit-eng-02',
    name: 'Heavy Fire Engine FE-02 Dandia Bazar',
    kind: 'engine',
    category: 'vehicle',
    agency: 'Vadodara Fire & Emergency Services',
    capabilities: ['structural_fire', 'water_cannon', 'smoke_extraction'],
    equipment: { water_tank_liters: 6000, ladders: 3, hoses_meters: 300 },
    crew_size: 5,
    status: 'available',
    lat: 22.2985,
    lng: 73.2045,
    station_id: 'st-fire-dandia',
    current_incident_id: null,
    fatigue: 0.05,
    phone: '+91 98250 11007',
    speed_kmh: 50
  },
  {
    id: 'unit-tanker-01',
    name: 'Water Bowzer Tanker TB-01',
    kind: 'tanker',
    category: 'vehicle',
    agency: 'Vadodara Municipal Corp',
    capabilities: ['bulk_water_supply', 'pump_relay'],
    equipment: { water_capacity_liters: 12000 },
    crew_size: 2,
    status: 'available',
    lat: 22.3051,
    lng: 73.1752,
    station_id: 'st-fire-alkapuri',
    current_incident_id: null,
    fatigue: 0.1,
    phone: '+91 98250 11008',
    speed_kmh: 40
  },
  {
    id: 'unit-police-01',
    name: 'Vadodara Traffic Rapid Cordon Squad',
    kind: 'police',
    category: 'team',
    agency: 'Vadodara City Police',
    capabilities: ['perimeter_cordon', 'evacuation_corridor', 'traffic_diversion'],
    equipment: { barricades: 20, megaphones: 4, flare_lights: 10 },
    crew_size: 4,
    status: 'available',
    lat: 22.3089,
    lng: 73.1812,
    station_id: 'st-police-hq',
    current_incident_id: null,
    fatigue: 0.15,
    phone: '+91 98250 11009',
    speed_kmh: 45
  },
  {
    id: 'unit-crane-01',
    name: 'Heavy Hydraulic Recovery Crane CR-01',
    kind: 'crane',
    category: 'vehicle',
    agency: 'VMC Emergency Engineering',
    capabilities: ['heavy_lifting_40t', 'debris_clearing', 'winch_pull'],
    equipment: { boom_crane: 1, steel_cables: 4 },
    crew_size: 3,
    status: 'available',
    lat: 22.3354,
    lng: 73.1612,
    station_id: 'st-eng-gorwa',
    current_incident_id: null,
    fatigue: 0.05,
    phone: '+91 98250 11010',
    speed_kmh: 30
  }
];

// Seed Critical Facilities in Vadodara
export const INITIAL_FACILITIES: FacilityOut[] = [
  {
    id: 'fac-ssg',
    name: 'Sir Sayajirao General (SSG) Govt Hospital',
    kind: 'hospital',
    lat: 22.3114,
    lng: 73.1932,
    capabilities: ['trauma', 'burn', 'icu', 'pediatric', 'toxicology'],
    beds_total: 1250,
    beds_free: 84,
    on_diversion: false,
    contact: '+91 265 2424848'
  },
  {
    id: 'fac-sterling',
    name: 'Sterling Multispeciality Hospital Vadodara',
    kind: 'hospital',
    lat: 22.3241,
    lng: 73.1618,
    capabilities: ['trauma', 'cardiac', 'icu', 'toxicology'],
    beds_total: 280,
    beds_free: 22,
    on_diversion: false,
    contact: '+91 265 6644000'
  },
  {
    id: 'fac-bhailal',
    name: 'Bhailal Amin General Hospital (BAGH)',
    kind: 'hospital',
    lat: 22.3298,
    lng: 73.1691,
    capabilities: ['trauma', 'icu', 'dialysis'],
    beds_total: 200,
    beds_free: 14,
    on_diversion: false,
    contact: '+91 265 3051000'
  },
  {
    id: 'fac-fire-central',
    name: 'Vadodara Central Fire Station Dandia Bazar',
    kind: 'fire_station',
    lat: 22.2982,
    lng: 73.2041,
    capabilities: ['foam_tender', 'turnable_ladder', 'water_bowzer'],
    beds_total: 0,
    beds_free: 0,
    on_diversion: false,
    contact: '+91 265 2413333'
  },
  {
    id: 'fac-fire-makarpura',
    name: 'GIDC Industrial Fire Station Makarpura',
    kind: 'fire_station',
    lat: 22.2538,
    lng: 73.1945,
    capabilities: ['chemical_foam', 'hazmat_suits', 'industrial_fire'],
    beds_total: 0,
    beds_free: 0,
    on_diversion: false,
    contact: '+91 265 2642222'
  },
  {
    id: 'fac-shelter-akota',
    name: 'Akota Municipal Indoor Stadium Relief Shelter',
    kind: 'shelter',
    lat: 22.2974,
    lng: 73.1751,
    capabilities: ['mass_feeding', 'sanitation', 'first_aid', 'family_tents'],
    beds_total: 500,
    beds_free: 380,
    on_diversion: false,
    contact: '+91 265 2334455'
  }
];

// Seed IoT Sensors
export const INITIAL_SENSORS: SensorOut[] = [
  {
    id: 'sensor-vg-01',
    kind: 'flood_gauge',
    lat: 22.3145,
    lng: 73.1901,
    threshold: 24.0,
    unit: 'ft',
    last_value: 26.4,
    last_at: minutesAgo(2),
    state: 'breach'
  },
  {
    id: 'sensor-vg-02',
    kind: 'flood_gauge',
    lat: 22.3021,
    lng: 73.1978,
    threshold: 24.0,
    unit: 'ft',
    last_value: 23.2,
    last_at: minutesAgo(3),
    state: 'warn'
  },
  {
    id: 'sensor-mk-02',
    kind: 'gas',
    lat: 22.2539,
    lng: 73.1959,
    threshold: 150.0,
    unit: 'ppm',
    last_value: 480.0,
    last_at: minutesAgo(1),
    state: 'breach'
  },
  {
    id: 'sensor-tr-01',
    kind: 'traffic',
    lat: 22.3521,
    lng: 73.2384,
    threshold: 85.0,
    unit: '% congestion',
    last_value: 94.0,
    last_at: minutesAgo(4),
    state: 'breach'
  },
  {
    id: 'sensor-gw-01',
    kind: 'flood_gauge',
    lat: 22.3387,
    lng: 73.1552,
    threshold: 1.0,
    unit: 'm',
    last_value: 1.35,
    last_at: minutesAgo(5),
    state: 'breach'
  }
];

// Seed Alerts
export const INITIAL_ALERTS: AlertOut[] = [
  {
    id: 'alt-001',
    incident_id: 'inc-001',
    kind: 'critical',
    rule: 'R1_CRITICAL_P1_CREATED',
    level: 2,
    message: 'CRITICAL P1: Vishwamitri river flood overflow threatening zoo perimeter and residential colonies.',
    status: 'open',
    created_at: minutesAgo(18),
    ack_at: null
  },
  {
    id: 'alt-002',
    incident_id: 'inc-002',
    kind: 'delayed',
    rule: 'R3_SLA_BREACH_IMMUTABLE',
    level: 2,
    message: 'SLA BREACH: Chemical fire arrival exceeded SLA limit by 6 minutes. Response escalation active.',
    status: 'open',
    created_at: minutesAgo(6),
    ack_at: null
  },
  {
    id: 'alt-003',
    incident_id: 'inc-002',
    kind: 'escalation',
    rule: 'R5_UNMET_SHORTAGE',
    level: 1,
    message: 'RESOURCE SHORTAGE: 4 HazMat breathing apparatuses missing for toxic vapor suppression.',
    status: 'open',
    created_at: minutesAgo(10),
    ack_at: null
  },
  {
    id: 'alt-004',
    incident_id: 'inc-003',
    kind: 'cluster',
    rule: 'R6_SENSOR_CLUSTER',
    level: 1,
    message: 'HIGHWAY TRAFFIC SURGE: Golden crossroads congestion 94% with collision reported.',
    status: 'ack',
    created_at: minutesAgo(14),
    ack_at: minutesAgo(8)
  }
];

// Seed Notifications
export const INITIAL_NOTIFICATIONS: NotificationOut[] = [
  {
    id: 'notif-001',
    event: 'incident.p1_created',
    recipient: 'Resident District Collector, Vadodara',
    role: 'authority',
    channel: 'sms',
    subject: 'FLASH: P1 Incident Sayaji Baug Flood',
    body: 'P1 Flash Flood declared at Sayaji Baug (26.4ft breach). NDRF deployment authorized.',
    status: 'sent',
    incident_id: 'inc-001',
    created_at: minutesAgo(17)
  },
  {
    id: 'notif-002',
    event: 'assignment.dispatched',
    recipient: 'NDRF Boat Alpha (Commander Rana)',
    role: 'field_team',
    channel: 'inapp',
    subject: 'Tactical Deployment: Sayaji Baug Zoo Gate 2',
    body: 'Proceed immediately with 2 inflatable boats. Coordinate with Station Officer Parmar.',
    status: 'sent',
    incident_id: 'inc-001',
    created_at: minutesAgo(14)
  },
  {
    id: 'notif-003',
    event: 'hospital.surge_notice',
    recipient: 'SSG Trauma Center Emergency Registrar',
    role: 'hospital',
    channel: 'webhook',
    subject: 'Incoming Surge: NH48 Highway Pileup',
    body: 'Prepare 6 Red-zone trauma bays for incoming multi-vehicle pileup victims. ETA 7 mins.',
    status: 'sent',
    incident_id: 'inc-003',
    created_at: minutesAgo(10)
  }
];

// Seed Reports for Detailed View
export const INITIAL_REPORTS: Record<string, ReportOut[]> = {
  'inc-001': [
    {
      id: 'rep-001',
      source: 'sensor',
      text: 'Flood gauge VG-01 at Sayaji Baug Bridge reads 26.4ft (Threshold 24.0ft exceeded). Flow velocity 2.1 m/s.',
      lat: 22.3145,
      lng: 73.1901,
      location_text: 'Sayaji Baug Northern Perimeter',
      reliability: 0.95,
      created_at: minutesAgo(18),
      incident_id: 'inc-001'
    },
    {
      id: 'rep-002',
      source: 'citizen',
      text: 'Water entered zoo boundary, monkey enclosures half submerged! 4 keepers trapped on roof, please send boats fast!',
      lat: 22.3134,
      lng: 73.1895,
      location_text: 'Sayaji Baug Zoo Enclosure 4',
      reliability: 0.75,
      created_at: minutesAgo(16),
      incident_id: 'inc-001'
    },
    {
      id: 'rep-003',
      source: 'call',
      text: 'Emergency 112 Transcript: "Kala Ghoda circle under 3 feet of water, two cars stalled and swept against the bridge railing. People shouting for help."',
      lat: 22.3112,
      lng: 73.1882,
      location_text: 'Kala Ghoda Bridge',
      reliability: 0.85,
      created_at: minutesAgo(15),
      incident_id: 'inc-001'
    },
    {
      id: 'rep-004',
      source: 'field',
      text: 'Patrol Car PCR-04: Confirmed severe flooding across Sayaji Baug road. Electrical substation humming loudly, request immediate power cut from MGVCL.',
      lat: 22.3128,
      lng: 73.1890,
      location_text: 'Sayaji Baug Substation Road',
      reliability: 0.95,
      created_at: minutesAgo(12),
      incident_id: 'inc-001'
    }
  ],
  'inc-002': [
    {
      id: 'rep-005',
      source: 'sensor',
      text: 'Makarpura VOC Sensor MK-02 detected 480ppm benzene/solvent spike.',
      lat: 22.2539,
      lng: 73.1959,
      location_text: 'GIDC Phase II Plot 142',
      reliability: 0.95,
      created_at: minutesAgo(32),
      incident_id: 'inc-002'
    },
    {
      id: 'rep-006',
      source: 'call',
      text: 'Caller from neighbouring agrochemical factory reports massive orange fireball and continuous drum ruptures.',
      lat: 22.2541,
      lng: 73.1956,
      location_text: 'Chemical Zone Makarpura',
      reliability: 0.8,
      created_at: minutesAgo(30),
      incident_id: 'inc-002'
    }
  ]
};

// Seed Mock Analytics
export const MOCK_ANALYTICS = {
  overview: {
    total_incidents: 42,
    total_reports: 186,
    dedupe_ratio: 4.43,
    avg_response_min: 5.8,
    sla_compliance_pct: 91.4,
    open_alerts: 3,
    top_type: 'flood'
  } as AnalyticsOverview,
  types: [
    { type: 'flood', count: 16 },
    { type: 'fire', count: 9 },
    { type: 'road_accident', count: 7 },
    { type: 'industrial_hazard', count: 4 },
    { type: 'medical', count: 3 },
    { type: 'building_collapse', count: 2 },
    { type: 'gas_leak', count: 1 }
  ] as AnalyticsTypeCount[],
  delays: {
    by_type: [
      { type: 'flood', avg_assign_min: 2.1, avg_arrival_min: 7.4 },
      { type: 'fire', avg_assign_min: 1.4, avg_arrival_min: 5.2 },
      { type: 'industrial_hazard', avg_assign_min: 2.5, avg_arrival_min: 8.1 },
      { type: 'road_accident', avg_assign_min: 1.8, avg_arrival_min: 6.0 },
      { type: 'medical', avg_assign_min: 1.2, avg_arrival_min: 4.5 }
    ],
    by_priority: [
      { priority: 'P1', avg_assign_min: 1.1, avg_arrival_min: 4.8, sla_pct: 94.2 },
      { priority: 'P2', avg_assign_min: 2.4, avg_arrival_min: 7.1, sla_pct: 90.0 },
      { priority: 'P3', avg_assign_min: 4.6, avg_arrival_min: 12.2, sla_pct: 88.5 },
      { priority: 'P4', avg_assign_min: 8.2, avg_arrival_min: 18.0, sla_pct: 93.1 }
    ]
  } as AnalyticsDelay,
  shortages: [
    { subtype: 'Rescue Inflatable Boats', demand: 8, available: 4, unmet_count: 4 },
    { subtype: 'High Capacity Submersible Pumps', demand: 12, available: 6, unmet_count: 6 },
    { subtype: 'HazMat Level-A Suits', demand: 6, available: 2, unmet_count: 4 },
    { subtype: 'Heavy Hydraulic Spreaders', demand: 5, available: 4, unmet_count: 1 }
  ] as AnalyticsShortage[],
  hotspots: [
    { area: 'Vishwamitri Riverside (Sayaji Baug to Kala Ghoda)', lat: 22.3134, lng: 73.1895, count: 18, weight: 0.95 },
    { area: 'Makarpura GIDC Industrial Corridor', lat: 22.2541, lng: 73.1956, count: 9, weight: 0.85 },
    { area: 'NH48 Golden Crossroads Junction', lat: 22.3524, lng: 73.2381, count: 7, weight: 0.75 },
    { area: 'Mandvi / Old City Heritage Arcade', lat: 22.3012, lng: 73.2085, count: 5, weight: 0.65 },
    { area: 'Gorwa Railway Underpass', lat: 22.3389, lng: 73.1554, count: 3, weight: 0.45 }
  ] as AnalyticsHotspot[],
  timeseries: [
    { bucket: '08:00', count: 2, p1: 0 },
    { bucket: '09:00', count: 5, p1: 1 },
    { bucket: '10:00', count: 8, p1: 2 },
    { bucket: '11:00', count: 14, p1: 4 },
    { bucket: '12:00', count: 7, p1: 1 },
    { bucket: '13:00', count: 4, p1: 0 },
    { bucket: '14:00', count: 2, p1: 0 }
  ] as AnalyticsTimeSeries[],
  sources: [
    { source: 'Citizen Web App', count: 82 },
    { source: '112 Emergency Calls', count: 48 },
    { source: 'IoT River & Gas Sensors', count: 26 },
    { source: 'Field Responders', count: 20 },
    { source: 'Hospital Notices', count: 10 }
  ] as AnalyticsSource[]
};
