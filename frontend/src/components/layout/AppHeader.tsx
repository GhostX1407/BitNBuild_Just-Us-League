import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  BarChart3,
  FilePlus2,
  Sliders,
  Bell,
  BellRing,
  ChevronDown,
  Shield,
  Radio,
  Building2,
  Users,
  Compass,
  Send,
  Bed,
  Megaphone,
  Handshake,
  BookOpen,
} from 'lucide-react';
import { useNotificationsStore } from '../../store/notifications';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/format';

export const AppHeader: React.FC = () => {
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const setNotificationOpen = useUiStore((state) => state.setNotificationOpen);
  const isNotificationOpen = useUiStore((state) => state.isNotificationOpen);
  const currentUser = useUiStore((state) => state.currentUser);
  const setAuthModalOpen = useUiStore((state) => state.setAuthModalOpen);
  const activeUnitId = useUiStore((state) => state.activeUnitId);
  const activeHospitalId = useUiStore((state) => state.activeHospitalId);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Role-Based Dynamic Navigation Tabs
  const getNavItems = () => {
    switch (currentUser.role) {
      case 'dispatcher':
        // Central Dispatch Admin has FULL access to all modules
        return [
          { to: '/console', label: 'Console', icon: <Activity className="w-3.5 h-3.5" /> },
          { to: '/alerts', label: 'Alerts', icon: <BellRing className="w-3.5 h-3.5" /> },
          { to: `/team/${activeUnitId}`, label: 'Field HUD', icon: <Radio className="w-3.5 h-3.5" /> },
          { to: `/hospital/${activeHospitalId}`, label: 'Hospital Surge', icon: <Building2 className="w-3.5 h-3.5" /> },
          { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { to: '/broadcast', label: 'Broadcast', icon: <Megaphone className="w-3.5 h-3.5" /> },
          { to: '/mutual-aid', label: 'Mutual Aid', icon: <Handshake className="w-3.5 h-3.5" /> },
          { to: '/ops', label: 'Ops Center', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { to: '/simulator', label: 'Simulator', icon: <Sliders className="w-3.5 h-3.5" /> },
        ];
      case 'team':
        // Field Lead: Tactical Field HUD, Incident Map, Alerts, and Mission Tracking
        return [
          { to: `/team/${activeUnitId}`, label: 'Field HUD', icon: <Radio className="w-3.5 h-3.5" /> },
          { to: '/console', label: 'Tactical Map', icon: <Activity className="w-3.5 h-3.5" /> },
          { to: '/alerts', label: 'Alerts', icon: <BellRing className="w-3.5 h-3.5" /> },
          { to: '/track/TRK-9821', label: 'Mission Track', icon: <Compass className="w-3.5 h-3.5" /> },
        ];
      case 'hospital':
        // Hospital Director: Bed Surge, Hospital Analytics, Alerts, and Casualty Stream
        return [
          { to: `/hospital/${activeHospitalId}`, label: 'Bed Surge', icon: <Building2 className="w-3.5 h-3.5" /> },
          { to: '/alerts', label: 'Alerts', icon: <BellRing className="w-3.5 h-3.5" /> },
          { to: '/analytics', label: 'Shortages & Capacity', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { to: '/console', label: 'Casualty Stream', icon: <Activity className="w-3.5 h-3.5" /> },
        ];
      case 'citizen':
        // Public Citizen: Only Public SOS and Tracking
        return [
          { to: '/report', label: 'Report Emergency', icon: <FilePlus2 className="w-3.5 h-3.5" /> },
          { to: '/track/TRK-9821', label: 'Track My SOS', icon: <Compass className="w-3.5 h-3.5" /> },
        ];
      default:
        return [
          { to: '/console', label: 'Console', icon: <Activity className="w-3.5 h-3.5" /> },
        ];
    }
  };

  const navItems = getNavItems();

  const getProfileIcon = (role: string) => {
    switch (role) {
      case 'dispatcher':
        return <Shield className="w-3.5 h-3.5 text-blue-600" />;
      case 'team':
        return <Radio className="w-3.5 h-3.5 text-emerald-600" />;
      case 'hospital':
        return <Building2 className="w-3.5 h-3.5 text-rose-600" />;
      case 'citizen':
        return <Users className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const getQuickActionButton = () => {
    switch (currentUser.role) {
      case 'dispatcher':
        return (
          <NavLink
            to="/report"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>+ Report</span>
          </NavLink>
        );
      case 'team':
        return (
          <NavLink
            to={`/team/${activeUnitId}`}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit</span>
          </NavLink>
        );
      case 'hospital':
        return (
          <NavLink
            to={`/hospital/${activeHospitalId}`}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <Bed className="w-3.5 h-3.5" />
            <span>Beds</span>
          </NavLink>
        );
      case 'citizen':
      default:
        return (
          <NavLink
            to="/report"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New Report</span>
          </NavLink>
        );
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 pt-2 pb-2 bg-slate-50 flex items-center justify-center shrink-0 z-30 select-none">
      {/* Apple Mac-style Floating 3D Curved Navigation Bar */}
      <header className="w-full max-w-7xl h-[52px] bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-full px-3.5 sm:px-4 flex items-center justify-between gap-3 shadow-[0_8px_30px_-4px_rgba(15,23,42,0.06),0_2px_8px_rgba(15,23,42,0.03),inset_0_1px_0_0_rgba(255,255,255,1)]">
        {/* Left: macOS Traffic Dots & Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 pl-1 pr-2.5 border-r border-slate-200/70">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/40" />
          </div>

          <NavLink to={currentUser.route} className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-sm tracking-tight text-slate-900">
                ResQGrid
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold hidden md:inline border border-slate-200/60">
                Vadodara
              </span>
            </div>
          </NavLink>
        </div>

        {/* Center: Apple-style 3D Segmented Control Pill Tabs */}
        <nav className="flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/60 shadow-inner overflow-x-auto no-scrollbar shrink-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all duration-200 select-none whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white text-slate-950 font-bold shadow-[0_2px_8px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] border border-slate-200/90 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50 font-medium'
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right: Mac-style Action Buttons + Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Role-Specific Quick Action */}
          {getQuickActionButton()}

          {/* Clock */}
          <div className="hidden xl:flex items-center gap-1.5 h-8.5 px-3 bg-slate-100/70 border border-slate-200/60 rounded-full text-xs font-mono text-slate-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{timeStr}</span>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => setNotificationOpen(!isNotificationOpen)}
            className={cn(
              'relative w-8.5 h-8.5 rounded-full border transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0',
              isNotificationOpen
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            )}
            title="Outbox & Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] font-mono font-bold text-white flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Apple User Profile Pill with Role Badge */}
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="h-8.5 pl-1.5 pr-2.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 group flex items-center gap-2 shrink-0"
            title={`Active: ${currentUser.name} (${currentUser.roleTitle}) · Click to switch persona`}
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xs shrink-0">
              {getProfileIcon(currentUser.role)}
            </div>

            <div className="flex flex-col text-left justify-center leading-none">
              <span className="text-xs font-semibold text-slate-800 leading-tight block">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[10px] font-medium text-slate-400 leading-none mt-0.5 block">
                {currentUser.role === 'dispatcher'
                  ? 'Admin'
                  : currentUser.role === 'team'
                  ? 'Field Ops'
                  : currentUser.role === 'hospital'
                  ? 'Hospital'
                  : 'Citizen'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-0.5" />
          </button>
        </div>
      </header>
    </div>
  );
};
