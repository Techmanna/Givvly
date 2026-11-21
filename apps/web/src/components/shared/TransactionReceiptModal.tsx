"use client";

import * as React from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Printer,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/format";
import { buildGivvlyInvoiceHtml } from "@/lib/invoice-template";
import type { WalletTransactionItem } from "@/features/wallet/api";
import type { Order } from "@givvly/contracts";

export interface TransactionReceiptModalProps {
  open?: boolean;
  onClose: () => void;
  walletTx?: WalletTransactionItem | null;
  order?: Order | null;
}

interface NormalizedReceipt {
  title: string;
  subtitle: string;
  reference: string;
  id: string;
  status: string;
  amountKobo: number;
  direction?: "CREDIT" | "DEBIT";
  dateStr: string;
  description: string;
  recipientLabel?: string;
  deliveryAddress?: string;
  vtuNumbers?: string;
  items?: Array<{ label: string; value: string }>;
  shareUrl?: string;
}

function buildNormalizedReceipt(
  walletTx?: WalletTransactionItem | null,
  order?: Order | null
): NormalizedReceipt | null {
  if (walletTx) {
    const meta = walletTx.metadata || {};
    const recipientParts = [
      meta.recipientName,
      meta.recipientPhone || meta.recipientEmail,
    ].filter(Boolean);

    return {
      title:
        walletTx.direction === "CREDIT"
          ? "Wallet Credit Receipt"
          : "Wallet Debit Receipt",
      subtitle: walletTx.kind.replace(/_/g, " "),
      reference: walletTx.reference,
      id: walletTx.id,
      status: "COMPLETED",
      amountKobo: walletTx.amountKobo,
      direction: walletTx.direction,
      dateStr: new Date(walletTx.createdAt).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      description: walletTx.description,
      recipientLabel:
        recipientParts.length > 0 ? recipientParts.join(" • ") : undefined,
      items: [{ label: "Givvly Platform Fee", value: formatNaira(0) }],
    };
  }

  if (order) {
    const createdDate =
      order.createdAt || order.timeline?.[0]?.at || new Date().toISOString();
    const vtuNumbersList =
      order.vtuPhones && order.vtuPhones.length > 0
        ? order.vtuPhones
        : order.vtuType && order.recipientPhone
          ? [order.recipientPhone]
          : [];
    const vtuNumbers =
      vtuNumbersList.length > 0 ? vtuNumbersList.join(", ") : undefined;

    const recipientParts = [
      order.recipientName,
      vtuNumbers ? undefined : order.recipientPhone,
    ].filter(Boolean);
    const trackingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/track/${encodeURIComponent(order.number)}`
        : `/track/${encodeURIComponent(order.number)}`;

    return {
      title: "Order Receipt",
      subtitle: `Order ${order.number}`,
      reference: order.number,
      id: order.id,
      status: order.status,
      amountKobo: order.totalKobo,
      dateStr: new Date(createdDate).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      description: order.items.map((i) => `${i.qty}× ${i.name}`).join(", "),
      recipientLabel:
        recipientParts.length > 0 ? recipientParts.join(" • ") : undefined,
      deliveryAddress: vtuNumbers ? undefined : order.address,
      vtuNumbers,
      items: [
        ...order.items.map((item) => ({
          label: `${item.qty}× ${item.name}`,
          value: formatNaira(item.unitPriceKobo * item.qty),
        })),
        ...(typeof order.packagingFeeKobo === "number" &&
        order.packagingFeeKobo > 0
          ? [
              {
                label: "Gift Wrapping",
                value: formatNaira(order.packagingFeeKobo),
              },
            ]
          : []),
        ...(typeof order.deliveryFeeKobo === "number" &&
        order.deliveryFeeKobo > 0
          ? [
              {
                label: "Delivery & Shipping",
                value: formatNaira(order.deliveryFeeKobo),
              },
            ]
          : []),
        ...(typeof order.vatKobo === "number" && order.vatKobo > 0
          ? [{ label: "VAT (7.5%)", value: formatNaira(order.vatKobo) }]
          : []),
        {
          label: "Givvly Platform Fee",
          value: formatNaira(order.feeKobo ?? 0),
        },
      ],
      shareUrl: trackingUrl,
    };
  }

  return null;
}

function generateReceiptCanvas(receipt: NormalizedReceipt): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const width = 800;
  const extraRows =
    (receipt.recipientLabel ? 1 : 0) +
    (receipt.vtuNumbers ? 1 : 0) +
    (receipt.deliveryAddress ? 1 : 0) +
    (receipt.items?.length ?? 0);
  const height = 640 + extraRows * 44;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FAF3EF";
  ctx.fillRect(0, 0, width, height);

  // Outer card border
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#ECDCD6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(36, 36, width - 72, height - 72, 24);
  ctx.fill();
  ctx.stroke();

  // Top gradient bar
  const grad = ctx.createLinearGradient(36, 0, width - 36, 0);
  grad.addColorStop(0, "#B5495B");
  grad.addColorStop(0.55, "#D4A959");
  grad.addColorStop(1, "#B5495B");
  ctx.fillStyle = grad;
  ctx.fillRect(36, 36, width - 72, 8);

  // Brand top bar
  ctx.fillStyle = "#B5495B";
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillText("Givvly", 76, 98);

  ctx.fillStyle = "#7A6468";
  ctx.font = "600 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("OFFICIAL INVOICE & RECEIPT", 76, 124);

  // Status pill
  ctx.fillStyle = "#E8F5EE";
  ctx.beginPath();
  ctx.roundRect(width - 210, 74, 134, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#2E7D5B";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(receipt.status, width - 185, 96);

  // Amount section
  ctx.fillStyle = "#332022";
  ctx.font = "bold 40px ui-monospace, SFMono-Regular, Menlo, monospace";
  const sign =
    receipt.direction === "CREDIT"
      ? "+"
      : receipt.direction === "DEBIT"
        ? "-"
        : "";
  ctx.fillText(`${sign}${formatNaira(receipt.amountKobo)}`, 76, 190);

  ctx.fillStyle = "#4B5563";
  ctx.font = "500 16px system-ui, -apple-system, sans-serif";
  ctx.fillText(receipt.description.slice(0, 62), 76, 222);

  // Divider
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(76, 250);
  ctx.lineTo(width - 76, 250);
  ctx.stroke();

  const rows: Array<{ label: string; value: string }> = [
    { label: "Receipt Type", value: receipt.title },
    { label: "Category", value: receipt.subtitle },
    { label: "Reference", value: receipt.reference },
    // { label: "Record ID", value: receipt.id },
    { label: "Date & Time", value: receipt.dateStr },
  ];

  if (receipt.recipientLabel) {
    rows.push({ label: "Recipient", value: receipt.recipientLabel });
  }
  if (receipt.vtuNumbers) {
    rows.push({
      label: "Number Sent To",
      value: receipt.vtuNumbers.slice(0, 48),
    });
  }
  if (receipt.deliveryAddress) {
    rows.push({
      label: "Delivery Address",
      value: receipt.deliveryAddress.slice(0, 48),
    });
  }
  if (receipt.items && receipt.items.length > 0) {
    for (const item of receipt.items) {
      rows.push({ label: item.label, value: item.value });
    }
  }

  let y = 294;
  for (const row of rows) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 15px system-ui, -apple-system, sans-serif";
    ctx.fillText(row.label, 76, y);

    ctx.fillStyle = "#111827";
    ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
    const valText = row.value.length > 42 ? `${row.value.slice(0, 42)}...` : row.value;
    const textWidth = ctx.measureText(valText).width;
    ctx.fillText(valText, width - 76 - textWidth, y);

    y += 42;
  }

  // Footer
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "Verified by Givvly Double-Entry Ledger • givvly.store",
    76,
    height - 64
  );

  return canvas;
}

export function TransactionReceiptModal({
  open = true,
  onClose,
  walletTx,
  order,
}: TransactionReceiptModalProps) {
  const receipt = React.useMemo(
    () => buildNormalizedReceipt(walletTx, order),
    [walletTx, order]
  );

  if (!receipt) return null;

  const sign =
    receipt.direction === "CREDIT"
      ? "+"
      : receipt.direction === "DEBIT"
        ? "-"
        : "";

  const summaryText = [
    `Givvly Official Receipt`,
    `Amount: ${sign}${formatNaira(receipt.amountKobo)}`,
    `Description: ${receipt.description}`,
    `Reference: ${receipt.reference}`,
    `Status: ${receipt.status}`,
    `Date: ${receipt.dateStr}`,
    receipt.recipientLabel ? `Recipient: ${receipt.recipientLabel}` : null,
    receipt.shareUrl ? `Track: ${receipt.shareUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const handleCopyDetails = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success("Receipt details copied to clipboard!");
    } catch {
      toast.error("Could not copy receipt details.");
    }
  };

  const handleDownloadImage = () => {
    try {
      const canvas = generateReceiptCanvas(receipt);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeRef = receipt.reference.replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `givvly-receipt-${safeRef}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Receipt downloaded as PNG image!");
    } catch {
      toast.error("Failed to generate receipt download.");
    }
  };

  const handlePrintPdf = () => {
    const win = window.open("", "_blank", "width=880,height=780");
    if (!win) {
      toast.error("Please allow popups to print or save receipt as PDF.");
      return;
    }

    const invoiceItems = order
      ? order.items.map((item) => ({
          description: item.name || item.title || "Gift Item",
          qty: item.qty,
          unitPrice: formatNaira(item.unitPriceKobo),
          amount: formatNaira(item.unitPriceKobo * item.qty),
        }))
      : [
          {
            description: receipt.description || receipt.title,
            subtext: receipt.subtitle,
            qty: 1,
            unitPrice: `${sign}${formatNaira(receipt.amountKobo)}`,
            amount: `${sign}${formatNaira(receipt.amountKobo)}`,
          },
        ];

    const totals: Array<{ label: string; value: string; isTotal?: boolean }> =
      order
        ? [
            {
              label: "Subtotal",
              value: formatNaira(
                order.subtotalKobo ??
                  order.items.reduce(
                    (sum, i) => sum + i.unitPriceKobo * i.qty,
                    0
                  )
              ),
            },
            ...(typeof order.packagingFeeKobo === "number" &&
            order.packagingFeeKobo > 0
              ? [
                  {
                    label: "Gift Wrapping",
                    value: formatNaira(order.packagingFeeKobo),
                  },
                ]
              : []),
            ...(typeof order.deliveryFeeKobo === "number" &&
            order.deliveryFeeKobo > 0
              ? [
                  {
                    label: "Delivery & Shipping",
                    value: formatNaira(order.deliveryFeeKobo),
                  },
                ]
              : []),
            ...(typeof order.vatKobo === "number" && order.vatKobo > 0
              ? [{ label: "VAT (7.5%)", value: formatNaira(order.vatKobo) }]
              : []),
            {
              label: "Givvly Platform Fee",
              value: formatNaira(order.feeKobo ?? 0),
            },
            {
              label: "Total Paid",
              value: formatNaira(order.totalKobo),
              isTotal: true,
            },
          ]
        : [
            { label: "Givvly Platform Fee", value: formatNaira(0) },
            {
              label: "Total Amount",
              value: `${sign}${formatNaira(receipt.amountKobo)}`,
              isTotal: true,
            },
          ];

    const html = buildGivvlyInvoiceHtml({
      title: order ? "Official Invoice & Receipt" : receipt.title,
      invoiceNumber: order ? `INV #${order.number}` : receipt.reference,
      reference: receipt.reference,
      status: receipt.status,
      issuedAt: receipt.dateStr,
      billedToName: order?.buyerEmail || "Givvly Member",
      billedToSub: receipt.subtitle,
      recipientName: receipt.recipientLabel,
      recipientSub: receipt.vtuNumbers
        ? `Sent to: ${receipt.vtuNumbers}`
        : receipt.deliveryAddress,
      paymentMethod: order ? "Givvly Checkout" : "Givvly Double-Entry Wallet",
      items: invoiceItems,
      totals,
      footerNote: receipt.shareUrl || "www.givvly.store",
    });

    win.document.write(html);
    win.document.close();
  };

  const handleShareReceipt = async () => {
    try {
      const canvas = generateReceiptCanvas(receipt);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      const safeRef = receipt.reference.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (
        blob &&
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare
      ) {
        const file = new File([blob], `givvly-receipt-${safeRef}.png`, {
          type: "image/png",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: receipt.title,
            text: summaryText,
            files: [file],
          });
          return;
        }
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: receipt.title,
          text: summaryText,
          url: receipt.shareUrl,
        });
        return;
      }

      // Fallback: copy to clipboard and offer WhatsApp share
      await navigator.clipboard.writeText(summaryText);
      const waUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast.success("Receipt copied & opened in WhatsApp to share!");
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        await handleCopyDetails();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg overflow-hidden p-0">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-6">
        <DialogHeader className="space-y-2 border-b border-border pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/givvly-logo.png"
                alt="Givvly"
                className="h-7 w-auto object-contain"
              />
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" />
                Official Receipt
              </span>
            </div>
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {receipt.status}
            </Badge>
          </div>
          <DialogTitle className="font-heading text-xl font-bold text-foreground">
            {receipt.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {receipt.description}
          </DialogDescription>
        </DialogHeader>

        {/* Main Receipt Body */}
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Amount
            </p>
            <p
              className={`mt-1 font-mono text-3xl font-bold ${receipt.direction === "CREDIT"
                ? "text-emerald-600"
                : "text-foreground"
                }`}
            >
              {sign}
              {formatNaira(receipt.amountKobo)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {receipt.dateStr}
            </p>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-background text-xs">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Reference</span>
              <button
                type="button"
                onClick={handleCopyDetails}
                className="inline-flex items-center gap-1.5 font-mono font-semibold text-foreground hover:text-primary"
              >
                <span className="truncate max-w-[220px]">
                  {receipt.reference}
                </span>
                <Copy className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Category</span>
              <span className="font-mono font-medium text-foreground">
                {receipt.subtitle}
              </span>
            </div>

            {/* Record ID hidden for better UX */}
            {/* <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Record ID</span>
              <span className="font-mono text-muted-foreground truncate max-w-[220px]">
                {receipt.id}
              </span>
            </div> */}

            {receipt.recipientLabel && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium text-foreground text-right">
                  {receipt.recipientLabel}
                </span>
              </div>
            )}

            {receipt.vtuNumbers && (
              <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                <span className="text-muted-foreground shrink-0">
                  Number Sent To
                </span>
                <span className="font-mono font-semibold text-foreground text-right">
                  {receipt.vtuNumbers}
                </span>
              </div>
            )}

            {receipt.deliveryAddress && (
              <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                <span className="text-muted-foreground shrink-0">
                  Delivery Location
                </span>
                <span className="font-medium text-foreground text-right">
                  {receipt.deliveryAddress}
                </span>
              </div>
            )}

            {receipt.items &&
              receipt.items.map((item, idx) => (
                <div
                  key={`${item.label}-${idx}`}
                  className="flex items-center justify-between px-3.5 py-2.5"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
          </div>

          {/* Actions: Share, Download PNG, Print/Save PDF */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadImage}
            >
              <Download className="h-3.5 w-3.5" />
              Download PNG
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={handleShareReceipt}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Receipt
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handlePrintPdf}
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
