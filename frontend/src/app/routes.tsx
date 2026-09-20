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

export const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = useUiStore((state) => state.isAuthenticated);

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
            element={<Navigate to={isAuthenticated ? '/console' : '/login'} replace />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/console"
            element={isAuthenticated ? <ConsolePage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/analytics"
            element={isAuthenticated ? <AnalyticsPage /> : <Navigate to="/login" replace />}
          />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/team/:unitId" element={<TeamPage />} />
          <Route path="/team" element={<Navigate to="/team/unit-boat-01" replace />} />
          <Route path="/track/:trackId" element={<TrackPage />} />
          <Route path="/track" element={<Navigate to="/track/TRK-9821" replace />} />
          <Route path="/hospital/:id" element={<HospitalPage />} />
          <Route path="/hospital" element={<Navigate to="/hospital/fac-ssg" replace />} />
          <Route
            path="/simulator"
            element={isAuthenticated ? <SimulatorPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/console' : '/login'} replace />}
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};
