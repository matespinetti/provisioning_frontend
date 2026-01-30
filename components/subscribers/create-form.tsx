"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createSubscriberSchema } from "@/lib/validation/subscriber-create"
import { createSubscriber } from "@/services/subscribers-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

type CreateFormValues = z.infer<typeof createSubscriberSchema>

const speedPresets = [
  { key: "256", label: "256/64", speed_down: 256, speed_up: 64 },
  { key: "4096", label: "4096/1024", speed_down: 4096, speed_up: 1024 },
  { key: "8192", label: "8192/2048", speed_down: 8192, speed_up: 2048 },
  { key: "max", label: "max/max", speed_down: "max", speed_up: "max" },
]

const contractPlans = [
  { key: "c0", label: "Number Parking Service", service_package: 1200000, service_profile: 0, duration: 0 },
  { key: "c1", label: "Pay As You Go + usage data tier", service_package: 1200201, service_profile: 7, duration: 0 },
  { key: "c2", label: "M2M Data + SMS Only", service_package: 1200400, service_profile: 3, duration: 1 },
  { key: "c3", label: "ConnectivityBackup small 50GB", service_package: 1200600, service_profile: 1, duration: 12 },
  { key: "c4", label: "ConnectivityBackup medium 100GB", service_package: 1200601, service_profile: 1, duration: 12 },
  { key: "c5", label: "ConnectivityBackup large 200GB", service_package: 1200602, service_profile: 1, duration: 12 },
]

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@*#.-"
  let result = ""
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export function CreateSubscriberForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [speedPreset, setSpeedPreset] = useState("8192")
  const [contractPlan, setContractPlan] = useState("c1")
  const [lastCreated, setLastCreated] = useState<string | null>(null)

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSubscriberSchema),
    defaultValues: {
      iccid: "",
      msisdn: "",
      cust_id: "9238485",
      admin_info: "Sona Business BV",
      subscriber_state: true,
      aor: {
        domain_id: 84,
        auth_username: "",
        auth_password: generatePassword(),
      },
      apn_enabled: true,
      apn: {
        name: "web.ezimobile.nl",
        speed_up: 2048,
        speed_down: 8192,
      },
      network_access_list: {
        zoneNL: true,
        zone1: true,
        zone2: true,
        zone3: true,
        zone4: true,
        zone5: true,
      },
      contract: {
        service_package: 1200201,
        service_profile: 7,
        duration: 0,
      },
      credit: {
        max_credit: 50,
      },
    },
    mode: "onChange",
  })

  const errors = form.formState.errors
  const values = form.watch()

  useEffect(() => {
    const plan = contractPlans.find((item) => item.key === contractPlan)
    if (plan) {
      form.setValue("contract", {
        service_package: plan.service_package,
        service_profile: plan.service_profile,
        duration: plan.duration,
      })
      if (plan.service_profile === 0) {
        form.setValue("apn_enabled", false)
      }
    }
  }, [contractPlan, form])

  useEffect(() => {
    const preset = speedPresets.find((item) => item.key === speedPreset)
    if (preset) {
      form.setValue("apn.speed_down", preset.speed_down as any)
      form.setValue("apn.speed_up", preset.speed_up as any)
    }
  }, [speedPreset, form])

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "msisdn" && value.msisdn) {
        const current = form.getValues("aor.auth_username")
        if (!current) {
          form.setValue("aor.auth_username", `+${value.msisdn}`)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const selectedPlan = useMemo(
    () => contractPlans.find((item) => item.key === contractPlan),
    [contractPlan]
  )

  const onSubmit = (values: CreateFormValues) => {
    setLastCreated(null)
    startTransition(async () => {
      try {
        await createSubscriber(values)
        setLastCreated(values.iccid)
        toast.success(`Subscriber created: ${values.iccid}`)
        form.reset({ ...values, iccid: "", msisdn: "" })
        setSpeedPreset("8192")
        setContractPlan("c1")
      } catch (err) {
        const message = (err as Error).message || "Failed to create subscriber"
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create subscriber</CardTitle>
          <CardDescription>
            Fill in the subscriber profile. Defaults are prefilled.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">ICCID</label>
            <Input {...form.register("iccid")} placeholder="8931XXXXXXXXXXXXXXXX" />
            {errors.iccid && <p className="text-xs text-destructive">{errors.iccid.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">MSISDN</label>
            <Input {...form.register("msisdn")} placeholder="316XXXXXXXX or 31970XXXXXXXX" />
            {errors.msisdn && <p className="text-xs text-destructive">{errors.msisdn.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer ID</label>
            <Input {...form.register("cust_id")} placeholder="9xxxxxx" />
            {errors.cust_id && <p className="text-xs text-destructive">{errors.cust_id.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin info</label>
            <Textarea {...form.register("admin_info")} placeholder="Short note about the subscriber" />
            {errors.admin_info && <p className="text-xs text-destructive">{errors.admin_info.message}</p>}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-white/60 p-3 dark:bg-slate-900/50">
            <Switch checked={values.subscriber_state} onCheckedChange={(v) => form.setValue("subscriber_state", v)} />
            <div>
              <p className="text-sm font-medium">Subscriber active</p>
              <p className="text-xs text-muted-foreground">Enable services immediately</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["aor", "apn", "contract", "credit", "zones"]} className="space-y-4">
        <AccordionItem value="aor" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
          <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">AOR Info</AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-1 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain ID</label>
            <Input
              value={values.aor?.domain_id?.toString() ?? ""}
              onChange={(e) => form.setValue("aor.domain_id", Number(e.target.value))}
              placeholder="84"
            />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Auth Username</label>
              <Input {...form.register("aor.auth_username")} placeholder="+316..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Auth Password</label>
              <div className="flex gap-2">
                <Input {...form.register("aor.auth_password")} />
                <Button type="button" variant="outline" onClick={() => form.setValue("aor.auth_password", generatePassword())}>
                  Generate
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="apn" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
          <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">GPRS / APN</AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={values.apn_enabled} onCheckedChange={(v) => form.setValue("apn_enabled", v)} />
              <div>
                <p className="text-sm font-medium">Enable APN</p>
                <p className="text-xs text-muted-foreground">Disable if no data service</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Speed preset</label>
                <Select value={speedPreset} onValueChange={setSpeedPreset} disabled={!values.apn_enabled}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {speedPresets.map((preset) => (
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Speed presets</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">APN name</label>
                <Input
                  {...form.register("apn.name")}
                  disabled={!values.apn_enabled}
                  placeholder="web.ezimobile.nl"
                />
              </div>
              <div className="rounded-lg border border-border/70 bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Speed down</p>
                <p className="font-semibold">{values.apn?.speed_down?.toString()}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Speed up</p>
                <p className="font-semibold">{values.apn?.speed_up?.toString()}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="contract" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
          <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">Contract Info</AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {contractPlans.map((plan) => (
                <button
                  type="button"
                  key={plan.key}
                  onClick={() => setContractPlan(plan.key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    contractPlan === plan.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-white/60 text-foreground hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-semibold">{plan.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Package {plan.service_package} • Profile {plan.service_profile} • {plan.duration} months
                  </p>
                </button>
              ))}
            </div>
            {selectedPlan && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Package {selectedPlan.service_package}</Badge>
                <Badge variant="secondary">Profile {selectedPlan.service_profile}</Badge>
                <Badge variant="secondary">Duration {selectedPlan.duration} mo</Badge>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="credit" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
          <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">Credit Info</AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-1 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max credit (€)</label>
              <Input
                value={values.credit?.max_credit?.toString() ?? ""}
                onChange={(e) => form.setValue("credit.max_credit", Number(e.target.value))}
                placeholder="50.00"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="zones" className="rounded-2xl border bg-white/80 shadow-sm dark:bg-slate-900/70">
          <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold">Network Access List</AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-1 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(["zoneNL", "zone1", "zone2", "zone3", "zone4", "zone5"] as const).map((zone) => (
                <label
                  key={zone}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-white/60 p-3 dark:bg-slate-900/50"
                >
                  <span className="text-sm font-medium">{zone.toUpperCase()}</span>
                  <Checkbox
                    checked={values.network_access_list?.[zone]}
                    onCheckedChange={(checked) => form.setValue(`network_access_list.${zone}`, Boolean(checked))}
                  />
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="text-sm text-muted-foreground">
            Review contract and APN presets before creating.
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create subscriber"}
            </Button>
            {lastCreated && (
              <Button type="button" variant="outline" onClick={() => router.push(`/subscribers/${lastCreated}`)}>
                View subscriber
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Please fix the highlighted fields before submitting.
        </div>
      )}
      <Separator />
    </form>
  )
}
