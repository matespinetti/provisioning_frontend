import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SectionFieldProps {
  label: string
  value: React.ReactNode
  mono?: boolean
  hint?: string
  badgeVariant?: 'success' | 'warning' | 'default' | 'muted'
}

export function SectionField({ label, value, mono, hint, badgeVariant }: SectionFieldProps) {
  const content =
    typeof value === 'string' && badgeVariant ? (
      <Badge variant={badgeVariant}>{value}</Badge>
    ) : (
      value
    )

  return (
    <div className="grid gap-1 rounded-lg border border-border/60 bg-white/60 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:bg-slate-900/50">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn('text-sm text-foreground', mono && 'font-mono tracking-tight')}>{content}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
