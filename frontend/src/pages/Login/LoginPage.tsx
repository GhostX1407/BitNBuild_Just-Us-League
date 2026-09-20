import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Shield,
  Radio,
  Building2,
  Users,
  ArrowRight,
  Lock,
  CheckCircle2,
  KeyRound,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useUiStore, USER_PROFILES, UserProfile } from '../../store/ui';
import { cn } from '../../utils/format';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useUiStore((state) => state.login);
  const showToast = useUiStore((state) => state.showToast);

  const [mode, setMode] = useState<'personas' | 'credentials'>('personas');
  const [email, setEmail] = useState('aditya.sharma@resqgrid.vadodara.gov.in');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<'dispatcher' | 'team' | 'hospital' | 'citizen'>('dispatcher');

  const handlePersonaSelect = (profile: UserProfile) => {
    login(profile);
    navigate(profile.route);
    showToast({
      title: 'Authentication Successful',
      message: `Welcome, ${profile.name} · Signed in as ${profile.roleTitle}`,
      type: 'success',
    });
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProfile =
      USER_PROFILES.find((p) => p.role === selectedRole) || USER_PROFILES[0];
    login(targetProfile);
    navigate(targetProfile.route);
    showToast({
      title: 'Credentials Verified',
      message: `Signed in as ${targetProfile.name}`,
      type: 'success',
    });
  };

  const getProfileIcon = (role: string) => {
    switch (role) {
      case 'dispatcher':
        return <Shield className="w-6 h-6 text-blue-600" />;
      case 'team':
        return <Radio className="w-6 h-6 text-emerald-600" />;
      case 'hospital':
        return <Building2 className="w-6 h-6 text-rose-600" />;
      case 'citizen':
        return <Users className="w-6 h-6 text-amber-600" />;
      default:
        return <Shield className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Municipal Branding Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <span>ResQGrid</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-slate-400 font-normal">Vadodara Smart City</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Emergency Operations Center (EOC) Unified Gateway
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white border border-slate-200/80 rounded-full text-xs font-medium text-slate-600 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Citywide Telemetry Grid Live</span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="w-full max-w-4xl mx-auto my-auto space-y-6">
        {/* Welcome Text */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Sign In to Emergency Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
            Select your operating profile or use official credentials to coordinate field teams, hospital bed surges, and automated AI triage.
          </p>
        </div>

        {/* Auth Mode Toggle Pill */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-200/70 p-1 rounded-xl border border-slate-300/60 shadow-inner">
            <button
              type="button"
              onClick={() => setMode('personas')}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                mode === 'personas'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              1-Click Operator Personas
            </button>
            <button
              type="button"
              onClick={() => setMode('credentials')}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                mode === 'credentials'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Government Credentials (RBAC)
            </button>
          </div>
        </div>

        {/* Mode 1: 1-Click Operating Persona 3D Tiles */}
        {mode === 'personas' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {USER_PROFILES.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handlePersonaSelect(profile)}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-tile hover:shadow-tile-hover hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer group flex flex-col justify-between text-left"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      {getProfileIcon(profile.role)}
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200/80">
                      {profile.role.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      {profile.roleTitle}
                    </span>
                    <h3 className="text-base font-heading font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5">
                      {profile.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-1">
                      {profile.agency}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="text-slate-400 text-[11px] font-mono">
                    Default Workspace: {profile.route}
                  </span>
                  <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform text-blue-600">
                    <span>Authenticate</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Mode 2: Official RBAC Credentials Form */
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-white border border-slate-200/90 shadow-tile space-y-4">
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Official Email / Badge ID
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Security Passkey
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Authorization Scope
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                >
                  <option value="dispatcher">Central Dispatcher (Full Incident Authority)</option>
                  <option value="team">Field Team Lead (Tactical HUD)</option>
                  <option value="hospital">Hospital Administrator (Bed Surge)</option>
                  <option value="citizen">Public Citizen Reporter (Intake Portal)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Authenticate & Access Console
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Security & Official Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Vadodara Municipal Corporation · ResQGrid Emergency Grid Protocol</span>
        </div>
        <div>
          <span>ISO 27001 Certified · AES-256 Encrypted Telemetry</span>
        </div>
      </footer>
    </div>
  );
};
