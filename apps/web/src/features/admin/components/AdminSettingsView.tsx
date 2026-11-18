"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlatformSettingsResponse = {
  eventLifecycle: {
    autoArchiveEnabled: boolean;
    archiveAfterHours: number;
  };
  updatedAt: string | null;
};

export function AdminSettingsView() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api<PlatformSettingsResponse>("/admin/settings"),
  });

  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(true);
  const [archiveAfterHours, setArchiveAfterHours] = useState("24");

  useEffect(() => {
    if (settingsQuery.data?.eventLifecycle) {
      setAutoArchiveEnabled(
        settingsQuery.data.eventLifecycle.autoArchiveEnabled
      );
      setArchiveAfterHours(
        String(settingsQuery.data.eventLifecycle.archiveAfterHours)
      );
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      autoArchiveEnabled: boolean;
      archiveAfterHours: number;
    }) =>
      api<PlatformSettingsResponse>("/admin/settings", {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "settings"], data);
      toast.success("Platform settings saved.");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Could not save platform settings.";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = Number(archiveAfterHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 1 || parsedHours > 720) {
      toast.error("Archive delay must be between 1 and 720 hours.");
      return;
    }

    updateMutation.mutate({
      autoArchiveEnabled,
      archiveAfterHours: Math.round(parsedHours),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" aria-hidden="true" />
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure celebration lifecycle automation and platform defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            Celebration Auto-Archiving
          </CardTitle>
          <CardDescription>
            Control whether past celebrations automatically archive and how long
            after the celebration date guests can still send gifts, RSVP, or
            post on the Wall of Love.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Loading settings...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
              <div className="flex items-start gap-3 rounded-control border border-border bg-muted/30 p-4">
                <Checkbox
                  id="auto-archive-enabled"
                  checked={autoArchiveEnabled}
                  onCheckedChange={(checked) =>
                    setAutoArchiveEnabled(Boolean(checked))
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="auto-archive-enabled"
                    className="cursor-pointer font-medium"
                  >
                    Automatically archive past celebrations
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When disabled, published celebrations remain open until an
                    admin or host closes them manually.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="archive-after-hours">
                  Archive delay after celebration date (hours)
                </Label>
                <Input
                  id="archive-after-hours"
                  type="number"
                  min={1}
                  max={720}
                  step={1}
                  disabled={!autoArchiveEnabled}
                  value={archiveAfterHours}
                  onChange={(e) => setArchiveAfterHours(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Default is <strong>24 hours</strong> (1–720 hours). Public
                  pages show an archiving countdown once the celebration date has
                  passed.
                </p>
              </div>

              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Save Settings</span>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
