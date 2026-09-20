import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // In ms. Default 4000ms. 0 for persistent.
  createdAt: number;
}

interface NotificationState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const MAX_VISIBLE_TOASTS = 4;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 4000);

    const newToast: ToastItem = {
      ...toast,
      id,
      duration,
      createdAt: Date.now(),
    };

    set((state) => {
      // Deduplicate recent identical messages within 2 seconds
      const isDuplicate = state.toasts.some(
        (t) =>
          t.title === newToast.title &&
          t.message === newToast.message &&
          t.type === newToast.type &&
          Date.now() - t.createdAt < 2000
      );

      if (isDuplicate) return state;

      const updated = [...state.toasts, newToast];
      // Keep only up to MAX_VISIBLE_TOASTS
      return {
        toasts: updated.slice(-MAX_VISIBLE_TOASTS),
      };
    });

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),
}));

import { parseApiError } from '@/lib/api/error-handler';

/**
 * Format unknown server errors into clean, human-readable strings.
 */
export function formatErrorMessage(err: unknown, fallback = 'An unexpected system error occurred.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  const parsed = parseApiError(err);
  return parsed.message || fallback;
}

/**
 * Global notify helper API
 */
export const notify = {
  success: (title: string, message?: string, duration?: number) =>
    useNotificationStore.getState().addToast({ type: 'success', title, message, duration }),

  error: (title: string, errorOrMessage?: unknown, duration?: number) => {
    const message = errorOrMessage ? formatErrorMessage(errorOrMessage) : undefined;
    return useNotificationStore.getState().addToast({ type: 'error', title, message, duration });
  },

  warning: (title: string, message?: string, duration?: number) =>
    useNotificationStore.getState().addToast({ type: 'warning', title, message, duration }),

  info: (title: string, message?: string, duration?: number) =>
    useNotificationStore.getState().addToast({ type: 'info', title, message, duration }),

  loading: (title: string, message?: string) =>
    useNotificationStore.getState().addToast({ type: 'loading', title, message, duration: 0 }),

  dismiss: (id: string) => useNotificationStore.getState().removeToast(id),

  clearAll: () => useNotificationStore.getState().clearToasts(),
};
