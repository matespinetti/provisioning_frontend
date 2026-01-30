'use client'

import { useEffect } from 'react'
import { refreshAction } from '@/actions/auth'

const REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds
const CHECK_INTERVAL = 60 * 1000 // Check every 1 minute

/**
 * Background component that monitors token expiry and automatically refreshes
 * the access token before it expires (proactive refresh strategy)
 */
export function TokenRefreshMonitor() {
  useEffect(() => {
    const checkAndRefresh = async () => {
      // Read session_expires_at cookie (client-accessible)
      const expiresAt = document.cookie
        .split('; ')
        .find((row) => row.startsWith('session_expires_at='))
        ?.split('=')[1]

      if (!expiresAt) return

      const expiryTime = parseInt(expiresAt, 10)
      const now = Date.now()
      const timeUntilExpiry = expiryTime - now

      // Refresh if token expires in less than 5 minutes
      if (timeUntilExpiry > 0 && timeUntilExpiry < REFRESH_THRESHOLD) {
        try {
          await refreshAction()
        } catch (error) {
          console.error('Token refresh failed:', error)
          // Error handling is done in refreshAction (redirect to login)
        }
      }
    }

    // Check on mount
    checkAndRefresh()

    // Check every minute
    const interval = setInterval(checkAndRefresh, CHECK_INTERVAL)

    // Check when user returns to tab
    const handleFocus = () => {
      checkAndRefresh()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return null // No UI rendered
}
