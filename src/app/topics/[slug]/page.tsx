// ABOUTME: Detail page for a single topic with synthesis and content list.
// ABOUTME: Shows cross-content synthesis and all content items in the topic.

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Tv, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrlForm } from "@/components/content/url-form";
import { ContentCard } from "@/components/content/content-card";
import { SynthesisSection } from "@/components/topics/synthesis-section";
import { CrosslinkDialog } from "@/components/topics/crosslink-dialog";
import { useTopic } from "@/hooks/use-topics";

export default function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: topic, mutate } = useTopic(slug);
  const router = useRouter();
  const [creatingQvc, setCreatingQvc] = useState(false);

  async function handleQvc() {
    if (!topic?.synthesis) return;
    setCreatingQvc(true);
    try {
      const res = await fetch("/api/qvc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedText: topic.synthesis,
          sourceType: "topic",
          sourceId: slug,
          title: topic.name,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(`/qvc/${json.id}`);
      }
    } finally {
      setCreatingQvc(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete topic "${topic?.name}"?`)) return;
    await fetch(`/api/topics/${slug}`, { method: "DELETE" });
    await mutate(undefined, { revalidate: false });
    router.push("/");
  }

  if (!topic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{topic.name}</h1>
          <span className="text-muted-foreground">
            {topic.contentIds.length}{" "}
            {topic.contentIds.length === 1 ? "item" : "items"}
          </span>
          <CrosslinkDialog
            slug={slug}
            topicName={topic.name}
            onLinked={() => mutate()}
          />
        </div>
        <div className="flex gap-2">
          {topic.synthesis && (
            <Button size="sm" onClick={handleQvc} disabled={creatingQvc}>
              {creatingQvc ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Tv className="mr-1 h-4 w-4" />
              )}
              QVC
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <UrlForm
        onSubmitted={() => mutate()}
        initialTopics={[topic.name]}
      />

      <SynthesisSection
        slug={slug}
        topicName={topic.name}
        synthesis={topic.synthesis}
        synthesizedAt={topic.synthesizedAt}
        synthesisHistory={topic.synthesisHistory ?? []}
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
