"use client";

import { useState } from "react";
import { CheckCircle2, Trash2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface BulkActionBarProps {
  selectedCount: number;
  totalOnPage: number;
  isAllOnPageSelected: boolean;
  onSelectAllOnPage: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkUpdateStock: (inStock: boolean) => Promise<void>;
  isDeleting?: boolean;
  isUpdatingStock?: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalOnPage,
  isAllOnPageSelected,
  onSelectAllOnPage,
  onClearSelection,
  onBulkDelete,
  onBulkUpdateStock,
  isDeleting = false,
  isUpdatingStock = false,
}: BulkActionBarProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const isBusy = isDeleting || isUpdatingStock;

  const handleConfirmDelete = async () => {
    try {
      await onBulkDelete();
      setShowConfirmDelete(false);
    } catch {
      // Handled by caller's toast
    }
  };

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions bar"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-card/95 p-3 px-5 shadow-2xl backdrop-blur-md max-w-3xl w-[94vw] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center gap-3">
          <Badge
            variant="default"
            className="h-6 px-2.5 text-xs font-semibold bg-primary text-primary-foreground"
          >
            {selectedCount} selected
          </Badge>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSelectAllOnPage}
            disabled={isBusy}
            className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          >
            {isAllOnPageSelected ? "Deselect Page" : `Select All on Page (${totalOnPage})`}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mark In Stock */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => onBulkUpdateStock(true)}
            className="h-8 gap-1.5 text-xs border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Mark In Stock</span>
          </Button>

          {/* Mark Out of Stock */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => onBulkUpdateStock(false)}
            className="h-8 gap-1.5 text-xs border-amber-600/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Mark Out of Stock</span>
          </Button>

          {/* Bulk Delete */}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={() => setShowConfirmDelete(true)}
            className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Selected</span>
          </Button>

          {/* Clear Selection */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isBusy}
            onClick={onClearSelection}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDelete}
        onOpenChange={setShowConfirmDelete}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? "Product" : "Products"}?`}
        description={`Are you sure you want to delete ${selectedCount} selected ${
          selectedCount === 1 ? "product" : "products"
        }? This will deactivate them and remove them from public event registries and the gift catalog.`}
        confirmLabel={isDeleting ? "Deleting..." : `Delete ${selectedCount} Products`}
        cancelLabel="Cancel"
        variant="destructive"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
