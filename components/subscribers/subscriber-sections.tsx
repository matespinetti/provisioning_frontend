'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { SectionField } from './section-field'
import { Subscriber } from '@/types/subscriber'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  patchApn,
  patchNetworkAccess,
  patchState,
  patchAor,
  patchCredit,
  patchBlockDataUsage,
} from '@/services/subscribers-actions'
import { NetworkAccessList } from '@/types/subscriber'

function formatDate(dateString?: string | null) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleString()
}

function parseSpeed(value: string) {
  if (value === 'max') return 'max'
  const num = Number(value)
  return Number.isFinite(num) ? num : value
}

function normalizeSpeed(value: string) {
  if (!value) return ''
  if (value === 'max') return 'max'
  const num = Number(value)
  return Number.isFinite(num) ? String(num) : value
}

function toDateOrUndefined(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatTime(date?: Date) {
  if (!date) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function setTimeOnDate(date: Date, timeValue: string) {
  const [hours, minutes] = timeValue.split(':').map((value) => Number(value))
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    const next = new Date(date)
    next.setHours(hours)
    next.setMinutes(minutes)
    next.setSeconds(0)
    next.setMilliseconds(0)
    return next
  }
  return date
}

function sameDate(a?: Date, b?: Date) {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

function toRFC3339(date: Date): string {
  // Format date to RFC3339 with timezone offset (e.g., 2026-02-03T14:16:52+01:00)
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  // Get timezone offset in +HH:MM or -HH:MM format
  const tzOffset = -date.getTimezoneOffset()
  const tzSign = tzOffset >= 0 ? '+' : '-'
  const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60))
  const tzMinutes = pad(Math.abs(tzOffset) % 60)

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tzSign}${tzHours}:${tzMinutes}`
}

const contractPlans = [
  { key: 'c0', label: 'Number Parking Service', service_package: 1200000, service_profile: 0, duration: 0 },
  { key: 'c1', label: 'Pay As You Go + usage data tier', service_package: 1200201, service_profile: 7, duration: 0 },
  { key: 'c2', label: 'M2M Data + SMS Only', service_package: 1200400, service_profile: 3, duration: 1 },
  { key: 'c3', label: 'ConnectivityBackup small 50GB', service_package: 1200600, service_profile: 1, duration: 12 },
  { key: 'c4', label: 'ConnectivityBackup medium 100GB', service_package: 1200601, service_profile: 1, duration: 12 },
  { key: 'c5', label: 'ConnectivityBackup large 200GB', service_package: 1200602, service_profile: 1, duration: 12 },
]

const speedPresets = [
  { key: '256', label: '256/64', speed_down: 256, speed_up: 64 },
  { key: '4096', label: '4096/1024', speed_down: 4096, speed_up: 1024 },
  { key: '8192', label: '8192/2048', speed_down: 8192, speed_up: 2048 },
  { key: 'max', label: 'max/max', speed_down: 'max' as const, speed_up: 'max' as const },
]

function getContractPlanLabel(servicePackage: number, serviceProfile: number, duration: number) {
  const match = contractPlans.find(
    (plan) =>
      plan.service_package === servicePackage &&
      plan.service_profile === serviceProfile &&
      plan.duration === duration
  )
  return match?.label ?? 'Custom'
}

function getContractPlanKey(servicePackage: number, serviceProfile: number, duration: number) {
  const match = contractPlans.find(
    (plan) =>
      plan.service_package === servicePackage &&
      plan.service_profile === serviceProfile &&
      plan.duration === duration
  )
  return match?.key ?? 'custom'
}

function getSpeedPresetKey(speedDown?: number | string, speedUp?: number | string) {
  const normalizedDown = speedDown?.toString() ?? ''
  const normalizedUp = speedUp?.toString() ?? ''
  const match = speedPresets.find(
    (preset) =>
      preset.speed_down.toString() === normalizedDown &&
      preset.speed_up.toString() === normalizedUp
  )
  return match?.key ?? 'custom'
}

interface Props {
  subscriber: Subscriber
}

export function SubscriberSections({ subscriber }: Props) {
  const router = useRouter()
  const { aor, apn, contract, credit, network_access_list, block_data_usage } = subscriber

  const [stateValue, setStateValue] = useState(subscriber.subscriber_state)
  const [stateEditing, setStateEditing] = useState(false)
  const [zones, setZones] = useState<NetworkAccessList>(network_access_list)
  const [zonesEditing, setZonesEditing] = useState(false)
  const [apnForm, setApnForm] = useState({
    name: apn?.name ?? '',
    speed_up: apn?.speed_up?.toString() ?? '',
    speed_down: apn?.speed_down?.toString() ?? '',
  })
  const [apnPreset, setApnPreset] = useState(
    getSpeedPresetKey(apn?.speed_down, apn?.speed_up)
  )
  const [aorForm, setAorForm] = useState({
    domain_id: String(aor.domain_id ?? ''),
    auth_username: aor.auth_username ?? '',
    auth_password: aor.auth_password ?? '',
  })
  const [showAorPassword, setShowAorPassword] = useState(false)
  const [creditForm, setCreditForm] = useState({
    max_credit: credit.max_credit.toFixed(2),
  })
  const [blockForm, setBlockForm] = useState({
    enabled: block_data_usage.enabled,
    block_until: toDateOrUndefined(block_data_usage.block_until),
    scope: block_data_usage.scope ?? '',
  })
  const [statePending, startStateTransition] = useTransition()
  const [zonesPending, startZonesTransition] = useTransition()
  const [apnPending, startApnTransition] = useTransition()
  const [aorPending, startAorTransition] = useTransition()
  const [creditPending, startCreditTransition] = useTransition()
  const [blockPending, startBlockTransition] = useTransition()
  const [apnEditing, setApnEditing] = useState(false)
  const [aorEditing, setAorEditing] = useState(false)
  const [creditEditing, setCreditEditing] = useState(false)
  const [blockEditing, setBlockEditing] = useState(false)
  const [apnError, setApnError] = useState<string | null>(null)
  const [aorError, setAorError] = useState<string | null>(null)
  const [creditError, setCreditError] = useState<string | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [zonesError, setZonesError] = useState<string | null>(null)
  const [stateError, setStateError] = useState<string | null>(null)

  const handleStateSave = () => {
    setStateError(null)
    startStateTransition(async () => {
      try {
        await patchState(subscriber.iccid, { subscriber_state: stateValue })
        setStateEditing(false)
        router.refresh()
        toast.success('Subscriber state updated')
      } catch (err) {
        const message = (err as Error).message || 'Could not save state'
        setStateError(message)
        toast.error(message)
      }
    })
  }

  const handleZonesSave = () => {
    setZonesError(null)
    startZonesTransition(async () => {
      try {
        await patchNetworkAccess(subscriber.iccid, zones)
        setZonesEditing(false)
        router.refresh()
        toast.success('Network access list updated')
      } catch (err) {
        const message = (err as Error).message || 'Could not save zones'
        setZonesError(message)
        toast.error(message)
      }
    })
  }

  const handleApnSave = () => {
    setApnError(null)
    startApnTransition(async () => {
      const speedUp = parseSpeed(apnForm.speed_up)
      const speedDown = parseSpeed(apnForm.speed_down)
      if (typeof speedUp === 'string' && speedUp !== 'max') {
        setApnError('Speed up must be a number or "max"')
        return
      }
      if (typeof speedDown === 'string' && speedDown !== 'max') {
        setApnError('Speed down must be a number or "max"')
        return
      }
      try {
        await patchApn(subscriber.iccid, {
          name: apnForm.name,
          speed_up: speedUp as any,
          speed_down: speedDown as any,
        })
        setApnEditing(false)
        router.refresh()
        toast.success('APN settings updated')
      } catch (err) {
        const message = (err as Error).message || 'Could not save APN'
        setApnError(message)
        toast.error(message)
      }
    })
  }

  const handleAorSave = () => {
    setAorError(null)
    startAorTransition(async () => {
      try {
        const domainId = Number(aorForm.domain_id)
        if (!Number.isFinite(domainId)) {
          setAorError('Domain ID must be a number')
          toast.error('Domain ID must be a number')
          return
        }
        await patchAor(subscriber.iccid, {
          domain_id: domainId,
          auth_username: aorForm.auth_username,
          auth_password: aorForm.auth_password,
        })
        setAorEditing(false)
        setShowAorPassword(false)
        router.refresh()
        toast.success('AOR settings updated')
      } catch (err) {
        const message = (err as Error).message || 'Could not save AOR'
        setAorError(message)
        toast.error(message)
      }
    })
  }

  const handleCreditSave = () => {
    setCreditError(null)
    startCreditTransition(async () => {
      try {
        const maxCredit = Number(creditForm.max_credit)
        if (!Number.isFinite(maxCredit)) {
          setCreditError('Max credit must be a number')
          toast.error('Max credit must be a number')
          return
        }
        await patchCredit(subscriber.iccid, {
          max_credit: maxCredit,
        })
        setCreditEditing(false)
        router.refresh()
        toast.success('Credit limit updated')
      } catch (err) {
        const message = (err as Error).message || 'Could not save credit'
        setCreditError(message)
        toast.error(message)
      }
    })
  }

  const handleBlockSave = () => {
    setBlockError(null)
    startBlockTransition(async () => {
      try {
        if (blockForm.enabled) {
          if (blockForm.scope && !['outside_eu_regulation', 'all'].includes(blockForm.scope)) {
            setBlockError('Scope must be outside_eu_regulation or all')
            toast.error('Invalid scope')
            return
          }
        }
        await patchBlockDataUsage(subscriber.iccid, {
          enabled: blockForm.enabled,
          block_until: blockForm.enabled && blockForm.block_until ? toRFC3339(blockForm.block_until) : null,
          scope: blockForm.enabled && blockForm.scope ? (blockForm.scope as 'outside_eu_regulation' | 'all') : null,
        })
        setBlockEditing(false)
        router.refresh()
        toast.success('Data block settings updated')
      } catch (err) {
        const message = (err as Error).message || 'Could not save block settings'
        setBlockError(message)
        toast.error(message)
      }
    })
  }

  const resetState = () => {
    setStateValue(subscriber.subscriber_state)
    setStateEditing(false)
    setStateError(null)
  }

  const resetApn = () => {
    setApnForm({
      name: apn?.name ?? '',
      speed_up: apn?.speed_up?.toString() ?? '',
      speed_down: apn?.speed_down?.toString() ?? '',
    })
    setApnPreset(getSpeedPresetKey(apn?.speed_down, apn?.speed_up))
    setApnEditing(false)
    setApnError(null)
  }

  const resetAor = () => {
    setAorForm({
      domain_id: String(aor.domain_id ?? ''),
      auth_username: aor.auth_username ?? '',
      auth_password: aor.auth_password ?? '',
    })
    setAorEditing(false)
    setAorError(null)
    setShowAorPassword(false)
  }

  const resetCredit = () => {
    setCreditForm({ max_credit: credit.max_credit.toFixed(2) })
    setCreditEditing(false)
    setCreditError(null)
  }

  const resetZones = () => {
    setZones(network_access_list)
    setZonesEditing(false)
    setZonesError(null)
  }

  const resetBlock = () => {
    setBlockForm({
      enabled: block_data_usage.enabled,
      block_until: toDateOrUndefined(block_data_usage.block_until),
      scope: block_data_usage.scope ?? '',
    })
    setBlockEditing(false)
    setBlockError(null)
  }

  const zoneEntries = Object.entries(zones)

  const stateChanged = stateValue !== subscriber.subscriber_state
  const apnChanged =
    normalizeSpeed(apnForm.speed_up) !== normalizeSpeed(apn?.speed_up?.toString() ?? '') ||
    normalizeSpeed(apnForm.speed_down) !== normalizeSpeed(apn?.speed_down?.toString() ?? '') ||
    apnForm.name !== (apn?.name ?? '')
  const aorChanged =
    aorForm.domain_id !== String(aor.domain_id ?? '') ||
    aorForm.auth_username !== (aor.auth_username ?? '') ||
    aorForm.auth_password !== (aor.auth_password ?? '')
  const creditChanged = Number(creditForm.max_credit) !== Number(credit.max_credit)
  const zonesChanged = Object.keys(zones).some(
    (key) => zones[key as keyof NetworkAccessList] !== network_access_list[key as keyof NetworkAccessList]
  )
  const blockChanged =
    blockForm.enabled !== block_data_usage.enabled ||
    (blockForm.scope || '') !== (block_data_usage.scope ?? '') ||
    !sameDate(blockForm.block_until, toDateOrUndefined(block_data_usage.block_until))

  return (
    <Accordion type="multiple" defaultValue={['basic', 'aor', 'apn', 'contract', 'credit', 'zones']} className="space-y-4">
      <AccordionItem value="basic" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
        <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">
          Basic Subscriber Info
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SectionField label="ICCID" value={subscriber.iccid} mono />
            <SectionField label="MSISDN" value={subscriber.msisdn} mono />
            <SectionField label="IMSI" value={subscriber.imsi} mono />
            <SectionField label="Customer ID" value={subscriber.cust_id} />
            <SectionField label="Admin Info" value={subscriber.admin_info} />
            <div className="grid gap-3 rounded-lg border border-border/60 bg-white/60 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:bg-slate-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                State
              </p>
              {!stateEditing ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={subscriber.subscriber_state ? 'success' : 'muted'}>
                    {subscriber.subscriber_state ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setStateEditing(true)}>
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    checked={stateValue}
                    onCheckedChange={(v) => setStateValue(v)}
                    disabled={statePending}
                  />
                  <Badge variant={stateValue ? 'success' : 'muted'}>
                    {stateValue ? 'Active' : 'Inactive'}
                  </Badge>
                  {stateChanged && <Badge variant="warning">Changed</Badge>}
                  <Button
                    size="sm"
                    onClick={handleStateSave}
                    disabled={statePending || !stateChanged}
                  >
                    {statePending ? 'Saving...' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetState} disabled={statePending}>
                    Cancel
                  </Button>
                </div>
              )}
              {stateError && (
                <Alert variant="destructive">
                  <AlertTitle>State update failed</AlertTitle>
                  <AlertDescription>{stateError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          <Separator />
          <div className="grid gap-3 rounded-lg border border-border/60 bg-white/60 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Data Block
              </p>
              {!blockEditing && (
                <Button size="sm" variant="outline" onClick={() => setBlockEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
            {!blockEditing ? (
              <SectionField
                label="Status"
                value={block_data_usage.enabled ? 'Enabled' : 'Disabled'}
                badgeVariant={block_data_usage.enabled ? 'warning' : 'muted'}
                hint={
                  block_data_usage.enabled
                    ? `Scope: ${block_data_usage.scope ?? '—'}, Until: ${formatDate(block_data_usage.block_until)}`
                    : undefined
                }
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={blockForm.enabled}
                    onCheckedChange={(v) => setBlockForm((p) => ({ ...p, enabled: v }))}
                    disabled={blockPending}
                  />
                  <Badge variant={blockForm.enabled ? 'warning' : 'muted'}>
                    {blockForm.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scope</label>
                  <Select
                    value={blockForm.scope || 'none'}
                    onValueChange={(value) =>
                      setBlockForm((p) => ({ ...p, scope: value === 'none' ? '' : value }))
                    }
                    disabled={blockPending || !blockForm.enabled}
                  >
                    <SelectTrigger
                      className={
                        (blockForm.scope || '') !== (block_data_usage.scope ?? '')
                          ? 'border-amber-300 ring-1 ring-amber-200'
                          : undefined
                      }
                    >
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No scope</SelectItem>
                      <SelectItem value="outside_eu_regulation">Outside EU regulation</SelectItem>
                      <SelectItem value="all">All data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Block until</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !sameDate(blockForm.block_until, toDateOrUndefined(block_data_usage.block_until))
                            ? 'border-amber-300 ring-1 ring-amber-200'
                            : ''
                        }`}
                        disabled={blockPending || !blockForm.enabled}
                      >
                        {blockForm.block_until
                          ? blockForm.block_until.toLocaleString()
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={blockForm.block_until}
                        onSelect={(date) => setBlockForm((p) => ({ ...p, block_until: date ?? undefined }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={formatTime(blockForm.block_until)}
                    onChange={(e) =>
                      setBlockForm((p) => ({
                        ...p,
                        block_until: p.block_until
                          ? setTimeOnDate(p.block_until, e.target.value)
                          : undefined,
                      }))
                    }
                    className={
                      !sameDate(blockForm.block_until, toDateOrUndefined(block_data_usage.block_until))
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : undefined
                    }
                    disabled={!blockForm.block_until || blockPending || !blockForm.enabled}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBlockForm((p) => ({ ...p, block_until: undefined }))}
                      disabled={blockPending || !blockForm.enabled}
                    >
                      Clear date
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleBlockSave} disabled={blockPending || !blockChanged}>
                    {blockPending ? 'Saving...' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetBlock} disabled={blockPending}>
                    Cancel
                  </Button>
                  {blockChanged && <Badge variant="warning">Changed</Badge>}
                </div>
              </div>
            )}
          </div>
          {blockError && (
            <Alert variant="destructive">
              <AlertTitle>Block update failed</AlertTitle>
              <AlertDescription>{blockError}</AlertDescription>
            </Alert>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="aor" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
        <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">
          AOR Info
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
          {!aorEditing ? (
            <div className="grid gap-3 md:grid-cols-2">
              <SectionField label="Domain ID" value={aor.domain_id} />
              <SectionField label="Auth Username" value={aor.auth_username} mono />
              <SectionField label="Auth Password" value={aor.auth_password.replace(/./g, '•')} mono />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain ID</label>
                <Input
                  value={aorForm.domain_id}
                  onChange={(e) => setAorForm((p) => ({ ...p, domain_id: e.target.value }))}
                  placeholder="84"
                  className={
                    aorForm.domain_id !== String(aor.domain_id ?? '')
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : undefined
                  }
                />
                <p className="text-xs text-muted-foreground">Range: 1–99999</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Auth Username</label>
                <Input
                  value={aorForm.auth_username}
                  onChange={(e) => setAorForm((p) => ({ ...p, auth_username: e.target.value }))}
                  placeholder="+316..."
                  className={
                    aorForm.auth_username !== (aor.auth_username ?? '')
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : undefined
                  }
                />
                <p className="text-xs text-muted-foreground">4–16 chars, letters/numbers/+-.@*#</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Auth Password</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showAorPassword ? 'text' : 'password'}
                    value={aorForm.auth_password}
                    onChange={(e) => setAorForm((p) => ({ ...p, auth_password: e.target.value }))}
                    placeholder="••••••••"
                    className={
                      aorForm.auth_password !== (aor.auth_password ?? '')
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : undefined
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setShowAorPassword((v) => !v)}
                  >
                    {showAorPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">4–16 chars, letters/numbers/+-.@*#</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={aorEditing ? 'default' : 'outline'}
              onClick={() => (aorEditing ? resetAor() : setAorEditing(true))}
              disabled={aorPending}
            >
              {aorEditing ? 'Cancel' : 'Edit AOR'}
            </Button>
            {aorEditing && (
              <Button size="sm" onClick={handleAorSave} disabled={aorPending || !aorChanged}>
                {aorPending ? 'Saving...' : 'Confirm'}
              </Button>
            )}
            {aorEditing && aorChanged && <Badge variant="warning">Changed</Badge>}
          </div>
          {aorError && (
            <Alert variant="destructive">
              <AlertTitle>AOR update failed</AlertTitle>
              <AlertDescription>{aorError}</AlertDescription>
            </Alert>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="apn" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
        <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">
          GPRS / APN
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
          {!apnEditing ? (
            apn ? (
              <div className="grid gap-3 md:grid-cols-2">
                <SectionField label="APN Name" value={apn.name} />
                <SectionField label="Speed Up" value={`${apn.speed_up}`} />
                <SectionField label="Speed Down" value={`${apn.speed_down}`} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 p-4 text-sm text-muted-foreground">
                No APN configured for this subscriber.
              </div>
            )
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">APN Name</label>
                <Input
                  value={apnForm.name}
                  onChange={(e) => setApnForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="data.example.net"
                  className={
                    apnForm.name !== (apn?.name ?? '')
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : undefined
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Speed preset</label>
                <Select
                  value={apnPreset}
                  onValueChange={(value) => {
                    setApnPreset(value)
                    const preset = speedPresets.find((item) => item.key === value)
                    if (preset) {
                      setApnForm((prev) => ({
                        ...prev,
                        speed_down: preset.speed_down.toString(),
                        speed_up: preset.speed_up.toString(),
                      }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Custom" />
                  </SelectTrigger>
                  <SelectContent>
                    {speedPresets.map((preset) => (
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Legacy edit used these presets.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Speed Up (kbps or max)</label>
                <Input
                  value={apnForm.speed_up}
                  onChange={(e) => {
                    setApnForm((p) => ({ ...p, speed_up: e.target.value }))
                    setApnPreset('custom')
                  }}
                  placeholder="max"
                  list="apn-speed-options"
                  className={
                    normalizeSpeed(apnForm.speed_up) !== normalizeSpeed(apn?.speed_up?.toString() ?? '')
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : undefined
                  }
                  disabled={apnPreset !== 'custom'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Speed Down (kbps or max)</label>
                <Input
                  value={apnForm.speed_down}
                  onChange={(e) => {
                    setApnForm((p) => ({ ...p, speed_down: e.target.value }))
                    setApnPreset('custom')
                  }}
                  placeholder="2048"
                  list="apn-speed-options"
                  className={
                    normalizeSpeed(apnForm.speed_down) !== normalizeSpeed(apn?.speed_down?.toString() ?? '')
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : undefined
                  }
                  disabled={apnPreset !== 'custom'}
                />
              </div>
            </div>
          )}
          <datalist id="apn-speed-options">
            <option value="512" />
            <option value="1024" />
            <option value="2048" />
            <option value="8192" />
            <option value="max" />
          </datalist>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={apnEditing ? 'default' : 'outline'}
              onClick={() => (apnEditing ? resetApn() : setApnEditing(true))}
              disabled={apnPending}
            >
              {apnEditing ? 'Cancel' : apn ? 'Edit APN' : 'Add APN'}
            </Button>
            {apnEditing && (
              <Button size="sm" onClick={handleApnSave} disabled={apnPending || !apnChanged}>
                {apnPending ? 'Saving...' : 'Confirm'}
              </Button>
            )}
            {apnEditing && apnChanged && <Badge variant="warning">Changed</Badge>}
          </div>
          {apnError && (
            <Alert variant="destructive">
              <AlertTitle>APN update failed</AlertTitle>
              <AlertDescription>{apnError}</AlertDescription>
            </Alert>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="contract" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
        <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">
          Contract Info
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-1 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Legacy plan</label>
              <Select disabled value={getContractPlanKey(contract.service_package, contract.service_profile, contract.duration)}>
                <SelectTrigger>
                  <SelectValue placeholder="Custom" />
                </SelectTrigger>
                <SelectContent>
                  {contractPlans.map((plan) => (
                    <SelectItem key={plan.key} value={plan.key}>
                      {plan.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
          <p className="text-xs text-muted-foreground">
            Presets based on standard settings.
          </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{getContractPlanLabel(contract.service_package, contract.service_profile, contract.duration)}</Badge>
              <Badge variant="muted">Read-only</Badge>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SectionField label="Service Package" value={contract.service_package} />
            <SectionField label="Service Profile" value={contract.service_profile} />
            <SectionField label="Contract Start" value={formatDate(contract.contract_start)} />
            <SectionField label="Duration (months)" value={contract.duration} />
          </div>
          <p className="text-xs text-muted-foreground">
            Contract plans map to standard presets used during subscriber creation.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="credit" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
        <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">
          Credit Info
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
          {!creditEditing ? (
            <div className="grid gap-3 md:grid-cols-2">
              <SectionField label="Max Credit" value={`€ ${credit.max_credit.toFixed(2)}`} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Credit (€)</label>
                <Input
                  value={creditForm.max_credit}
                  onChange={(e) => setCreditForm({ max_credit: e.target.value })}
                  placeholder="50.00"
                  className={
                    Number(creditForm.max_credit) !== Number(credit.max_credit)
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : undefined
                  }
                />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={creditEditing ? 'default' : 'outline'}
              onClick={() => (creditEditing ? resetCredit() : setCreditEditing(true))}
              disabled={creditPending}
            >
              {creditEditing ? 'Cancel' : 'Edit Credit'}
            </Button>
            {creditEditing && (
              <Button size="sm" onClick={handleCreditSave} disabled={creditPending || !creditChanged}>
                {creditPending ? 'Saving...' : 'Confirm'}
              </Button>
            )}
            {creditEditing && creditChanged && <Badge variant="warning">Changed</Badge>}
          </div>
          {creditError && (
            <Alert variant="destructive">
              <AlertTitle>Credit update failed</AlertTitle>
              <AlertDescription>{creditError}</AlertDescription>
            </Alert>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="zones" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
        <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">
          Network Access List
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {zoneEntries.map(([key]) => {
              const label = key === 'zoneNL' ? 'Zone NL' : key.toUpperCase()
              const allowed = zones[key as keyof NetworkAccessList]
              return zonesEditing ? (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-white/60 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:bg-slate-900/50"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {allowed ? 'Allowed' : 'Blocked'}
                    </p>
                  </div>
                  <Switch
                    checked={allowed}
                    onCheckedChange={(v) =>
                      setZones((prev) => ({ ...prev, [key]: v } as NetworkAccessList))
                    }
                    disabled={zonesPending}
                  />
                </div>
              ) : (
                <SectionField
                  key={key}
                  label={label}
                  value={allowed ? 'Allowed' : 'Blocked'}
                  badgeVariant={allowed ? 'success' : 'muted'}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={zonesEditing ? 'default' : 'outline'}
              onClick={() => (zonesEditing ? resetZones() : setZonesEditing(true))}
              disabled={zonesPending}
            >
              {zonesEditing ? 'Cancel' : 'Edit zones'}
            </Button>
            {zonesEditing && (
              <Button size="sm" onClick={handleZonesSave} disabled={zonesPending || !zonesChanged}>
                {zonesPending ? 'Saving...' : 'Confirm'}
              </Button>
            )}
            {zonesEditing && zonesChanged && <Badge variant="warning">Changed</Badge>}
          </div>
          {zonesError && (
            <Alert variant="destructive">
              <AlertTitle>Zone update failed</AlertTitle>
              <AlertDescription>{zonesError}</AlertDescription>
            </Alert>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
