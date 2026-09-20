import { create } from 'zustand';
import { NotificationOut } from '../types/domain';
import { INITIAL_NOTIFICATIONS } from '../services/mock';

interface NotificationsState {
  notifications: NotificationOut[];
  unreadCount: number;
  setNotifications: (notifications: NotificationOut[]) => void;
  addNotification: (notification: NotificationOut) => void;
  markAllRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: INITIAL_NOTIFICATIONS,
  unreadCount: INITIAL_NOTIFICATIONS.length,

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    })),

  markAllRead: () => set({ unreadCount: 0 })
}));
