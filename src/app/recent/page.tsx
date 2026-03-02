// ABOUTME: Recent content page showing newest items.
// ABOUTME: Click through to detail page to review, accept, or discard.

"use client";

import { ContentCard } from "@/components/content/content-card";
import { UrlForm } from "@/components/content/url-form";
import { useRecent } from "@/hooks/use-recent";

export default function RecentPage() {
  const { data: items, mutate } = useRecent();

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <UrlForm onSubmitted={() => mutate()} />

      {items && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : items ? (
        <p className="text-center text-muted-foreground py-12">
          No content yet. Paste a YouTube URL above to get started.
        </p>
      ) : null}
    </div>
  );
}
