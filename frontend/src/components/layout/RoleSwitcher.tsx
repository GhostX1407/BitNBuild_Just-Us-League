import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Radio, Users, Building2 } from 'lucide-react';
import { useUiStore, UserRole } from '../../store/ui';
import { cn } from '../../utils/format';

export const RoleSwitcher: React.FC = () => {
  const role = useUiStore((state) => state.role);
  const setRole = useUiStore((state) => state.setRole);
  const activeUnitId = useUiStore((state) => state.activeUnitId);
  const activeHospitalId = useUiStore((state) => state.activeHospitalId);
  const navigate = useNavigate();

  const handleSelectRole = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'dispatcher') navigate('/console');
    else if (newRole === 'team') navigate(`/team/${activeUnitId}`);
    else if (newRole === 'citizen') navigate('/report');
    else if (newRole === 'hospital') navigate(`/hospital/${activeHospitalId}`);
  };

  const roles: Array<{ id: UserRole; label: string; icon: React.ReactNode }> = [
    { id: 'dispatcher', label: 'Command', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'team', label: 'Field', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'citizen', label: 'Citizen', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'hospital', label: 'Hospital', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
      {roles.map((r) => {
        const isActive = role === r.id;
        return (
          <button
            key={r.id}
            onClick={() => handleSelectRole(r.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer font-medium',
              isActive
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {r.icon}
            <span className="hidden sm:inline">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
};
