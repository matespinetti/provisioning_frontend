import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({ user: state.user }), // Only persist user data, never tokens
    }
  )
)
