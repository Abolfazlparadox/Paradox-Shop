import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

interface UIState {
  theme: ThemeMode;
  isCartDrawerOpen: boolean;
  isMobileMenuOpen: boolean;
  activeModal: string | null;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setCartDrawerOpen: (isOpen: boolean) => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleCartDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark', // Dark is primary branded default
  isCartDrawerOpen: false,
  isMobileMenuOpen: false,
  activeModal: null,

  setTheme: (theme: ThemeMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pdx_theme', theme);
      const root = document.documentElement;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    set({ theme });
  },

  setCartDrawerOpen: (isOpen: boolean) => set({ isCartDrawerOpen: isOpen }),
  setMobileMenuOpen: (isOpen: boolean) => set({ isMobileMenuOpen: isOpen }),
  openModal: (modalId: string) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  toggleCartDrawer: () => set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),
}));
