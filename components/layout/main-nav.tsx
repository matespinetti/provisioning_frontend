'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, LogOut, PlusCircle, FilePenLine, Trash2, ClipboardList, Home } from 'lucide-react'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { UserMenu } from './user-menu'
import { logoutAction } from '@/actions/auth'
import { ModeToggle } from '@/components/mode-toggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/subscribers/new', label: 'Add Subscriber', icon: PlusCircle },
  { href: '/subscribers', label: 'Read/Edit Subscriber', icon: FilePenLine },
  { href: '/subscribers/delete', label: 'Delete Subscriber', icon: Trash2 },
  { href: '/audit', label: 'Audit Logs', icon: ClipboardList },
]

export function MainNav({ username }: { username?: string | null }) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  const renderLinks = () => (
    <div className="flex flex-1 items-center gap-2 md:gap-3">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/subscribers' && pathname?.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all',
              active
                ? 'bg-primary/10 text-primary shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {active && (
              <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary via-cyan-500 to-primary" />
            )}
          </Link>
        )
      })}
    </div>
  )

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/70 backdrop-blur-lg dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 via-cyan-400 to-emerald-500 text-white shadow-md shadow-sky-500/40 ring-1 ring-primary/20 flex items-center justify-center font-semibold">
              S
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Sona Provisioning</p>
              <p className="text-xs text-muted-foreground">Subscriber Ops</p>
            </div>
          </div>
          <nav className="hidden flex-1 items-center md:flex">{renderLinks()}</nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ModeToggle />
          <Separator orientation="vertical" className="h-6" />
          <UserMenu username={username} />
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left">Navigation</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <UserMenu username={username} minimal />
                <Separator />
                <div className="flex flex-col gap-1">{renderLinks()}</div>
                <div className="flex items-center justify-between px-2">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ModeToggle />
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={handleLogout}
                  disabled={isPending}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
