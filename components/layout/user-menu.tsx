'use client'

import { useTransition } from 'react'
import { User2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { logoutAction } from '@/actions/auth'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  username?: string | null
  minimal?: boolean
}

export function UserMenu({ username = 'User', minimal }: UserMenuProps) {
  const [isPending, startTransition] = useTransition()

  const initials = username
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  const trigger = (
    <Button variant="ghost" className={cn('gap-2 px-2', minimal && 'w-full justify-start')}>
      <Avatar className="size-8">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {!minimal && (
        <span className="text-sm font-medium leading-none text-foreground">{username}</span>
      )}
    </Button>
  )

  if (minimal) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
        <Avatar className="size-10">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold">{username}</p>
          <p className="text-xs text-muted-foreground">Signed in</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleLogout} disabled={isPending}>
          {isPending ? '...' : 'Logout'}
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-semibold">{username}</p>
          <p className="text-xs text-muted-foreground">Provisioning Admin</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <User2 className="h-4 w-4" />
          Profile (soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 text-destructive focus:text-destructive"
          disabled={isPending}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
