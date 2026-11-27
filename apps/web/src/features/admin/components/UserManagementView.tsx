"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ExternalLink,
  Eye,
  FilterX,
  KeyRound,
  Mail,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge, type StatusKind } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  useAdminUserDetail,
  useAdminUsers,
  useRestoreAdminUser,
  useSuspendAdminUser,
} from "../hooks/useAdmin";
import type { AdminUserListItem } from "../types";

const STATUS_FILTERS = [
  { value: "ALL", label: "All Accounts", dotClass: "bg-foreground/40" },
  { value: "ACTIVE", label: "Active", dotClass: "bg-emerald-500" },
  { value: "SUSPENDED", label: "Suspended", dotClass: "bg-destructive" },
] as const;
const PAGE_SIZE = 9;

export function UserManagementView() {
  const usersQuery = useAdminUsers();
  const suspendMutation = useSuspendAdminUser();
  const restoreMutation = useRestoreAdminUser();

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedKyc, setSelectedKyc] = useState<string>("ALL");
  const [selectedVerified, setSelectedVerified] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<{
    user: Pick<AdminUserListItem, "id" | "name" | "email">;
    action: "SUSPEND" | "RESTORE";
  } | null>(null);

  const detailQuery = useAdminUserDetail(selectedUserId);

  const users = usersQuery.data ?? [];

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedRole !== "ALL" ||
    selectedKyc !== "ALL" ||
    selectedVerified !== "ALL" ||
    selectedStatus !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setSelectedRole("ALL");
    setSelectedKyc("ALL");
    setSelectedVerified("ALL");
    setSelectedStatus("ALL");
    setPage(1);
  };

  const filteredWithoutStatus = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone?.toLowerCase().includes(q) ?? false);
      const matchesRole = selectedRole === "ALL" || u.role === selectedRole;
      const kycTier = u.kycTier ?? 1;
      const matchesKyc =
        selectedKyc === "ALL" ||
        (selectedKyc === "TIER_1" && kycTier <= 1) ||
        (selectedKyc === "TIER_2_PLUS" && kycTier >= 2) ||
        (selectedKyc === "TIER_3" && kycTier >= 3);
      const isVerified = Boolean(u.emailVerifiedAt);
      const matchesVerified =
        selectedVerified === "ALL" ||
        (selectedVerified === "VERIFIED" && isVerified) ||
        (selectedVerified === "UNVERIFIED" && !isVerified);

      return matchesSearch && matchesRole && matchesKyc && matchesVerified;
    });
  }, [users, search, selectedRole, selectedKyc, selectedVerified]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: filteredWithoutStatus.length,
      ACTIVE: 0,
      SUSPENDED: 0,
    };
    for (const u of filteredWithoutStatus) {
      const st = u.status ?? "ACTIVE";
      counts[st] = (counts[st] ?? 0) + 1;
    }
    return counts;
  }, [filteredWithoutStatus]);

  const filteredUsers = useMemo(
    () =>
      selectedStatus === "ALL"
        ? filteredWithoutStatus
        : filteredWithoutStatus.filter(
            (u) => (u.status ?? "ACTIVE") === selectedStatus
          ),
    [filteredWithoutStatus, selectedStatus]
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = filteredUsers.filter(
    (u) => (u.status ?? "ACTIVE") === "ACTIVE"
  ).length;
  const suspendedCount = filteredUsers.filter(
    (u) => u.status === "SUSPENDED"
  ).length;
  const kycTier2PlusCount = filteredUsers.filter(
    (u) => (u.kycTier ?? 1) >= 2
  ).length;

  const handleConfirmAccountAction = async () => {
    if (!pendingStatusAction) return;
    try {
      if (pendingStatusAction.action === "SUSPEND") {
        await suspendMutation.mutateAsync(pendingStatusAction.user.id);
        toast.success(`${pendingStatusAction.user.name} has been suspended`);
      } else {
        await restoreMutation.mutateAsync(pendingStatusAction.user.id);
        toast.success(`${pendingStatusAction.user.name} has been restored`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update user account status"
      );
    } finally {
      setPendingStatusAction(null);
    }
  };

  const detail = detailQuery.data;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            User Accounts & Host Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Inspect user profiles, KYC tier verification, payout accounts, hosted celebrations, orders, and transactions.
          </p>
        </div>

        <Badge variant="outline" className="self-start text-xs font-mono sm:self-auto">
          {hasActiveFilters
            ? `${filteredUsers.length} of ${users.length} Accounts`
            : `${users.length} Registered Accounts`}
        </Badge>
      </div>

      {/* Summary KPIs — driven by active filters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {hasActiveFilters ? "Matching Accounts" : "Total Accounts"}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {filteredUsers.length}
            </p>
            {hasActiveFilters && (
              <p className="text-[11px] text-muted-foreground">
                of {users.length} registered
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Active Users
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Suspended
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-destructive">
              {suspendedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              KYC Tier 2+
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              {kycTier2PlusCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative sm:col-span-2 lg:col-span-5">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user name, email, or phone..."
              className="h-9 pl-9 text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              value={selectedRole}
              onValueChange={(val) => {
                setSelectedRole(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="USER">Standard Users</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={selectedKyc}
              onValueChange={(val) => {
                setSelectedKyc(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="KYC Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All KYC Tiers</SelectItem>
                <SelectItem value="TIER_1">Tier 1 (Basic)</SelectItem>
                <SelectItem value="TIER_2_PLUS">Tier 2+ (Verified)</SelectItem>
                <SelectItem value="TIER_3">Tier 3 (Unlimited)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 lg:col-span-3">
            <Select
              value={selectedVerified}
              onValueChange={(val) => {
                setSelectedVerified(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder="Email Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Emails</SelectItem>
                <SelectItem value="VERIFIED">Verified Email</SelectItem>
                <SelectItem value="UNVERIFIED">Unverified Email</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                title="Reset all filters"
                onClick={resetFilters}
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
          {STATUS_FILTERS.map((st) => {
            const count = statusCounts[st.value] ?? 0;
            const active = selectedStatus === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => {
                  setSelectedStatus(st.value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${st.dotClass}`} />
                <span>{st.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Grid */}
      {usersQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : usersQuery.isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to load users.
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No users match your criteria"
          description="Try clearing search filters."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedUsers.map((user) => {
              const initials = user.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "U";

              const isAdmin = user.role === "ADMIN";
              const isSuspended = user.status === "SUSPENDED";
              const kycTier = user.kycTier ?? 1;

              return (
                <Card
                  key={user.id}
                  className="overflow-hidden border border-border/80 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-soft"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold ${
                            isAdmin
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate font-heading text-sm font-bold text-foreground">
                            {user.name}
                          </p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={isAdmin ? "default" : "outline"}
                        className={`shrink-0 text-[10px] ${
                          isAdmin ? "bg-primary text-primary-foreground" : ""
                        }`}
                      >
                        {isAdmin ? (
                          <ShieldCheck className="mr-1 h-3 w-3" />
                        ) : (
                          <User className="mr-1 h-3 w-3" />
                        )}
                        <span>{user.role}</span>
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={kycTier >= 2 ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        KYC Tier {kycTier}
                      </Badge>
                      {user.emailVerifiedAt ? (
                        <Badge variant="outline" className="text-[10px]">
                          Verified Email
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400">
                          Unverified
                        </Badge>
                      )}
                      {user._count && (
                        <Badge variant="outline" className="text-[10px]">
                          {user._count.events} events
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isSuspended ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <ShieldAlert className="h-3 w-3" />
                            Suspended
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Active Account
                          </>
                        )}
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Inspect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemName="users"
          />
        </div>
      )}

      {/* User Inspector Modal */}
      <Dialog
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{detail?.name ?? "User Account"}</span>
              {detail && (
                <>
                  <Badge variant={detail.role === "ADMIN" ? "default" : "outline"}>
                    {detail.role}
                  </Badge>
                  <StatusBadge status={detail.status as StatusKind} />
                  <Badge variant={detail.kycTier >= 2 ? "success" : "secondary"}>
                    KYC Tier {detail.kycTier}
                  </Badge>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.email}${detail.phone ? ` · ${detail.phone}` : ""}`
                : "Loading user profile, KYC tier, transactions, celebrations, and orders..."}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading || !detail ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6 text-xs">
              {/* Profile, KYC & Security */}
              <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Profile & Security</p>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{detail.email}</span>
                    {detail.emailVerifiedAt && (
                      <Badge variant="outline" className="text-[10px]">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{detail.phone || "No phone on file"}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>
                      Wallet PIN: {detail.walletPinSetAt ? "Configured" : "Not set"} ·
                      Failed Logins: {detail.failedLogins}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Joined: {formatDate(detail.createdAt, "d MMM yyyy")} · Last Login:{" "}
                    {detail.lastLoginAt
                      ? formatDate(detail.lastLoginAt, "d MMM yyyy, h:mm a")
                      : "Never"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-foreground">KYC & Payout Accounts</p>
                  <p>
                    Tier Level: <strong>Tier {detail.kycTier}</strong>
                    {detail.bvnLast4 ? ` · BVN •••• ${detail.bvnLast4}` : " · No BVN linked"}
                  </p>
                  {detail.kycUpgradedAt && (
                    <p className="text-muted-foreground">
                      Upgraded: {formatDate(detail.kycUpgradedAt, "d MMM yyyy")}
                    </p>
                  )}
                  {detail.payoutAccounts.length === 0 ? (
                    <p className="text-muted-foreground">No payout bank accounts saved.</p>
                  ) : (
                    <div className="space-y-1 pt-1">
                      {detail.payoutAccounts.map((acc) => (
                        <p key={acc.id} className="text-[11px]">
                          {acc.bankName} · {acc.accountName} (•••• {acc.accountLast4}) ·{" "}
                          {acc.status}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Celebrations</p>
                  <p className="mt-1 font-heading text-lg font-bold text-foreground">
                    {detail.stats.eventsCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Hosted events</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Orders Placed</p>
                  <p className="mt-1 font-heading text-lg font-bold text-foreground">
                    <Money amountKobo={detail.stats.totalOrdersSpentKobo} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.paidOrdersCount} paid ({detail.stats.ordersCount} total)
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Gifts Given</p>
                  <p className="mt-1 font-heading text-lg font-bold text-primary">
                    <Money amountKobo={detail.stats.totalGiftsGivenKobo} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.giftsGivenCount} gifts sent
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Payouts Received</p>
                  <p className="mt-1 font-heading text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    <Money amountKobo={detail.stats.totalPayoutsReceivedKobo} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.payoutsCount} payout requests
                  </p>
                </div>
              </div>

              {/* Transactions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Recent Transactions ({detail.transactions.length})
                </h3>
                {detail.transactions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-muted-foreground">
                    No orders, gifts, or payouts recorded for this user.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {detail.transactions.slice(0, 12).map((tx) => (
                      <div
                        key={`${tx.kind}-${tx.id}`}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {tx.kind}
                            </Badge>
                            <span className="font-medium text-foreground">
                              {tx.title}
                            </span>
                            <StatusBadge status={tx.status as StatusKind} />
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {tx.reference} · {formatDate(tx.createdAt, "d MMM yyyy, h:mm a")}
                          </p>
                        </div>
                        <Money
                          amountKobo={tx.amountKobo}
                          className="font-semibold text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hosted Celebrations & Orders */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Hosted Celebrations ({detail.events.length})
                  </h3>
                  {detail.events.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-muted-foreground">
                      No celebrations hosted yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border">
                      {detail.events.slice(0, 6).map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="font-medium text-foreground">{ev.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {ev.type} · {ev.giftCount} gifts · {ev.rsvpCount} RSVPs
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={ev.status as StatusKind} />
                            <Button size="icon" variant="ghost" asChild className="h-7 w-7">
                              <Link href={`/e/${ev.slug}`} target="_blank">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Recent Orders ({detail.orders.length})
                  </h3>
                  {detail.orders.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-muted-foreground">
                      No store orders placed yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border">
                      {detail.orders.slice(0, 6).map((o) => (
                        <div key={o.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="font-mono font-medium text-foreground">{o.number}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {o.recipientName} · {formatDate(o.createdAt, "d MMM yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Money amountKobo={o.totalKobo} className="font-semibold" />
                            <div>
                              <StatusBadge status={o.status as StatusKind} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Moderation Footer */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="font-mono text-[11px] text-muted-foreground">
                  User ID: {detail.id}
                </span>
                {detail.status === "SUSPENDED" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPendingStatusAction({ user: detail, action: "RESTORE" })
                    }
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Restore Account
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setPendingStatusAction({ user: detail, action: "SUSPEND" })
                    }
                  >
                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                    Suspend Account
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Moderation Warning Dialog */}
      <Dialog
        open={Boolean(pendingStatusAction)}
        onOpenChange={(open) => {
          if (!open) setPendingStatusAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span>
                {pendingStatusAction?.action === "SUSPEND"
                  ? "Suspend User Account?"
                  : "Restore User Account?"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {pendingStatusAction?.action === "SUSPEND"
                ? `This will suspend "${pendingStatusAction.user.name}" (${pendingStatusAction.user.email}) and notify them via email and in-app notification.`
                : pendingStatusAction
                ? `This will restore "${pendingStatusAction.user.name}" (${pendingStatusAction.user.email}) to Active status and notify them via email and in-app notification.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingStatusAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                pendingStatusAction?.action === "SUSPEND" ? "destructive" : "default"
              }
              disabled={suspendMutation.isPending || restoreMutation.isPending}
              onClick={handleConfirmAccountAction}
            >
              {pendingStatusAction?.action === "SUSPEND"
                ? "Confirm Suspend"
                : "Confirm Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
