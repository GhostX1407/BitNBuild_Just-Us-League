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
  User,
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
    { to: '/console', label: 'Command Console', icon: <Activity className="w-3.5 h-3.5" /> },
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
    <header className="h-14 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between select-none z-30 shrink-0 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
      {/* Brand & Clean Streamlined Navigation */}
      <div className="flex items-center gap-6 md:gap-8">
        <NavLink to="/console" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm tracking-tight text-slate-900">
              ResQGrid
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Vadodara
            </span>
          </div>
        </NavLink>

        {/* Minimal Non-Redundant Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all font-medium select-none',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right Controls: Quick Report + Clock + Notifications + Profile Auth */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Report Emergency Button */}
        <NavLink
          to="/report"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all text-xs font-semibold shadow-sm active:translate-y-0.5"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-blue-600" />
          <span>+ Report Emergency</span>
        </NavLink>

        {/* Live IST Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-mono text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{timeStr} IST</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationOpen(!isNotificationOpen)}
          className={cn(
            'relative p-2 rounded-xl border transition-all cursor-pointer shadow-sm active:translate-y-0.5',
            isNotificationOpen
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
          title="Outbox & Notification Drawer"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile & Persona Switcher Gateway */}
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all cursor-pointer active:translate-y-0.5 group"
          title="Click to switch profile or operator persona"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
            {getProfileIcon(currentUser.role)}
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {currentUser.roleTitle}
            </div>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </button>
      </div>
    </header>
  );
};
