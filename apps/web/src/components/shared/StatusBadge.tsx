import { Badge, type BadgeProps } from "@/components/ui/badge";

export type StatusKind =
  | "DRAFT"
  | "PUBLISHED"
  | "CLOSED"
  | "ARCHIVED"
  | "VERIFIED"
  | "PENDING_REVIEW"
  | "NOT_SET"
  | "SENT"
  | "AVAILABLE"
  | "RESERVED"
  | "CLAIMED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "VISIBLE"
  | "HIDDEN"
  | "REMOVED"
  | "AWAITING_QUOTE"
  | "QUOTED"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "DISPUTED"
  | "CANCELLED"
  | "APPROVED"
  | "OPEN"
  | "RESOLVED"
  | "REJECTED";

const STATUS_CONFIG: Record<
  StatusKind,
  { label: string; variant: BadgeProps["variant"] }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PUBLISHED: { label: "Published", variant: "success" },
  CLOSED: { label: "Closed", variant: "secondary" },
  ARCHIVED: { label: "Archived", variant: "outline" },
  VERIFIED: { label: "Verified", variant: "success" },
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  NOT_SET: { label: "Not set", variant: "outline" },
  SENT: { label: "Sent", variant: "success" },
  AVAILABLE: { label: "Available", variant: "outline" },
  RESERVED: { label: "Reserved", variant: "warning" },
  CLAIMED: { label: "Claimed", variant: "secondary" },
  PENDING: { label: "Pending", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "secondary" },
  VISIBLE: { label: "Visible", variant: "success" },
  HIDDEN: { label: "Hidden", variant: "secondary" },
  REMOVED: { label: "Removed", variant: "destructive" },
  AWAITING_QUOTE: { label: "Awaiting quote", variant: "warning" },
  QUOTED: { label: "Quoted", variant: "default" },
  PENDING_PAYMENT: { label: "Pending payment", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "outline" },
  PACKED: { label: "Packed", variant: "secondary" },
  SHIPPED: { label: "Shipped", variant: "warning" },
  DELIVERED: { label: "Delivered", variant: "success" },
  DISPUTED: { label: "Disputed", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "success" },
  OPEN: { label: "Open", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export type StatusBadgeProps = {
  status: StatusKind;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "outline" as const,
  };
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}
