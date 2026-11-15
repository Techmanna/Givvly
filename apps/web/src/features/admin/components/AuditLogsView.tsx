"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type AuditLogItem = {
  id: string;
  actorId: string | null;
  actor: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
  action: string;
  targetType: string;
  targetId: string;
  ip: string | null;
  userAgent: string | null;
  message: string;
  redirectPath: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  durationMs: number | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
};

type AuditLogsResponse = {
  items: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    authenticatedCount: number;
    guestCount: number;
  };
};

export function AuditLogsView() {
  const [search, setSearch] = useState("");
  const [authState, setAuthState] = useState<"ALL" | "AUTHENTICATED" | "GUEST">(
    "ALL"
  );
  const [targetType, setTargetType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "audit-logs", { search, authState, targetType, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (authState !== "ALL") qs.set("authState", authState);
      if (targetType !== "ALL") qs.set("targetType", targetType);
      qs.set("page", String(page));
      qs.set("limit", "25");
      return api<AuditLogsResponse>(`/admin/audit-logs?${qs.toString()}`);
    },
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Audit Events
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {meta?.total ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Authenticated Users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {meta?.authenticatedCount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Guest / Unauthenticated
            </CardTitle>
            <UserX className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {meta?.guestCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search action, target ID, IP, or actor ID..."
              className="pl-9"
            />
          </div>

          <Select
            value={authState}
            onValueChange={(v) => {
              setAuthState(v as "ALL" | "AUTHENTICATED" | "GUEST");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Actor state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actors</SelectItem>
              <SelectItem value="AUTHENTICATED">Authenticated</SelectItem>
              <SelectItem value="GUEST">Guest / Unauth</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={targetType}
            onValueChange={(v) => {
              setTargetType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All targets</SelectItem>
              <SelectItem value="AUTH">Auth</SelectItem>
              <SelectItem value="EVENT">Events</SelectItem>
              <SelectItem value="ORDER">Orders</SelectItem>
              <SelectItem value="PAYMENT">Payments</SelectItem>
              <SelectItem value="PAYOUT">Payouts</SelectItem>
              <SelectItem value="USERS">Users</SelectItem>
              <SelectItem value="PRODUCTS">Products</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Audit Feed */}
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No audit log entries match the current filters.
            </div>
          ) : (
            items.map((item) => {
              const isExpanded = expandedId === item.id;
              const isError = (item.statusCode ?? 200) >= 400;

              return (
                <div key={item.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={item.isAuthenticated ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {item.actor
                            ? `${item.actor.name || item.actor.email} (${item.actor.role})`
                            : item.isAuthenticated
                              ? `User ${item.actorId?.slice(0, 8)}`
                              : "Guest"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {item.targetType}
                        </Badge>
                        {item.statusCode ? (
                          <Badge
                            variant={isError ? "destructive" : "success"}
                            className="text-[10px]"
                          >
                            {item.method} {item.statusCode}
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-foreground">
                        {item.message}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Action: <code className="text-[11px]">{item.action}</code>
                        {" · "}Target:{" "}
                        <code className="text-[11px]">{item.targetId}</code>
                        {item.ip ? ` · IP: ${item.ip}` : ""}
                        {item.durationMs != null ? ` · ${item.durationMs}ms` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {item.redirectPath ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={item.redirectPath}>
                            <span>Open</span>
                            <ExternalLink
                              className="ml-1.5 h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        aria-label="Toggle audit details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
                      {JSON.stringify(
                        {
                          id: item.id,
                          actorId: item.actorId,
                          actor: item.actor,
                          ip: item.ip,
                          userAgent: item.userAgent,
                          path: item.path,
                          diff: item.diff,
                        },
                        null,
                        2
                      )}
                    </pre>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} events)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
