// ABOUTME: Detail page for a single content item with summary and transcript.
// ABOUTME: Shows metadata, topics, claims, people, and collapsible transcript.

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, ExternalLink, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/content/status-badge";
import { SelectionJournal } from "@/components/content/selection-journal";
import { TopicEditor } from "@/components/content/topic-editor";
import { PeopleEditor } from "@/components/content/people-editor";
import { TranscriptSection } from "@/components/content/transcript-section";
import { useContentItem } from "@/hooks/use-content";
import { downloadPdf, formatContentAsMarkdown } from "@/lib/pdf";

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: item, mutate } = useContentItem(id);
  const router = useRouter();

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  async function handleStatusChange(status: "accepted" | "discarded") {
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (status === "discarded") {
      router.push("/recent");
    } else {
      mutate();
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this content?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    router.push("/recent");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {item.summary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadPdf(
                  formatContentAsMarkdown(item),
                  item.title,
                  item.createdAt,
                )
              }
            >
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
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
          {item.sourceType === "podcast" ? "Listen to episode" : item.sourceType === "blog" ? "Read full article" : "Watch on YouTube"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {item.status === "ready" && (
        <div className="flex gap-3">
          <Button onClick={() => handleStatusChange("accepted")}>
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button variant="outline" onClick={() => handleStatusChange("discarded")}>
            <X className="h-4 w-4 mr-1" />
            Discard
          </Button>
        </div>
      )}

      <TopicEditor
        contentId={id}
        topics={item.topics}
        onUpdated={() => mutate()}
      />

      {item.people?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">People</h2>
          <PeopleEditor
            contentId={id}
            people={item.people}
            onUpdated={() => mutate()}
          />
        </div>
      )}

      <SelectionJournal contentId={id}>
        {item.claims?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Key Claims</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {item.claims.map((claim, i) => (
                <li key={i}>{claim}</li>
              ))}
            </ul>
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

        {item.transcript && (
          <TranscriptSection transcript={item.transcript} />
        )}
      </SelectionJournal>

      {item.status === "processing" && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">
          Processing content... This may take a minute.
        </p>
      )}
    </div>
  );
}
