"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  filterFn?: (row: T, query: string) => boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  filterFn,
  searchPlaceholder = "Filter records...",
  emptyMessage = "No matching records found.",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const filtered =
    trimmed && filterFn ? data.filter((row) => filterFn(row, trimmed)) : data;

  return (
    <div className="space-y-3">
      {filterFn && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-sm text-ink-muted"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((col, idx) => (
                    <TableCell key={idx} className={col.className}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

