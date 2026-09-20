import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { ConnectionBanner } from '../components/layout/ConnectionBanner';
import { NotificationDrawer } from '../components/layout/NotificationDrawer';
import { AuthProfileModal } from '../components/layout/AuthProfileModal';
import { Toast } from '../components/ui/Toast';
import { AppRoutes } from './routes';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSnapshot } from '../hooks/useSnapshot';

export const App: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Bootstrap snapshot and connect real-time stream
  useSnapshot();
  useWebSocket();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {!isLoginPage && <ConnectionBanner />}
      {!isLoginPage && <AppHeader />}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <AppRoutes />
      </main>
      {!isLoginPage && <NotificationDrawer />}
      <AuthProfileModal />
      <Toast />
    </div>
  );
};
