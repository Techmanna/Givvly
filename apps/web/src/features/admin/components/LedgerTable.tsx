"use client";

import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/Money";
import { formatDate } from "@/lib/format";
import { DataTable, type DataTableColumn } from "./DataTable";
import type { LedgerEntry } from "../types";

export type LedgerTableProps = {
  entries: LedgerEntry[];
};

const COLUMNS: DataTableColumn<LedgerEntry>[] = [
  {
    header: "Type",
    render: (row) => (
      <Badge
        variant={
          row.type === "CREDIT"
            ? "success"
            : row.type === "PAYOUT"
              ? "secondary"
              : "outline"
        }
      >
        {row.type}
      </Badge>
    ),
  },
  {
    header: "Description",
    render: (row) => (
      <div>
        <p className="font-medium text-ink">{row.description}</p>
        <p className="font-mono text-xs text-ink-muted">{row.reference}</p>
      </div>
    ),
  },
  {
    header: "Date (WAT)",
    render: (row) => (
      <span className="text-xs text-ink-muted">
        {formatDate(row.createdAt, "d MMM yyyy, h:mm a")}
      </span>
    ),
  },
  {
    header: "Amount",
    className: "text-right",
    render: (row) => (
      <Money
        amountKobo={row.amountKobo}
        className={
          row.type === "CREDIT"
            ? "font-semibold text-success"
            : "font-semibold text-ink"
        }
      />
    ),
  },
];

export function LedgerTable({ entries }: LedgerTableProps) {
  return (
    <DataTable
      data={entries}
      columns={COLUMNS}
      getRowKey={(row) => row.id}
      searchPlaceholder="Search by reference or description..."
      filterFn={(row, q) =>
        row.description.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
      }
      emptyMessage="No ledger entries recorded."
    />
  );
}
