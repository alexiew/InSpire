// ABOUTME: Card displaying a content item's thumbnail, title, author, and topics.
// ABOUTME: Links to the content detail page, shows summary preview.

import Link from "next/link";
import { Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { ContentItem } from "@/lib/content";

function estimateDuration(transcript: string): string | null {
  if (!transcript) return null;
  const words = transcript.split(/\s+/).filter(Boolean).length;
  if (words < 10) return null;
  const minutes = Math.round(words / 150);
  if (minutes < 1) return "<1 min";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes} min`;
}

interface ContentCardProps {
  item: ContentItem;
  showStatus?: boolean;
  onAccept?: () => void;
  onDiscard?: () => void;
}

export function ContentCard({ item, showStatus = true, onAccept, onDiscard }: ContentCardProps) {
  const showActions = item.status === "ready" && (onAccept || onDiscard);
  const duration = estimateDuration(item.transcript);

  return (
    <Card className="hover:border-primary/30 transition-colors h-full flex flex-col">
      <Link href={`/content/${item.id}`} className="flex-1">
        {item.thumbnailUrl && (
          <div className="relative">
            <img
              src={item.thumbnailUrl}
              alt={item.title || "Thumbnail"}
              className="w-full aspect-video object-cover rounded-t-lg"
            />
            {duration && (
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {duration}
              </span>
            )}
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {item.title || item.url || "Processing..."}
            </CardTitle>
            {showStatus && !showActions && <StatusBadge status={item.status} />}
          </div>
          {(item.author || (!item.thumbnailUrl && duration)) && (
            <CardDescription>
              {item.author}
              {item.author && !item.thumbnailUrl && duration && " · "}
              {!item.thumbnailUrl && duration && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {duration}
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>
        {item.summary && (
          <CardContent className="pb-2">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {item.summary}
            </p>
          </CardContent>
        )}
      </Link>
      {showActions && (
        <div className="flex gap-1 px-4 pb-3">
          {onAccept && (
            <Button size="sm" className="flex-1" onClick={onAccept}>
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
          )}
          {onDiscard && (
            <Button size="sm" variant="outline" className="flex-1" onClick={onDiscard}>
              <X className="h-3 w-3 mr-1" />
              Discard
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
