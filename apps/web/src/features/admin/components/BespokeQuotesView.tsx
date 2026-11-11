"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Gift,
  ExternalLink,
  Clock,
  CheckCircle,
  Copy,
  Check,
  Send,
  Eye,
  Package,
  Truck,
  MessageSquare,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge, type StatusKind } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { formatDate } from "@/lib/format";
import {
  useAdminBespokeQuotes,
  useProvideAdminBespokeQuote,
} from "../hooks/useAdmin";
import type { BespokeWishPackageDetail } from "@givvly/contracts";

const STATUS_FILTERS = [
  "ALL",
  "AWAITING_QUOTE",
  "QUOTED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
] as const;

export function BespokeQuotesView() {
  const quotesQuery = useAdminBespokeQuotes();
  const provideQuoteMutation = useProvideAdminBespokeQuote();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedQuote, setSelectedQuote] = useState<BespokeWishPackageDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [page, setPage] = useState(1);

  // Quote Form State
  const [subtotalNaira, setSubtotalNaira] = useState<number>(0);
  const [packagingFeeNaira, setPackagingFeeNaira] = useState<number>(0);
  const [deliveryFeeNaira, setDeliveryFeeNaira] = useState<number>(2500);
  const [estimatedDays, setEstimatedDays] = useState<number>(3);
  const [adminNote, setAdminNote] = useState<string>("");

  const PAGE_SIZE = 8;
  const quotes = quotesQuery.data ?? [];

  const filteredQuotes = quotes.filter((q) => {
    const qOrderNumber = q.orderNumber || "";
    const qRecipientName = q.recipientName || "";
    const qBuyerEmail = q.buyerEmail || "";
    const matchesSearch =
      qOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      qRecipientName.toLowerCase().includes(search.toLowerCase()) ||
      qBuyerEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      selectedStatus === "ALL" || q.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuotes = filteredQuotes.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const awaitingCount = quotes.filter((q) => q.status === "AWAITING_QUOTE").length;

  const handleOpenQuoteModal = (quote: BespokeWishPackageDetail) => {
    setSelectedQuote(quote);

    // Initial default packaging fee based on selected style
    let defaultPackagingNaira = 0;
    if (quote.wrapStyle === "SIGNATURE_VELVET_BOX") defaultPackagingNaira = 12500;
    else if (quote.wrapStyle === "WOODEN_CELEBRATION_CRATE") defaultPackagingNaira = 18000;
    else if (quote.wrapStyle === "MINIMALIST_LUXE_WRAP") defaultPackagingNaira = 5000;

    // Existing quote amounts if already quoted
    const existingSubtotalNaira = quote.subtotalKobo > 0 ? quote.subtotalKobo / 100 : 0;
    const existingPackagingNaira =
      quote.packagingFeeKobo > 0 ? quote.packagingFeeKobo / 100 : defaultPackagingNaira;
    const existingDeliveryNaira =
      quote.deliveryFeeKobo > 0 ? quote.deliveryFeeKobo / 100 : 2500;

    setSubtotalNaira(existingSubtotalNaira);
    setPackagingFeeNaira(existingPackagingNaira);
    setDeliveryFeeNaira(existingDeliveryNaira);
    setEstimatedDays(quote.customWishData?.estimatedDeliveryDays || 3);
    setAdminNote(
      quote.customWishData?.adminNote ||
        "All items sourced brand-new from verified authorized distributors with manufacturer warranty included."
    );

    setDialogOpen(true);
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/orders/quote/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    toast.success("Quote tracking link copied to clipboard!");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    if (subtotalNaira <= 0) {
      toast.error("Please enter a valid subtotal amount (greater than ₦0).");
      return;
    }

    if (!adminNote.trim()) {
      toast.error("Please include a brief sourcing note for the customer.");
      return;
    }

    try {
      await provideQuoteMutation.mutateAsync({
        orderId: selectedQuote.id,
        payload: {
          subtotalKobo: Math.round(subtotalNaira * 100),
          packagingFeeKobo: Math.round(packagingFeeNaira * 100),
          deliveryFeeKobo: Math.round(deliveryFeeNaira * 100),
          adminNote: adminNote.trim(),
          estimatedDeliveryDays: estimatedDays,
        },
      });

      toast.success(
        `Quotation for order ${selectedQuote.orderNumber} dispatched! Customer notified via email.`
      );
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to provide quote";
      toast.error(msg);
    }
  };

  const totalCalculatedNaira =
    Number(subtotalNaira || 0) +
    Number(packagingFeeNaira || 0) +
    Number(deliveryFeeNaira || 0);

  return (
    <div className="space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bespoke Wish Packages & Concierge Quotes
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Review custom gift requests, price items with verified suppliers, and dispatch payment quotes.
          </p>
        </div>

        {awaitingCount > 0 && (
          <Badge variant="destructive" className="px-3 py-1 text-xs font-semibold animate-pulse">
            {awaitingCount} Awaiting Concierge Quote
          </Badge>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order number, recipient or customer email..."
            className="pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSelectedStatus(s);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedStatus === s
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {quotesQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : paginatedQuotes.length === 0 ? (
        <EmptyState
          icon={<Gift className="h-10 w-10 text-muted-foreground" />}
          title="No Bespoke Wish Packages"
          description="Custom gift requests submitted by customers will appear here for pricing and fulfillment."
        />
      ) : (
        <div className="space-y-3">
          {paginatedQuotes.map((q) => {
            const isAwaiting = q.status === "AWAITING_QUOTE";
            const itemCount = q.customWishData?.items?.length || 0;

            return (
              <Card
                key={q.id}
                className={`transition-all border ${
                  isAwaiting
                    ? "border-amber-500/40 bg-amber-500/[0.02] shadow-soft ring-1 ring-amber-500/20"
                    : "border-border/80 bg-card hover:border-primary/30"
                }`}
              >
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading font-bold text-foreground text-sm sm:text-base">
                        #{q.orderNumber}
                      </span>
                      <StatusBadge status={q.status as StatusKind} />
                      {q.customWishData?.occasion && (
                        <Badge variant="outline" className="text-[10px]">
                          {q.customWishData.occasion}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Customer:{" "}
                      <span className="font-medium text-foreground">
                        {q.buyerName || q.buyerEmail}
                      </span>{" "}
                      • For:{" "}
                      <span className="font-medium text-foreground">
                        {q.recipientName}
                      </span>{" "}
                      {q.deliveryAddress?.city && q.deliveryAddress?.state
                        ? `(${q.deliveryAddress.city}, ${q.deliveryAddress.state})`
                        : q.deliveryAddress?.state || q.deliveryAddress?.city
                        ? `(${q.deliveryAddress.city || q.deliveryAddress.state})`
                        : ""}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{itemCount} item(s)</span>
                      <span>•</span>
                      <span>Submitted: {formatDate(q.createdAt)}</span>
                      {q.customWishData?.targetBudgetHint && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">
                            Target: {q.customWishData.targetBudgetHint}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:self-center w-full sm:w-auto justify-end">
                    {q.totalKobo > 0 && (
                      <div className="text-right mr-2 hidden sm:block">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          Quote Total
                        </span>
                        <p className="font-heading font-bold text-primary text-sm">
                          <Money amountKobo={q.totalKobo} />
                        </p>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant={isAwaiting ? "default" : "outline"}
                      onClick={() => handleOpenQuoteModal(q)}
                      className="text-xs"
                    >
                      {isAwaiting ? (
                        <>
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          Provide Quote
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View Details
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredQuotes.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemName="bespoke quote requests"
      />

      {/* Review & Quotation Modal */}
      {selectedQuote && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Bespoke Wish #{selectedQuote.orderNumber}
                </DialogTitle>
                <StatusBadge status={selectedQuote.status as StatusKind} />
              </div>
              <DialogDescription className="text-xs">
                Submitted on {formatDate(selectedQuote.createdAt)} • Private customer link available
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Customer Link & Sharing */}
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs">
                <span className="truncate text-muted-foreground mr-2">
                  Customer URL: /orders/quote/{selectedQuote.trackingToken}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyLink(selectedQuote.trackingToken)}
                  className="h-7 px-2 text-xs"
                >
                  {copiedToken ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>

              {/* Recipient & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs rounded-xl border border-border/70 p-3.5 bg-card">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                    Buyer / Requester
                  </span>
                  <p className="font-bold text-foreground text-sm">
                    {selectedQuote.buyerName || "Guest"}
                  </p>
                  <p className="text-muted-foreground">{selectedQuote.buyerEmail}</p>
                  {selectedQuote.buyerPhone && (
                    <p className="text-muted-foreground">{selectedQuote.buyerPhone}</p>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                    Recipient & Delivery
                  </span>
                  <p className="font-bold text-foreground text-sm">
                    {selectedQuote.recipientName}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedQuote.deliveryAddress?.street || ""}
                    {selectedQuote.deliveryAddress?.area ? `, ${selectedQuote.deliveryAddress.area}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {[selectedQuote.deliveryAddress?.city, selectedQuote.deliveryAddress?.state].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>

              {/* Items Requested */}
              <div className="space-y-3">
                <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Gift className="h-4 w-4 text-primary" />
                  Wish Items to Source ({selectedQuote.customWishData?.items?.length || 0})
                </h4>

                <div className="space-y-2">
                  {(selectedQuote.customWishData?.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 text-xs"
                    >
                      {item.imageUrl ? (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Gift className="h-6 w-6" />
                        </div>
                      )}

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-foreground text-sm">
                            {item.title}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            Qty: {item.qty}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-muted-foreground">
                          <span className="font-medium">{item.category}</span>
                          {item.targetBudgetHint && (
                            <span>• Target: {item.targetBudgetHint}</span>
                          )}
                          {item.inspirationUrl && (
                            <a
                              href={item.inspirationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              Store Link <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        {item.specs && (
                          <p className="text-muted-foreground pt-0.5">
                            <span className="font-medium text-foreground">Specs: </span>
                            {item.specs}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keepsake Packaging & Note */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                    Packaging Requested:
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedQuote.wrapStyle}
                  </Badge>
                </div>
                {selectedQuote.giftNote && (
                  <div className="pt-1">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                      Handwritten Calligraphy Card:
                    </span>
                    <p className="font-serif italic text-foreground bg-card p-2 rounded border border-border/50 mt-1">
                      &ldquo;{selectedQuote.giftNote}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Provide Quotation Form */}
              <form
                onSubmit={handleSubmitQuote}
                className="space-y-4 rounded-2xl border-2 border-primary/30 bg-primary/[0.03] p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-primary" />
                    {selectedQuote.status === "AWAITING_QUOTE"
                      ? "Prepare & Send Quotation"
                      : "Adjust & Update Quotation"}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Amounts in Nigerian Naira (₦)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="subtotalNaira" className="text-xs">
                      Items Subtotal (₦) *
                    </Label>
                    <Input
                      id="subtotalNaira"
                      type="number"
                      min={1}
                      step={500}
                      value={subtotalNaira || ""}
                      onChange={(e) => setSubtotalNaira(Number(e.target.value))}
                      placeholder="e.g. 150000"
                      required
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="packagingFeeNaira" className="text-xs">
                      Packaging Fee (₦)
                    </Label>
                    <Input
                      id="packagingFeeNaira"
                      type="number"
                      min={0}
                      step={500}
                      value={packagingFeeNaira || ""}
                      onChange={(e) => setPackagingFeeNaira(Number(e.target.value))}
                      placeholder="e.g. 12500"
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="deliveryFeeNaira" className="text-xs">
                      Delivery Fee (₦)
                    </Label>
                    <Input
                      id="deliveryFeeNaira"
                      type="number"
                      min={0}
                      step={500}
                      value={deliveryFeeNaira || ""}
                      onChange={(e) => setDeliveryFeeNaira(Number(e.target.value))}
                      placeholder="e.g. 2500"
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="estimatedDays" className="text-xs">
                      Estimated Delivery (Days after payment)
                    </Label>
                    <Input
                      id="estimatedDays"
                      type="number"
                      min={1}
                      max={30}
                      value={estimatedDays || ""}
                      onChange={(e) => setEstimatedDays(Number(e.target.value))}
                      placeholder="e.g. 3"
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-col justify-end text-right">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                      Total Customer Quote
                    </span>
                    <span className="font-heading font-bold text-primary text-xl">
                      ₦{totalCalculatedNaira.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminNote" className="text-xs">
                    Concierge Sourcing Note to Customer *
                  </Label>
                  <Textarea
                    id="adminNote"
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Provide details on where items were sourced, warranty status, and delivery arrangements..."
                    required
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={provideQuoteMutation.isPending || totalCalculatedNaira <= 0}
                    className="text-xs font-semibold"
                  >
                    {provideQuoteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Dispatching Quote...
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Send Official Quote to Customer
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
