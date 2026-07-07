import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PartnerUser } from '@/lib/api/partnerAuth';

interface PartnerAuthState {
  user: PartnerUser | null;
  token: string | null;
  setUser: (user: PartnerUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const usePartnerAuthStore = create<PartnerAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('partner_auth_token', token);
        } else {
          localStorage.removeItem('partner_auth_token');
        }
      },
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('partner_auth_token');
      },
      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.user;
      },
    }),
    {
      name: 'partner-auth-storage',
    }
  )
);









