// ABOUTME: Card displaying a topic's name and content count.
// ABOUTME: Links to the topic detail page.

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Topic } from "@/lib/topics";

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const count = topic.contentIds.length;
  return (
    <Link href={`/topics/${topic.slug}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="text-base">{topic.name}</CardTitle>
          <CardDescription>
            {count} {count === 1 ? "item" : "items"}
            {topic.synthesis ? " · Synthesis available" : ""}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
