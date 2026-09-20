import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LoginPage } from '../pages/Login/LoginPage';
import { ConsolePage } from '../pages/Console/ConsolePage';
import { AnalyticsPage } from '../pages/Analytics/AnalyticsPage';
import { ReportPage } from '../pages/Report/ReportPage';
import { TeamPage } from '../pages/Team/TeamPage';
import { TrackPage } from '../pages/Track/TrackPage';
import { HospitalPage } from '../pages/Hospital/HospitalPage';
import { SimulatorPage } from '../pages/Simulator/SimulatorPage';
import { AlertsPage } from '../pages/Alerts/AlertsPage';
import { useUiStore } from '../store/ui';

const pageVariants = {
  initial: { opacity: 0, y: 6, scale: 0.996 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.996 },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated);
  const currentUser = useUiStore((state) => state.currentUser);
  const showToast = useUiStore((state) => state.showToast);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = allowedRoles.includes(currentUser.role);
  if (!isAllowed) {
    setTimeout(() => {
      showToast({
        title: 'Access Restricted',
        message: `${currentUser.roleTitle} permissions do not grant access to this workspace. Redirected to your authorized portal.`,
        type: 'warn',
      });
    }, 150);
    return <Navigate to={currentUser.route} replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = useUiStore((state) => state.isAuthenticated);
  const currentUser = useUiStore((state) => state.currentUser);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="flex-1 flex flex-col h-full w-full overflow-hidden"
      >
        <Routes location={location}>
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? currentUser.route : '/login'} replace />}
          />
          <Route path="/login" element={<LoginPage />} />

          {/* Console: Admin, Field Lead, and Hospital Admin */}
          <Route
            path="/console"
            element={
              <RoleGuard allowedRoles={['dispatcher', 'team', 'hospital']}>
                <ConsolePage />
              </RoleGuard>
            }
          />

          {/* Dedicated Alerts Feed: Admin, Field Lead, and Hospital Director */}
          <Route
            path="/alerts"
            element={
              <RoleGuard allowedRoles={['dispatcher', 'team', 'hospital']}>
                <AlertsPage />
              </RoleGuard>
            }
          />

          {/* Analytics: Admin and Hospital Director */}
          <Route
            path="/analytics"
            element={
              <RoleGuard allowedRoles={['dispatcher', 'hospital']}>
                <AnalyticsPage />
              </RoleGuard>
            }
          />

          {/* Simulator: ONLY Central Dispatch Admin */}
          <Route
            path="/simulator"
            element={
              <RoleGuard allowedRoles={['dispatcher']}>
                <SimulatorPage />
              </RoleGuard>
            }
          />

          {/* Field HUD: Admin and Field Teams */}
          <Route
            path="/team/:unitId"
            element={
              <RoleGuard allowedRoles={['dispatcher', 'team']}>
                <TeamPage />
              </RoleGuard>
            }
          />
          <Route path="/team" element={<Navigate to="/team/unit-boat-01" replace />} />

          {/* Hospital Bed Surge: Admin and Hospital Directors */}
          <Route
            path="/hospital/:id"
            element={
              <RoleGuard allowedRoles={['dispatcher', 'hospital']}>
                <HospitalPage />
              </RoleGuard>
            }
          />
          <Route path="/hospital" element={<Navigate to="/hospital/fac-ssg" replace />} />

          {/* Public Intake & Tracking: Open to all roles */}
          <Route path="/report" element={<ReportPage />} />
          <Route path="/track/:trackId" element={<TrackPage />} />
          <Route path="/track" element={<Navigate to="/track/TRK-9821" replace />} />

          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? currentUser.route : '/login'} replace />}
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};
