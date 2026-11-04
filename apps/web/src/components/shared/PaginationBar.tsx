"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemName?: string;
  className?: string;
};

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemName = "results",
  className,
}: PaginationBarProps) {
  // If there's 1 or 0 pages and items are under page size, don't show full navigation
  if (totalPages <= 1) {
    if (totalItems !== undefined && totalItems > 0) {
      return (
        <div
          className={cn(
            "flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground",
            className
          )}
        >
          <span>
            Showing all <strong className="text-foreground">{totalItems}</strong> {itemName}
          </span>
        </div>
      );
    }
    return null;
  }

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "ellipsis",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  const startItem =
    pageSize && totalItems
      ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
      : undefined;
  const endItem =
    pageSize && totalItems
      ? Math.min(currentPage * pageSize, totalItems)
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-4 sm:flex-row",
        className
      )}
    >
      {/* Result counter summary */}
      <div className="text-xs text-muted-foreground">
        {startItem !== undefined && endItem !== undefined && totalItems !== undefined ? (
          <span>
            Showing <strong className="font-semibold text-foreground">{startItem}</strong>–
            <strong className="font-semibold text-foreground">{endItem}</strong> of{" "}
            <strong className="font-semibold text-foreground">{totalItems}</strong> {itemName}
          </span>
        ) : (
          <span>
            Page <strong className="font-semibold text-foreground">{currentPage}</strong> of{" "}
            <strong className="font-semibold text-foreground">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Navigation Buttons */}
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            />
          </PaginationItem>

          {/* Desktop page numbers */}
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            {pages.map((p, idx) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === currentPage}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
          </div>

          {/* Mobile compact indicator */}
          <span className="px-2 text-xs font-medium text-muted-foreground sm:hidden">
            {currentPage} / {totalPages}
          </span>

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

