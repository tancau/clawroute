import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, type User, type SharedKey, type DashboardData, type UsageStats, type Earnings } from '@/lib/api';

interface UserStore {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Keys state
  keys: SharedKey[];

  // Dashboard state
  data: DashboardData | null;
  usage: UsageStats | null;
  earnings: Earnings | null;

  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;

  // Keys actions
  fetchKeys: (userId: string) => Promise<void>;
  submitKey: (userId: string, provider: string, apiKey: string) => Promise<boolean>;
  toggleKey: (keyId: string, isActive: boolean) => Promise<void>;
  removeKey: (keyId: string) => Promise<void>;

  // Dashboard actions
  fetchDashboard: (userId: string) => Promise<void>;
  fetchUsage: (userId: string, days?: number) => Promise<void>;
  fetchEarnings: (userId: string) => Promise<void>;

  // Refresh all
  refreshAll: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false, // Start false so login button is clickable
      error: null,
      keys: [],
      data: null,
      usage: null,
      earnings: null,

      // Auth actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await api.login(email, password);

          if (result.error) {
            set({ isLoading: false, error: result.error.message });
            return false;
          }

          set({
            user: result.data!.user,
            token: result.data!.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (err) {
          set({ isLoading: false, error: 'Login failed' });
          return false;
        }
      },

      register: async (email: string, password: string, name?: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await api.register(email, password, name);

          if (result.error) {
            set({ isLoading: false, error: result.error.message });
            return false;
          }

          set({
            user: result.data!.user,
            token: result.data!.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (err) {
          set({ isLoading: false, error: 'Registration failed' });
          return false;
        }
      },

      logout: () => {
        api.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          keys: [],
          data: null,
          usage: null,
          earnings: null,
          error: null,
          isLoading: false,
        });
      },

      clearError: () => set({ error: null }),

      // Keys actions
      fetchKeys: async (userId: string) => {
        const result = await api.getKeys(userId);
        if (result.data) {
          set({ keys: result.data.keys });
        }
      },

      submitKey: async (userId: string, provider: string, apiKey: string) => {
        set({ isLoading: true, error: null });
        const result = await api.submitKey(userId, provider, apiKey);

        if (result.error) {
          set({ isLoading: false, error: result.error.message });
          return false;
        }

        await get().fetchKeys(userId);
        set({ isLoading: false });
        return true;
      },

      toggleKey: async (keyId: string, isActive: boolean) => {
        const result = await api.updateKey(keyId, { isActive });
        if (result.data) {
          set((state) => ({
            keys: state.keys.map((k) => (k.id === keyId ? { ...k, isActive } : k)),
          }));
        }
      },

      removeKey: async (keyId: string) => {
        const result = await api.deleteKey(keyId);
        if (result.data) {
          set((state) => ({
            keys: state.keys.filter((k) => k.id !== keyId),
          }));
        }
      },

      // Dashboard actions
      fetchDashboard: async (userId: string) => {
        const result = await api.getDashboard(userId);
        if (result.data) {
          set({ data: result.data });
        }
      },

      fetchUsage: async (userId: string, days: number = 30) => {
        const result = await api.getUsageStats(userId, days);
        if (result.data) {
          set({ usage: result.data.stats });
        }
      },

      fetchEarnings: async (userId: string) => {
        const result = await api.getEarnings(userId);
        if (result.data) {
          set({ earnings: result.data.earnings });
        }
      },

      // Refresh all
      refreshAll: async (userId: string) => {
        await Promise.all([
          get().fetchDashboard(userId),
          get().fetchKeys(userId),
          get().fetchUsage(userId),
          get().fetchEarnings(userId),
        ]);
      },
    }),
    {
      name: 'clawroute-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, storage) => {
        // Set isLoading to false after rehydration using set() to trigger re-render
        if (storage) {
          storage.setState({ isLoading: false });
        }
      },
    }
  )
);
