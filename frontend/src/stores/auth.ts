import { create } from 'zustand';
import { setApiAccessToken } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { parseApiError } from '@/lib/api/error-handler';
import { LoginRequest, TokenPair, UserProfile, UserRegistrationRequest } from '@/types/api';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<TokenPair>;
  register: (data: UserRegistrationRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<UserProfile | null>;
  setTokens: (tokens: TokenPair) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setTokens: (tokens: TokenPair) => {
    setApiAccessToken(tokens.access);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pdx_refresh_token', tokens.refresh);
    }
    set({
      accessToken: tokens.access,
      isAuthenticated: true,
      error: null,
    });
  },

  clearAuth: () => {
    setApiAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pdx_refresh_token');
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await authApi.login(credentials);
      get().setTokens(tokens);
      const profile = await authApi.getProfile();

      // Automatically merge guest session cart into user cart
      if (typeof window !== 'undefined') {
        const guestSession = localStorage.getItem('pdx_session_key') || '';
        try {
          const { cartApi } = await import('@/lib/api/endpoints');
          await cartApi.mergeCart({ session_key: guestSession });
          localStorage.removeItem('pdx_session_key');
        } catch {
          // Non-blocking merge error
        }
      }

      set({ user: profile, isLoading: false });
      return tokens;
    } catch (err: any) {
      const parsed = parseApiError(err, 'login');
      set({ isLoading: false, error: parsed.message });
      throw err;
    }
  },

  register: async (data: UserRegistrationRequest) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register(data);
      // Auto login after registration
      await get().login({ email: data.email, password: data.password });
    } catch (err: any) {
      const parsed = parseApiError(err, 'register');
      set({ isLoading: false, error: parsed.message });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('pdx_refresh_token') : null;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Silently clear auth even if logout API returns error
      }
    }
    get().clearAuth();
  },

  fetchProfile: async () => {
    if (!get().accessToken) return null;
    try {
      const profile = await authApi.getProfile();
      set({ user: profile });
      return profile;
    } catch (err) {
      return null;
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const refreshToken = localStorage.getItem('pdx_refresh_token');
    if (!refreshToken) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const tokens = await authApi.refreshToken(refreshToken);
      get().setTokens(tokens);
      const profile = await authApi.getProfile();
      set({ user: profile, isLoading: false });
    } catch (err) {
      get().clearAuth();
      set({ isLoading: false });
    }
  },
}));

// Listen for global auth-expired events dispatched from Axios interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('pdx:auth-expired', () => {
    useAuthStore.getState().clearAuth();
  });
}
