// ABOUTME: Main page with URL input, topic grid, and recent content.
// ABOUTME: Topics are the primary navigation, with recent additions below.

"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { UrlForm } from "@/components/content/url-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/content/content-card";
import { TopicCard } from "@/components/topics/topic-card";
import { useContent } from "@/hooks/use-content";
import { useTopics } from "@/hooks/use-topics";
import { filterAndSortTopics, type TopicSortOrder } from "@/lib/filter-topics";

export default function HomePage() {
  const { data: items, mutate: mutateContent } = useContent();
  const { data: topics, mutate: mutateTopics } = useTopics();
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSort, setTopicSort] = useState<TopicSortOrder>("count");

  function handleSubmitted() {
    mutateContent();
    mutateTopics();
  }

  const hasTopics = topics && topics.length > 0;
  const hasItems = items && items.length > 0;
  const filteredTopics = useMemo(
    () => (topics ? filterAndSortTopics(topics, topicSearch, topicSort) : []),
    [topics, topicSearch, topicSort]
  );

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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Topics</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter topics..."
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    className="pl-9 h-8 w-48 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-mono"
                  onClick={() =>
                    setTopicSort((s) => (s === "count" ? "alpha" : "count"))
                  }
                >
                  {topicSort === "count" ? "A–Z" : "#"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {filteredTopics.map((topic) => (
                <TopicCard key={topic.slug} topic={topic} />
              ))}
            </div>
            {filteredTopics.length === 0 && topicSearch && (
              <p className="text-center text-muted-foreground py-4">
                No topics matching &ldquo;{topicSearch}&rdquo;
              </p>
            )}
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
