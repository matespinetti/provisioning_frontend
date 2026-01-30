'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Search, Loader2, Hash, Phone } from 'lucide-react'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { searchFormSchema } from '@/lib/validation/subscriber'

type SearchFormValues = z.infer<typeof searchFormSchema>

export function SearchForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'iccid' | 'msisdn'>('iccid')

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { mode: 'iccid', value: '' },
    mode: 'onChange',
  })

  const onSubmit = (data: SearchFormValues) => {
    startTransition(() => {
      router.push(`/subscribers/${data.value}`)
    })
  }

  const toggleMode = (next: 'iccid' | 'msisdn') => {
    setMode(next)
    form.setValue('mode', next)
    form.setValue('value', '')
    form.clearErrors('value')
  }

  const error = form.formState.errors.value?.message

  return (
    <Card className="border-slate-200/80 bg-white/80 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/70">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl">Find a subscriber</CardTitle>
          <CardDescription>Search by ICCID or MSISDN</CardDescription>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={mode === 'iccid' ? 'default' : 'muted'}
            className="cursor-pointer select-none"
            onClick={() => toggleMode('iccid')}
          >
            <Hash className="mr-1 h-3.5 w-3.5" />
            ICCID
          </Badge>
          <Badge
            variant={mode === 'msisdn' ? 'default' : 'muted'}
            className="cursor-pointer select-none"
            onClick={() => toggleMode('msisdn')}
          >
            <Phone className="mr-1 h-3.5 w-3.5" />
            MSISDN
          </Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register('mode')} value={mode} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">
              {mode === 'iccid' ? 'ICCID' : 'MSISDN'}
            </label>
            <Input
              placeholder={mode === 'iccid' ? '8931XXXXXXXXXXXXXXXX' : '316XXXXXXXX or 31970XXXXXXXX'}
              {...form.register('value')}
              autoFocus
              inputMode="numeric"
              className={error ? 'border-destructive ring-destructive/10' : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'iccid'
                ? '20 digits, must start with 8931'
                : '11 digits starting 316 or 13 digits starting 31970'}
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search subscriber
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
