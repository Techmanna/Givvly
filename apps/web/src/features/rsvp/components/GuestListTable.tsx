"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate } from "@/lib/format";
import {
  useEventRsvps,
  useExportRsvpsMutation,
} from "../hooks/useRsvp";
import type { RsvpResponse } from "../types";

export type GuestListTableProps = {
  eventId: string;
};

type FilterTab = "ALL" | RsvpResponse;

export function GuestListTable({ eventId }: GuestListTableProps) {
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const rsvpsQuery = useEventRsvps(eventId);
  const exportMutation = useExportRsvpsMutation(eventId);

  const handleExportCsv = async () => {
    try {
      const result = await exportMutation.mutateAsync();
      if (typeof window !== "undefined") {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success("Guest list exported to CSV.");
    } catch {
      toast.error("Could not export guest list. Please try again.");
    }
  };

  if (rsvpsQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (rsvpsQuery.isError) {
    return (
      <ErrorState
        title="Could not load guest list"
        description="Check your connection and try again."
        onRetry={() => rsvpsQuery.refetch()}
      />
    );
  }

  const allRsvps = rsvpsQuery.data ?? [];
  const yesList = allRsvps.filter((r) => r.response === "YES");
  const maybeList = allRsvps.filter((r) => r.response === "MAYBE");
  const noList = allRsvps.filter((r) => r.response === "NO");
  const plusOneCount = yesList.filter((r) => Boolean(r.plusOneName)).length;

  const filtered =
    filter === "ALL"
      ? allRsvps
      : allRsvps.filter((r) => r.response === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Guests and RSVPs
          </h2>
          <p className="text-sm text-muted-foreground">
            Track attendance and export your guest list for event seating.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exportMutation.isPending || allRsvps.length === 0}
          onClick={handleExportCsv}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>
            {exportMutation.isPending ? "Exporting..." : "Export CSV"}
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attending (Yes)</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {yesList.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Plus-ones</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {plusOneCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Maybe</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {maybeList.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Declined (No)</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {noList.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="ALL">All ({allRsvps.length})</TabsTrigger>
          <TabsTrigger value="YES">Yes ({yesList.length})</TabsTrigger>
          <TabsTrigger value="MAYBE">Maybe ({maybeList.length})</TabsTrigger>
          <TabsTrigger value="NO">No ({noList.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          title="No RSVPs in this view"
          description="Share your event link so guests can confirm their attendance."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Plus-one</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rsvp) => (
                  <TableRow key={rsvp.id}>
                    <TableCell className="font-medium text-foreground">
                      {rsvp.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rsvp.response === "YES"
                            ? "success"
                            : rsvp.response === "MAYBE"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {rsvp.response}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rsvp.plusOneName || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rsvp.email || rsvp.phone || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(rsvp.createdAt, "d MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

