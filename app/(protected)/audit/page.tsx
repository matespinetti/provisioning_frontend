import { Metadata } from "next"
import { getAuditLogs } from "@/services/audit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AuditFilters } from "@/components/audit/audit-filters"

export const metadata: Metadata = {
  title: "Audit Logs | Sona Provisioning",
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = {
    skip: Number(params.skip ?? 0) || 0,
    limit: 25,
    operation:
      typeof params.operation === "string" && params.operation !== "all"
        ? params.operation
        : undefined,
    resource_type: typeof params.resource_type === "string" ? params.resource_type : undefined,
    status:
      typeof params.status === "string" && params.status !== "all"
        ? params.status
        : undefined,
    resource_id: typeof params.resource_id === "string" ? params.resource_id : undefined,
    from_date: typeof params.from_date === "string" ? params.from_date : undefined,
    to_date: typeof params.to_date === "string" ? params.to_date : undefined,
    sort_order: typeof params.sort_order === "string" ? (params.sort_order as "asc" | "desc") : "desc",
  }

  const data = await getAuditLogs(query)

  const nextSkip = query.skip + query.limit
  const prevSkip = Math.max(query.skip - query.limit, 0)
  const lastPageSkip = Math.max((Math.ceil(data.total / query.limit) - 1) * query.limit, 0)
  const isFirstPage = query.skip === 0
  const isLastPage = query.skip >= lastPageSkip
  const totalPages = Math.max(Math.ceil(data.total / query.limit), 1)
  const currentPage = Math.min(Math.floor(query.skip / query.limit) + 1, totalPages)

  const buildParams = (overrides: Record<string, string>) => {
    const params = new URLSearchParams()
    const base = {
      ...query,
      status: query.status ?? "",
      operation: query.operation ?? "",
      resource_type: query.resource_type ?? "",
      resource_id: query.resource_id ?? "",
      from_date: query.from_date ?? "",
      to_date: query.to_date ?? "",
      sort_order: query.sort_order ?? "desc",
    }
    Object.entries({ ...base, ...overrides }).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value)
      }
    })
    return params.toString()
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-2xl">Audit logs</CardTitle>
          <CardDescription>Review recent provisioning activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditFilters
            defaults={{
              resource_id: query.resource_id ?? "",
              status: query.status ?? "all",
              operation: query.operation ?? "all",
              from_date: query.from_date ?? "",
              to_date: query.to_date ?? "",
              resource_type: query.resource_type ?? "",
              sort_order: query.sort_order ?? "desc",
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Showing {data.data.length} of {data.total} entries · Page {currentPage} of {totalPages}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Page {currentPage} of {totalPages}</Badge>
            <Button asChild variant="outline" disabled={isFirstPage}>
              <a href={`/audit?${buildParams({ skip: String(prevSkip) })}`}>Previous</a>
            </Button>
            <Button asChild variant="outline" disabled={isLastPage}>
              <a href={`/audit?${buildParams({ skip: String(nextSkip) })}`}>Next</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{entry.operation}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">{entry.resource_type}</div>
                      <div className="font-mono text-xs">{entry.resource_id ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.status === "success" ? "success" : "destructive"}>
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">{entry.username}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {entry.error_message ?? "—"}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No audit logs found for these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            Tip: filter by resource ID to track a specific subscriber through create/read/update/delete actions.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
