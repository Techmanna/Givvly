"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { changePassword, deleteAccount } from "../api";
import { useLogoutMutation } from "../hooks/useAuth";

export function AccountSecurityForm() {
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update password."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await logoutMutation.mutateAsync();
      setDeleteDialogOpen(false);
      toast.success("Account deleted");
      router.push("/login");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete account."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sec-current-pw">Current password</Label>
              <Input
                id="sec-current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-new-pw">New password (min 8 chars)</Label>
              <Input
                id="sec-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="font-display text-xl text-danger">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">Delete Givvly account</p>
            <p className="text-xs text-ink-muted">
              Permanently remove your account after all pending event payouts
              settle.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete your Givvly account?"
        description="This action permanently closes your account and archives all unpublished events."
        confirmLabel="Yes, delete account"
        variant="destructive"
        isPending={deleting}
        onConfirm={() => void handleDeleteAccount()}
      />
    </div>
  );
}

