"use client";

import { useState } from "react";
import { Search, Shield, User, Mail, Calendar, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { formatDate } from "@/lib/format";
import { useAdminUsers } from "../hooks/useAdmin";

const ROLE_FILTERS = ["ALL", "USER", "ADMIN"];

export function UserManagementView() {
  const usersQuery = useAdminUsers();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 9;

  const users = usersQuery.data ?? [];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === "ALL" || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            User Accounts & Host Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Inspect registered celebration hosts, gift givers, and operations administrators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {users.length} Registered Accounts
          </Badge>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user name or email..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleChange(role)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedRole === role
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      {usersQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
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

              return (
                <Card
                  key={user.id}
                  className="overflow-hidden border border-border/80 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-soft"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold ${
                            isAdmin
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <p className="font-heading text-sm font-bold text-foreground truncate">
                            {user.name}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={isAdmin ? "default" : "outline"}
                        className={`text-[10px] shrink-0 ${
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

                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      <span className="font-mono text-[10px]">
                        ID: {user.id.slice(-6)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        Active Account
                      </span>
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
    </div>
  );
}

