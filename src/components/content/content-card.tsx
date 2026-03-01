// ABOUTME: Card displaying a content item's thumbnail, title, author, and topics.
// ABOUTME: Links to the content detail page, shows summary preview.

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { TopicBadge } from "./topic-badge";
import type { ContentItem } from "@/lib/content";

interface ContentCardProps {
  item: ContentItem;
}

export function ContentCard({ item }: ContentCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-colors h-full flex flex-col">
      <Link href={`/content/${item.id}`} className="flex-1">
        {item.thumbnailUrl && (
          <img
            src={item.thumbnailUrl}
            alt={item.title || "Thumbnail"}
            className="w-full aspect-video object-cover rounded-t-lg"
          />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {item.title || "Processing..."}
            </CardTitle>
            <StatusBadge status={item.status} />
          </div>
          {item.author && (
            <CardDescription>{item.author}</CardDescription>
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
      {item.topics.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {item.topics.map((t) => (
              <TopicBadge key={t} topic={t} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
