// ABOUTME: Detail page for a single topic with synthesis and content list.
// ABOUTME: Shows cross-content synthesis and all content items in the topic.

"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/content/content-card";
import { SynthesisSection } from "@/components/topics/synthesis-section";
import { useTopic } from "@/hooks/use-topics";

export default function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: topic, mutate } = useTopic(slug);

  if (!topic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{topic.name}</h1>
        <span className="text-muted-foreground">
          {topic.contentIds.length}{" "}
          {topic.contentIds.length === 1 ? "item" : "items"}
        </span>
      </div>

      <SynthesisSection
        slug={slug}
        synthesis={topic.synthesis}
        synthesizedAt={topic.synthesizedAt}
        itemCount={topic.contentIds.length}
        onSynthesized={() => mutate()}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topic.items?.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
