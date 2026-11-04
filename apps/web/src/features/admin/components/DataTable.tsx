"use client";

import { useState, useMemo, type ReactNode } from "react";
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
import { PaginationBar } from "@/components/shared/PaginationBar";

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
  pageSize?: number;
  itemName?: string;
};

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  filterFn,
  searchPlaceholder = "Filter records...",
  emptyMessage = "No matching records found.",
  pageSize = 10,
  itemName = "records",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const trimmed = query.trim().toLowerCase();

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setPage(1);
  };

  const filtered = useMemo(() => {
    return trimmed && filterFn
      ? data.filter((row) => filterFn(row, trimmed))
      : data;
  }, [data, trimmed, filterFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="space-y-3">
      {filterFn && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
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

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        itemName={itemName}
      />
    </div>
  );
}


