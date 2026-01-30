"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface AuditFilterDefaults {
  resource_id?: string
  status?: string
  operation?: string
  from_date?: string
  to_date?: string
  resource_type?: string
  sort_order?: string
}

const operations = [
  "CREATE",
  "READ",
  "UPDATE_AOR",
  "UPDATE_STATE",
  "UPDATE_APN",
  "UPDATE_NETWORK_ACCESS_LIST",
  "UPDATE_CREDIT",
  "UPDATE_BLOCK_DATA_USAGE",
  "DELETE",
]

export function AuditFilters({ defaults }: { defaults: AuditFilterDefaults }) {
  const [status, setStatus] = useState(defaults.status ?? "all")
  const [operation, setOperation] = useState(defaults.operation ?? "all")
  const [sortOrder, setSortOrder] = useState(defaults.sort_order ?? "desc")
  const [fromDate, setFromDate] = useState<Date | undefined>(
    defaults.from_date ? new Date(defaults.from_date) : undefined
  )
  const [toDate, setToDate] = useState<Date | undefined>(
    defaults.to_date ? new Date(defaults.to_date) : undefined
  )
  const [fromTime, setFromTime] = useState(
    defaults.from_date ? formatTime(new Date(defaults.from_date)) : ""
  )
  const [toTime, setToTime] = useState(
    defaults.to_date ? formatTime(new Date(defaults.to_date)) : ""
  )

  const fromISO = fromDate ? applyTime(fromDate, fromTime).toISOString() : ""
  const toISO = toDate ? applyTime(toDate, toTime).toISOString() : ""

  return (
    <form className="grid grid-cols-1 gap-3 md:grid-cols-12" method="get">
      <div className="md:col-span-5">
        <label className="text-xs font-medium text-muted-foreground">Resource ID</label>
        <Input name="resource_id" defaultValue={defaults.resource_id ?? ""} placeholder="ICCID or request id" />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="status" value={status} />
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-medium text-muted-foreground">Operation</label>
        <Select value={operation} onValueChange={setOperation}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {operations.map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="operation" value={operation} />
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <div className="flex flex-col gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                {fromDate ? fromDate.toLocaleDateString() : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={fromTime}
            onChange={(e) => setFromTime(e.target.value)}
            disabled={!fromDate}
          />
          <input type="hidden" name="from_date" value={fromISO} />
        </div>
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <div className="flex flex-col gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                {toDate ? toDate.toLocaleDateString() : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={toTime}
            onChange={(e) => setToTime(e.target.value)}
            disabled={!toDate}
          />
          <input type="hidden" name="to_date" value={toISO} />
        </div>
      </div>
      <div className="md:col-span-4">
        <label className="text-xs font-medium text-muted-foreground">Resource type</label>
        <Input name="resource_type" defaultValue={defaults.resource_type ?? ""} placeholder="subscriber" />
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-medium text-muted-foreground">Sort order</label>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="sort_order" value={sortOrder} />
      </div>
      <div className="flex items-end justify-end gap-2 md:col-span-5">
        <Button type="submit">Apply filters</Button>
        <Button asChild variant="outline">
          <Link href="/audit">Reset</Link>
        </Button>
      </div>
    </form>
  )
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

function applyTime(date: Date, timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map((value) => Number(value))
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
