import React from 'react';
import { X, Send, MessageSquare, Mail, Globe, CheckCircle2, Clock } from 'lucide-react';
import { useNotificationsStore } from '../../store/notifications';
import { useUiStore } from '../../store/ui';
import { formatRelativeTime } from '../../utils/time';
import { cn } from '../../utils/format';

export const NotificationDrawer: React.FC = () => {
  const isOpen = useUiStore((state) => state.isNotificationOpen);
  const setOpen = useUiStore((state) => state.setNotificationOpen);
  const currentUser = useUiStore((state) => state.currentUser);
  const notifications = useNotificationsStore((state) => state.notifications);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);

  if (!isOpen) return null;

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <MessageSquare className="w-3.5 h-3.5 text-amber-600" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />;
      case 'webhook':
        return <Globe className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Send className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-900" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-none">
              Dispatched Outbox & Alerts
            </h2>
            <span className="text-[10px] text-slate-500 font-medium">
              Targeted to: {currentUser.roleTitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Mark all read
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No recent notifications.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="p-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {getChannelIcon(n.channel)}
                  <span className="text-xs font-semibold text-slate-900">
                    {n.recipient}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {n.channel.toUpperCase()}
                </span>
              </div>

              <div className="text-xs font-medium text-slate-800 mb-1">
                {n.subject}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-2">
                {n.body}
              </p>

              <div className="text-[11px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                {formatRelativeTime(n.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
