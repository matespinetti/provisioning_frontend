import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { TokenRefreshMonitor } from '@/components/auth/token-refresh-monitor'
import { UserDataProvider } from './user-data-provider'
import { MainNav } from '@/components/layout/main-nav'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const userDataCookie = cookieStore.get('user_data')?.value

  // If no access token, redirect to login
  if (!accessToken) {
    redirect('/login')
  }

  // Parse user data from cookie
  let userData = null
  if (userDataCookie) {
    try {
      userData = JSON.parse(userDataCookie)
    } catch (error) {
      console.error('Failed to parse user data:', error)
    }
  }

  return (
    <>
      <TokenRefreshMonitor />
      <UserDataProvider user={userData}>
        <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
          <MainNav username={userData?.username} />
          <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</main>
        </div>
      </UserDataProvider>
    </>
  )
}
