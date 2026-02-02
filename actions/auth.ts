'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { LoginResponse, RefreshResponse } from '@/types/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Cookie security settings - set to false if running HTTP without SSL
const COOKIES_SECURE = process.env.NEXT_PUBLIC_COOKIES_SECURE === 'true'

/**
 * Login action - Authenticate user and set httpOnly cookies
 */
export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        error: error.detail || 'Invalid username or password'
      }
    }

    const data: LoginResponse = await response.json()

    // Set httpOnly cookies for tokens
    const cookieStore = await cookies()

    cookieStore.set('access_token', data.access_token, {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    })

    cookieStore.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Set session expiry cookie (NOT httpOnly - needs JS access for client-side checks)
    cookieStore.set('session_expires_at', String(Date.now() + 3600 * 1000), {
      secure: COOKIES_SECURE,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    })

    // Store user data in another cookie for easy access (optional)
    cookieStore.set('user_data', JSON.stringify(data.user), {
      secure: COOKIES_SECURE,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

  } catch (error) {
    console.error('Login error:', error)
    return { error: 'An error occurred during login. Please try again.' }
  }

  redirect('/dashboard')
}

/**
 * Refresh token action - Get new access token using refresh token
 */
export async function refreshAction() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (!refreshToken) {
    // No refresh token, redirect to login
    cookieStore.delete('access_token')
    cookieStore.delete('session_expires_at')
    cookieStore.delete('user_data')
    redirect('/login')
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      // Refresh token expired or invalid
      cookieStore.delete('access_token')
      cookieStore.delete('refresh_token')
      cookieStore.delete('session_expires_at')
      cookieStore.delete('user_data')
      redirect('/login')
    }

    const data: RefreshResponse = await response.json()

    // Update access token cookie
    cookieStore.set('access_token', data.access_token, {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    })

    // Update session expiry cookie
    cookieStore.set('session_expires_at', String(Date.now() + 3600 * 1000), {
      secure: COOKIES_SECURE,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    })

    return { success: true }
  } catch (error) {
    console.error('Token refresh error:', error)
    // On error, clear cookies and force re-login
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')
    cookieStore.delete('session_expires_at')
    cookieStore.delete('user_data')
    redirect('/login')
  }
}

/**
 * Logout action - Revoke tokens and clear cookies
 */
export async function logoutAction() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value

  // Call backend logout endpoint (optional - cookies will be deleted anyway)
  if (accessToken && refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch (error) {
      // Ignore errors, proceed with logout
      console.error('Logout error:', error)
    }
  }

  // Delete all cookies
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  cookieStore.delete('session_expires_at')
  cookieStore.delete('user_data')

  redirect('/login')
}
