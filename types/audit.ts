export type AuditStatus = "success" | "failed"

export interface AuditLogEntry {
  id: string
  user_id: string
  username: string
  operation: string
  resource_type: string
  resource_id: string | null
  status: AuditStatus
  request_body: Record<string, unknown> | null
  response_status: string | null
  error_message: string | null
  created_at: string
}

export interface AuditLogResponse {
  success: boolean
  data: AuditLogEntry[]
  total: number
  skip: number
  limit: number
}
