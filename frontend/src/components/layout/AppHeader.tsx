import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  BarChart3,
  FilePlus2,
  Sliders,
  Bell,
  ChevronDown,
  Shield,
  Radio,
  Building2,
  Users,
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

  const navItems = [
    { to: '/console', label: 'Console', icon: <Activity className="w-3.5 h-3.5" /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { to: '/simulator', label: 'Simulator', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

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

  return (
    <div className="w-full px-3 sm:px-6 pt-2 pb-2 bg-slate-50 flex items-center justify-center shrink-0 z-30 select-none">
      {/* Apple Mac-style Floating 3D Curved Navigation Bar */}
      <header className="w-full max-w-6xl h-12.5 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-full px-3 sm:px-4 flex items-center justify-between shadow-[0_8px_30px_-4px_rgba(15,23,42,0.06),0_2px_8px_rgba(15,23,42,0.03),inset_0_1px_0_0_rgba(255,255,255,1)]">
        {/* Left: macOS Traffic Dots & Brand */}
        <div className="flex items-center gap-3">
          {/* macOS Accent Dots */}
          <div className="hidden lg:flex items-center gap-1.5 pl-1 pr-2 border-r border-slate-200/70">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/40" />
          </div>

          <NavLink to="/console" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-sm tracking-tight text-slate-900">
                ResQGrid
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold hidden md:inline border border-slate-200/60">
                Vadodara
              </span>
            </div>
          </NavLink>
        </div>

        {/* Center: Apple-style 3D Highlight Segmented Pill Tabs */}
        <nav className="flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/60 shadow-inner">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3.5 py-1 text-xs rounded-full transition-all duration-200 select-none',
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
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Report Emergency Button */}
          <NavLink
            to="/report"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>+ Report</span>
          </NavLink>

          {/* Clock */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100/70 border border-slate-200/60 rounded-full text-xs font-mono text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{timeStr}</span>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => setNotificationOpen(!isNotificationOpen)}
            className={cn(
              'relative p-1.5 rounded-full border transition-all cursor-pointer shadow-sm active:scale-95',
              isNotificationOpen
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            )}
            title="Outbox & Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] font-mono font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Apple User Profile Pill */}
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 group"
            title="Switch operator persona"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">
              {getProfileIcon(currentUser.role)}
            </div>

            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold text-slate-800 leading-none block">
                {currentUser.name.split(' ')[0]}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </button>
        </div>
      </header>
    </div>
  );
};
