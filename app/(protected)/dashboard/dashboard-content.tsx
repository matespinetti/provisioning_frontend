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
import Link from 'next/link'
import {
  Activity,
  ClipboardList,
  FilePenLine,
  LogOut,
  PlusCircle,
  Trash2,
  User,
} from 'lucide-react'

export function DashboardContent() {
  const user = useAuthStore((state) => state.user)

  const handleLogout = async () => {
    await logoutAction()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

      <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <CardContent className="grid gap-4 p-6 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Operations hub</p>
              <h2 className="text-2xl font-semibold tracking-tight">Subscriber provisioning</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Jump into the most common tasks: create, read/edit, delete, or review audits.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link href="/subscribers/new">
                  <PlusCircle className="h-4 w-4" />
                  Add subscriber
                </Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/subscribers">
                  <FilePenLine className="h-4 w-4" />
                  Read / Edit
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/subscribers/delete">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Link>
              </Button>
              <Button asChild variant="ghost" className="gap-2">
                <Link href="/audit">
                  <ClipboardList className="h-4 w-4" />
                  Audit logs
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Today
            </p>
            <div className="mt-3 grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requests processed</span>
                <span className="text-sm font-semibold">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active sessions</span>
                <span className="text-sm font-semibold">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Queue status</span>
                <span className="text-sm font-semibold">Synchronous</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <CardDescription>Core workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create, read, update, and delete subscriber records.
            </p>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="secondary">
                <Link href="/subscribers">Open search</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/subscribers/new">Create new</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
            <CardDescription>Backend connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Authentication system is working correctly
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest provisioning events</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-4 text-sm text-muted-foreground">
              Activity feed will appear once operations are performed.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tips</CardTitle>
            <CardDescription>Quick checks before you deploy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/70 bg-white/60 p-3 dark:bg-slate-900/50">
              Confirm contract preset and APN speeds before creating a subscriber.
            </div>
            <div className="rounded-lg border border-border/70 bg-white/60 p-3 dark:bg-slate-900/50">
              Use ICCID for deletes to avoid accidental mismatches.
            </div>
            <div className="rounded-lg border border-border/70 bg-white/60 p-3 dark:bg-slate-900/50">
              Audit logs record every read and update for compliance.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
