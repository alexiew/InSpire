// ABOUTME: Clickable topic badge that links to the topic detail page.
// ABOUTME: Used on content cards and detail pages.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { slugify } from "@/lib/utils";

interface TopicBadgeProps {
  topic: string;
}

export function TopicBadge({ topic }: TopicBadgeProps) {
  return (
    <Link href={`/topics/${slugify(topic)}`}>
      <Badge variant="outline" className="cursor-pointer hover:bg-accent">
        {topic}
      </Badge>
    </Link>
  );
}
