// ABOUTME: Main page with URL input and video card grid.
// ABOUTME: Shows all processed videos sorted by most recent.

"use client";

import { Header } from "@/components/layout/header";
import { UrlForm } from "@/components/videos/url-form";
import { VideoCard } from "@/components/videos/video-card";
import { useVideos } from "@/hooks/use-videos";

export default function HomePage() {
  const { data: videos, mutate } = useVideos();

  return (
    <>
      <Header title="InSpire" />
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <UrlForm onSubmitted={() => mutate()} />

        {videos?.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No videos yet. Paste a YouTube URL above to get started.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos?.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>
    </>
  );
}
