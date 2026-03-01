// ABOUTME: Displays the processing status of a content item as a colored badge.
// ABOUTME: Shows processing (yellow), ready (green), or error (red).

import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/content";

const variants: Record<ContentStatus, "default" | "secondary" | "destructive"> = {
  processing: "secondary",
  ready: "default",
  error: "destructive",
};

const labels: Record<ContentStatus, string> = {
  processing: "Processing",
  ready: "Ready",
  error: "Error",
};

interface StatusBadgeProps {
  status: ContentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
