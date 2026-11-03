import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { NotificationBell } from "./NotificationBell";
import * as notifApi from "../api";

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("NotificationBell Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles object envelope { notifications: [...], unreadCount: 1 } without throwing filter error", async () => {
    vi.spyOn(notifApi, "fetchNotifications").mockResolvedValue([
      {
        id: "notif_1",
        title: "Gift Received! 🎁",
        body: "Adaobi sent ₦25,000 to your Wedding Registry",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    renderWithQuery(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Notifications \(1 unread\)/i)).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("handles empty notification list gracefully", async () => {
    vi.spyOn(notifApi, "fetchNotifications").mockResolvedValue([]);

    renderWithQuery(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^Notifications$/i)).toBeInTheDocument();
      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });
  });
});
