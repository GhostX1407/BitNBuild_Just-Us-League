import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Radio,
  Building2,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  X,
  UserCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useUiStore, USER_PROFILES, UserProfile } from '../../store/ui';
import { cn } from '../../utils/format';

export const AuthProfileModal: React.FC = () => {
  const isAuthModalOpen = useUiStore((state) => state.isAuthModalOpen);
  const setAuthModalOpen = useUiStore((state) => state.setAuthModalOpen);
  const currentUser = useUiStore((state) => state.currentUser);
  const setCurrentUser = useUiStore((state) => state.setCurrentUser);
  const showToast = useUiStore((state) => state.showToast);
  const navigate = useNavigate();

  const [selectedProfileId, setSelectedProfileId] = useState<string>(currentUser.id);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'dispatcher':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'team':
        return <Radio className="w-5 h-5 text-emerald-600" />;
      case 'hospital':
        return <Building2 className="w-5 h-5 text-rose-600" />;
      case 'citizen':
        return <Users className="w-5 h-5 text-amber-600" />;
      default:
        return <Shield className="w-5 h-5 text-blue-600" />;
    }
  };

  const handleSelectAndSwitch = (profile: UserProfile) => {
    setSelectedProfileId(profile.id);
    setCurrentUser(profile);
    setAuthModalOpen(false);
    navigate(profile.route);
    showToast({
      title: 'Profile Authenticated',
      message: `Signed in as ${profile.name} (${profile.roleTitle})`,
      type: 'success',
    });
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={() => setAuthModalOpen(false)}
      title="Operator Authentication & Profile Gateway"
      className="max-w-2xl"
    >
      <div className="space-y-5 select-none pt-1">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div>
            <h3 className="text-sm font-heading font-bold text-slate-900">
              Select Operating Persona
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Switch operational privileges across central command, field response, hospital triage, or citizen intake.
            </p>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Active Session</span>
          </div>
        </div>

        {/* 4 Clean 3D Profile Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {USER_PROFILES.map((profile) => {
            const isCurrent = currentUser.id === profile.id;

            return (
              <div
                key={profile.id}
                onClick={() => handleSelectAndSwitch(profile)}
                className={cn(
                  'relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left bg-white shadow-tile group',
                  isCurrent
                    ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-tile-hover'
                    : 'border-slate-200/90 hover:border-slate-400 hover:shadow-tile-hover hover:-translate-y-0.5'
                )}
              >
                {/* Active Indicator Pin */}
                {isCurrent && (
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Logged In</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getRoleIcon(profile.role)}
                  </div>

                  <div className="space-y-0.5 flex-1 pr-14">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {profile.roleTitle}
                      </span>
                      <span className={cn('text-[9px] font-mono px-2 py-0.2 rounded-full font-bold', profile.badgeColor)}>
                        {profile.badgeLabel}
                      </span>
                    </div>
                    <div className="text-sm font-heading font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {profile.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {profile.agency}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-snug">
                  {profile.scopeDescription}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Workspace: {profile.route}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Switch Persona →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security / Verification Footnote */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Role-Based Access Control (RBAC) active for Vadodara EOC.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const logout = useUiStore.getState().logout;
                logout();
                setAuthModalOpen(false);
                navigate('/login');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Sign Out to Login Screen
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
