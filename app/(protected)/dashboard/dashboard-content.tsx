'use client'

import { useAuthStore } from '@/store/use-auth-store'
import { logoutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LogOut, User } from 'lucide-react'

export function DashboardContent() {
  const user = useAuthStore((state) => state.user)

  const handleLogout = async () => {
    await logoutAction()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username || 'User'}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.username}</div>
            <p className="text-xs text-muted-foreground mt-1">
              User ID: {user?.id}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriber Management</CardTitle>
            <CardDescription>
              Manage your mobile subscribers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create, read, update, and delete subscriber records.
            </p>
            <Button className="mt-4 w-full" variant="secondary" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
            <CardDescription>Backend connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Authentication system is working correctly
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Your authentication system is now set up and working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <p className="font-medium mb-1">✅ Authentication Features:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Secure login with httpOnly cookies</li>
              <li>Automatic token refresh (proactive, before expiry)</li>
              <li>Protected routes with middleware</li>
              <li>User session management with Zustand</li>
              <li>Beautiful Shadcn UI components</li>
            </ul>
          </div>
          <div className="text-sm mt-4">
            <p className="font-medium mb-1">🚀 Next Steps:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Build subscriber management pages</li>
              <li>Add data tables for subscriber lists</li>
              <li>Implement CRUD operations</li>
              <li>Add form validation for subscriber creation</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
