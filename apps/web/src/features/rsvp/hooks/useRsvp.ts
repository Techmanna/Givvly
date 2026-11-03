"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  exportEventRsvpsCsv,
  fetchEventRsvps,
  submitPublicRsvp,
} from "../api";
import { rsvpKeys } from "../keys";
import type { SubmitRsvpRequest } from "../types";

export function useSubmitRsvpMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitRsvpRequest) => submitPublicRsvp(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rsvpKeys.all });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useEventRsvps(eventId: string) {
  return useQuery({
    queryKey: rsvpKeys.byEvent(eventId),
    queryFn: () => fetchEventRsvps(eventId),
  });
}

export function useExportRsvpsMutation(eventId: string) {
  return useMutation({
    mutationFn: () => exportEventRsvpsCsv(eventId),
  });
}

