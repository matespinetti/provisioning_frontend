'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import type { User } from '@/types/auth'

/**
 * Client component that hydrates Zustand store with user data from server
 */
export function UserDataProvider({
  user,
  children,
}: {
  user: User | null
  children: React.ReactNode
}) {
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    if (user) {
      setUser(user)
    }
  }, [user, setUser])

  return <>{children}</>
}
