// ABOUTME: SWR hook for fetching subscription data from the API.
// ABOUTME: Polls every 10 seconds to reflect subscription status changes.

import useSWR from "swr";
import type { Subscription } from "@/lib/subscriptions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSubscriptions(siloId?: number) {
  const url = siloId !== undefined
    ? `/api/subscriptions?siloId=${siloId}`
    : "/api/subscriptions";
  return useSWR<Subscription[]>(url, fetcher, {
    refreshInterval: 10000,
  });
}
