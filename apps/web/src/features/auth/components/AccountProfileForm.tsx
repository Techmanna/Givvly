"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateProfile } from "../api";
import { useSessionQuery } from "../hooks/useAuth";

export function AccountProfileForm() {
  const { data: user, refetch } = useSessionQuery();
  const [name, setName] = useState(user?.name ?? "Adaobi Okafor");
  const [phone, setPhone] = useState(user?.phone ?? "08031234567");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      await refetch();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Personal Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Full name</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="acc-email">Email address</Label>
              <Badge variant="success">Verified</Badge>
            </div>
            <Input
              id="acc-email"
              value={user?.email ?? ""}
              disabled
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-phone">Phone number (Nigeria)</Label>
            <Input
              id="acc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08031234567"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

