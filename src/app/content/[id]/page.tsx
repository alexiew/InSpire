// ABOUTME: Detail page for a single content item with summary and transcript.
// ABOUTME: Shows metadata, topics, claims, people, and collapsible transcript.

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/content/status-badge";
import { TopicBadge } from "@/components/content/topic-badge";
import { useContentItem } from "@/hooks/use-content";

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: item } = useContentItem(id);
  const router = useRouter();

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  async function handleDelete() {
    if (!confirm("Delete this content?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">
            {item.title || "Processing..."}
          </h1>
          <StatusBadge status={item.status} />
        </div>

        {item.author && (
          <p className="text-muted-foreground">{item.author}</p>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Watch on YouTube
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {item.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.topics.map((t) => (
            <TopicBadge key={t} topic={t} />
          ))}
        </div>
      )}

      {item.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{item.error}</p>
        </div>
      )}

      {item.summary && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Summary</h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {item.summary}
          </div>
        </div>
      )}

      {item.claims.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Key Claims</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {item.claims.map((claim, i) => (
              <li key={i}>{claim}</li>
            ))}
          </ul>
        </div>
      )}

      {item.people.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">People</h2>
          <div className="flex flex-wrap gap-2">
            {item.people.map((person) => (
              <span
                key={person}
                className="text-sm bg-muted px-2 py-1 rounded"
              >
                {person}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.transcript && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Full Transcript
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border p-4 text-sm whitespace-pre-wrap text-muted-foreground max-h-96 overflow-y-auto">
              {item.transcript}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {item.status === "processing" && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">
          Processing content... This may take a minute.
        </p>
      )}
    </div>
  );
}
