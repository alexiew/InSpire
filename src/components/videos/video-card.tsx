// ABOUTME: Card displaying a video's thumbnail, title, author, and status.
// ABOUTME: Links to the video detail page, shows summary preview.

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { Video } from "@/lib/videos";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link href={`/videos/${video.id}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.title || "Video thumbnail"}
            className="w-full aspect-video object-cover rounded-t-lg"
          />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {video.title || "Processing..."}
            </CardTitle>
            <StatusBadge status={video.status} />
          </div>
          {video.author && (
            <CardDescription>{video.author}</CardDescription>
          )}
        </CardHeader>
        {video.summary && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {video.summary}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
