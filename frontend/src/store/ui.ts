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
  },
  {
    id: 'user-field',
    name: 'Vikram Rathod',
    role: 'team',
    roleTitle: 'Field Team Lead',
    agency: 'SDRF Water Rescue (Boat-01)',
    initials: 'VR',
    route: '/team/unit-boat-01',
  },
  {
    id: 'user-hospital',
    name: 'Dr. Neha Patel',
    role: 'hospital',
    roleTitle: 'Hospital Emergency Director',
    agency: 'SSG Civil Hospital',
    initials: 'NP',
    route: '/hospital/fac-ssg',
  },
  {
    id: 'user-citizen',
    name: 'Citizen Portal',
    role: 'citizen',
    roleTitle: 'Public Informant & Tracker',
    agency: 'Vadodara Public Intake',
    initials: 'CP',
    route: '/report',
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
