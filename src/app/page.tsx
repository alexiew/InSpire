// ABOUTME: Main page with URL input, topic grid, and recent content.
// ABOUTME: Topics are the primary navigation, with recent additions below.

"use client";

import { Header } from "@/components/layout/header";
import { UrlForm } from "@/components/content/url-form";
import { ContentCard } from "@/components/content/content-card";
import { TopicCard } from "@/components/topics/topic-card";
import { useContent } from "@/hooks/use-content";
import { useTopics } from "@/hooks/use-topics";

export default function HomePage() {
  const { data: items, mutate: mutateContent } = useContent();
  const { data: topics, mutate: mutateTopics } = useTopics();

  function handleSubmitted() {
    mutateContent();
    mutateTopics();
  }

  const hasTopics = topics && topics.length > 0;
  const hasItems = items && items.length > 0;

  return (
    <>
      <Header title="InSpire" />
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <UrlForm onSubmitted={handleSubmitted} />

        {!hasTopics && !hasItems && (
          <p className="text-center text-muted-foreground py-12">
            No content yet. Paste a YouTube URL above to get started.
          </p>
        )}

        {hasTopics && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Topics</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {topics.map((topic) => (
                <TopicCard key={topic.slug} topic={topic} />
              ))}
            </div>
          </section>
        )}

        {hasItems && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Recent</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
