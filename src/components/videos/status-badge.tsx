// ABOUTME: Displays the processing status of a video as a colored badge.
// ABOUTME: Shows processing (yellow), ready (green), or error (red).

import { Badge } from "@/components/ui/badge";
import type { VideoStatus } from "@/lib/videos";

const variants: Record<VideoStatus, "default" | "secondary" | "destructive"> = {
  processing: "secondary",
  ready: "default",
  error: "destructive",
};

const labels: Record<VideoStatus, string> = {
  processing: "Processing",
  ready: "Ready",
  error: "Error",
};

interface StatusBadgeProps {
  status: VideoStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
