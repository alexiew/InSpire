// ABOUTME: Detail page for a single video with summary and transcript.
// ABOUTME: Shows metadata, AI summary, collapsible transcript, and delete action.

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
import { StatusBadge } from "@/components/videos/status-badge";
import { useVideo } from "@/hooks/use-videos";

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: video } = useVideo(id);
  const router = useRouter();

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  async function handleDelete() {
    if (!confirm("Delete this video?")) return;
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
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
            {video.title || "Processing..."}
          </h1>
          <StatusBadge status={video.status} />
        </div>

        {video.author && (
          <p className="text-muted-foreground">{video.author}</p>
        )}

        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Watch on YouTube
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {video.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{video.error}</p>
        </div>
      )}

      {video.summary && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Summary</h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {video.summary}
          </div>
        </div>
      )}

      {video.transcript && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Full Transcript
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border p-4 text-sm whitespace-pre-wrap text-muted-foreground max-h-96 overflow-y-auto">
              {video.transcript}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {video.status === "processing" && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">
          Processing video... This may take a minute.
        </p>
      )}
    </div>
  );
}
