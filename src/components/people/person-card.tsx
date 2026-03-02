// ABOUTME: Card displaying a person's name and content count.
// ABOUTME: Links to the person detail page.

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Person } from "@/lib/people";

interface PersonCardProps {
  person: Person;
}

export function PersonCard({ person }: PersonCardProps) {
  const count = person.contentIds.length;
  return (
    <Link href={`/people/${person.slug}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="text-base">{person.name}</CardTitle>
          <CardDescription>
            {count} {count === 1 ? "item" : "items"}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
