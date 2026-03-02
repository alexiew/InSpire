// ABOUTME: Card displaying a topic's name and content count.
// ABOUTME: Links to the topic detail page, or acts as a selectable card in merge mode.

import Link from "next/link";
import { Check } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Topic } from "@/lib/topics";

interface TopicCardProps {
  topic: Topic;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

export function TopicCard({ topic, selectable, selected, onToggle }: TopicCardProps) {
  const count = topic.contentIds.length;

  const card = (
    <Card
      className={cn(
        "transition-colors cursor-pointer h-full",
        selectable && selected
          ? "border-primary bg-primary/5"
          : "hover:border-primary/30"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{topic.name}</CardTitle>
          {selectable && selected && (
            <Check className="h-4 w-4 text-primary shrink-0" />
          )}
        </div>
        <CardDescription>
          {count} {count === 1 ? "item" : "items"}
          {topic.synthesis ? " · Synthesis available" : ""}
        </CardDescription>
      </CardHeader>
    </Card>
  );

  if (selectable) {
    return (
      <div onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onToggle?.()}>
        {card}
      </div>
    );
  }

  return <Link href={`/topics/${topic.slug}`}>{card}</Link>;
}
