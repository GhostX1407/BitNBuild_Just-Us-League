import { create } from 'zustand';

export type UserRole = 'dispatcher' | 'team' | 'citizen' | 'hospital';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  agency: string;
  initials: string;
  route: string;
  scopeDescription: string;
  badgeLabel: string;
  badgeColor: string;
  allowedRoutes: string[];
  features: string[];
  restrictedFeatures: string[];
  canSimulate: boolean;
  canDispatch: boolean;
  canOverridePriority: boolean;
}

export const USER_PROFILES: UserProfile[] = [
  {
    id: 'user-admin',
    name: 'Aditya Sharma',
    role: 'dispatcher',
    roleTitle: 'Central Dispatch Admin',
    agency: 'Vadodara Emergency Ops Center',
    initials: 'AS',
    route: '/console',
    scopeDescription: 'Full Platform Authority (Console, Simulator, Fleets, Hospitals, AI Triage & Analytics)',
    badgeLabel: 'Full Admin Access',
    badgeColor: 'bg-slate-900 text-white',
    allowedRoutes: ['/console', '/alerts', '/analytics', '/simulator', '/hospital', '/team', '/report', '/track'],
    features: ['Central Command Console', 'Alerts & Escalation Feed', 'Live Chaos Simulator', 'Fleet Dispatch Approvals', 'Hospital Bed Surge Management', 'Citywide Analytics & Deduplication', '112 Call Log Intake'],
    restrictedFeatures: [],
    canSimulate: true,
    canDispatch: true,
    canOverridePriority: true,
  },
  {
    id: 'user-field',
    name: 'Vikram Rathod',
    role: 'team',
    roleTitle: 'Field Tactical Lead',
    agency: 'SDRF Water Rescue (Boat-01)',
    initials: 'VR',
    route: '/team/unit-boat-01',
    scopeDescription: 'Field Tactical HUD, Live GPS Coordinates, SOP Action Items, and On-Scene SITREP Transmission.',
    badgeLabel: 'Tactical Field Ops',
    badgeColor: 'bg-emerald-600 text-white',
    allowedRoutes: ['/team', '/console', '/alerts', '/report', '/track'],
    features: ['Field Tactical HUD', 'Tactical Incident Map', 'Alerts Feed', 'Live Unit Telemetry', 'Tactical SOP Checklist', 'SITREP Status Transmission'],
    restrictedFeatures: ['Chaos Simulator (Admin Only)', 'Citywide Analytics (Admin/Hospital Only)', 'Fleet Dispatch Override (Admin Only)'],
    canSimulate: false,
    canDispatch: false,
    canOverridePriority: false,
  },
  {
    id: 'user-hospital',
    name: 'Dr. Neha Patel',
    role: 'hospital',
    roleTitle: 'Hospital Emergency Director',
    agency: 'SSG Civil Hospital',
    initials: 'NP',
    route: '/hospital/fac-ssg',
    scopeDescription: 'Trauma & ICU Bed Surge Counters, Ambulance Diversion Switch, Casualty Stream Intake, and Shortage Analytics.',
    badgeLabel: 'Trauma & Bed Surge',
    badgeColor: 'bg-rose-600 text-white',
    allowedRoutes: ['/hospital', '/analytics', '/alerts', '/console', '/report', '/track'],
    features: ['Trauma & ICU Bed Surge Counter', 'Ambulance Diversion Switch', 'Casualty Triage Stream', 'Medical Shortage Analytics', 'Resource Supply Status'],
    restrictedFeatures: ['Chaos Simulator (Admin Only)', 'Field Fleet Dispatch (Admin Only)', 'Police/Fire Incident Priority Override'],
    canSimulate: false,
    canDispatch: false,
    canOverridePriority: false,
  },
  {
    id: 'user-citizen',
    name: 'Citizen Portal',
    role: 'citizen',
    roleTitle: 'Public Citizen Reporter',
    agency: 'Vadodara Public Intake',
    initials: 'CP',
    route: '/report',
    scopeDescription: 'Public Emergency SOS Intake (Web Form, Voice Note, Photo) and Live Emergency Request Tracking.',
    badgeLabel: 'Public Citizen Portal',
    badgeColor: 'bg-amber-600 text-white',
    allowedRoutes: ['/report', '/track'],
    features: ['Public SOS Emergency Report', 'Live Ambulance / Rescue Boat Tracking', 'Voice Dictation SOS', 'Emergency Photo Attachment'],
    restrictedFeatures: ['Central Command Console', 'Chaos Simulator', 'Field Fleet Controls', 'Hospital Bed Surge Systems', 'EOC Analytics'],
    canSimulate: false,
    canDispatch: false,
    canOverridePriority: false,
  },
];

interface UiState {
  isAuthenticated: boolean;
  currentUser: UserProfile;
  isAuthModalOpen: boolean;
  role: UserRole;
  activeUnitId: string;
  activeHospitalId: string;
  isDrawerOpen: boolean;
  isNotificationOpen: boolean;
  isMergeDialogOpen: boolean;
  activeScenario: string | null;
  isSimRunning: boolean;
  isMockMode: boolean;
  wsConnected: boolean;
  hasBooted: boolean;
  toast: { title: string; message: string; type?: 'info' | 'success' | 'alert' | 'warn' } | null;

  login: (user: UserProfile) => void;
  logout: () => void;
  setCurrentUser: (user: UserProfile) => void;
  setAuthModalOpen: (open: boolean) => void;
  setRole: (role: UserRole) => void;
  setActiveUnitId: (id: string) => void;
  setActiveHospitalId: (id: string) => void;
  setDrawerOpen: (open: boolean) => void;
  setNotificationOpen: (open: boolean) => void;
  setMergeDialogOpen: (open: boolean) => void;
  setActiveScenario: (scenario: string | null) => void;
  setSimRunning: (running: boolean) => void;
  setMockMode: (mock: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  setBooted: (booted: boolean) => void;
  showToast: (toast: { title: string; message: string; type?: 'info' | 'success' | 'alert' | 'warn' }) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAuthenticated: false,
  currentUser: USER_PROFILES[0],
  isAuthModalOpen: false,
  role: 'dispatcher',
  activeUnitId: 'unit-boat-01',
  activeHospitalId: 'fac-ssg',
  isDrawerOpen: true,
  isNotificationOpen: false,
  isMergeDialogOpen: false,
  activeScenario: null,
  isSimRunning: false,
  isMockMode: import.meta.env.VITE_USE_MOCK !== 'false',
  wsConnected: true,
  hasBooted: false,
  toast: null,

  login: (user) => {
    set({ isAuthenticated: true, currentUser: user, role: user.role });
    localStorage.setItem('resqgrid_auth', 'true');
    localStorage.setItem('resqgrid_profile_id', user.id);
  },
  logout: () => {
    set({ isAuthenticated: false });
    localStorage.removeItem('resqgrid_auth');
  },
  setCurrentUser: (currentUser) => set({ currentUser, role: currentUser.role }),
  setAuthModalOpen: (isAuthModalOpen) => set({ isAuthModalOpen }),
  setRole: (role) => set({ role }),
  setActiveUnitId: (activeUnitId) => set({ activeUnitId }),
  setActiveHospitalId: (activeHospitalId) => set({ activeHospitalId }),
  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
  setNotificationOpen: (isNotificationOpen) => set({ isNotificationOpen }),
  setMergeDialogOpen: (isMergeDialogOpen) => set({ isMergeDialogOpen }),
  setActiveScenario: (activeScenario) => set({ activeScenario }),
  setSimRunning: (isSimRunning) => set({ isSimRunning }),
  setMockMode: (isMockMode) => set({ isMockMode }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setBooted: (hasBooted) => set({ hasBooted }),
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => {
      set((state) => (state.toast === toast ? { toast: null } : state));
    }, 4500);
  },
  clearToast: () => set({ toast: null }),
}));
