import { cookies } from "next/headers"
import type { AuditLogResponse } from "@/types/audit"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface AuditQuery {
  skip?: number
  limit?: number
  operation?: string
  resource_type?: string
  status?: string
  resource_id?: string
  from_date?: string
  to_date?: string
  sort_order?: "asc" | "desc"
}

export async function getAuditLogs(query: AuditQuery): Promise<AuditLogResponse> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value
  if (!accessToken) {
    throw new Error("Unauthorized")
  }

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value))
    }
  })

  const res = await fetch(`${API_URL}/api/v1/audit?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => undefined)
    const message =
      (detail as any)?.msg ||
      (detail as any)?.detail?.reason ||
      (detail as any)?.detail?.message ||
      (detail as any)?.detail ||
      res.statusText
    throw new Error(message || "Failed to fetch audit logs")
  }

  return (await res.json()) as AuditLogResponse
}
