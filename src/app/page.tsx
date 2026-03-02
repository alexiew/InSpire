// ABOUTME: Topics page — the default landing page.
// ABOUTME: Shows topic grid with search/sort, topic creation, and merge mode.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Merge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TopicCard } from "@/components/topics/topic-card";
import { MergeDialog } from "@/components/topics/merge-dialog";
import { useTopics } from "@/hooks/use-topics";
import { filterAndSortTopics, type TopicSortOrder } from "@/lib/filter-topics";

export default function TopicsPage() {
  const { data: topics, mutate: mutateTopics } = useTopics();
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSort, setTopicSort] = useState<TopicSortOrder>("count");
  const [newTopicName, setNewTopicName] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const router = useRouter();

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTopicName.trim() }),
    });
    if (res.ok) {
      const topic = await res.json();
      setNewTopicName("");
      setCreatingTopic(false);
      mutateTopics();
      router.push(`/topics/${topic.slug}`);
    }
  }

  function toggleSelection(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function exitMergeMode() {
    setMerging(false);
    setSelected(new Set());
  }

  const hasTopics = topics && topics.length > 0;
  const filteredTopics = useMemo(
    () => (topics ? filterAndSortTopics(topics, topicSearch, topicSort) : []),
    [topics, topicSearch, topicSort]
  );

  const selectedTopics = useMemo(
    () => (topics ?? []).filter((t) => selected.has(t.slug)),
    [topics, selected]
  );

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      {!hasTopics && (
        <p className="text-center text-muted-foreground py-12">
          No topics yet. Submit content from the Recent page to get started.
        </p>
      )}

      {hasTopics && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {merging ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={exitMergeMode}
                >
                  Cancel
                </Button>
              ) : creatingTopic ? (
                <form onSubmit={handleCreateTopic} className="flex items-center gap-1">
                  <Input
                    autoFocus
                    placeholder="Topic name..."
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setCreatingTopic(false)}
                    className="h-8 w-48 text-sm"
                  />
                  <Button type="submit" size="sm" className="h-8" disabled={!newTopicName.trim()}>
                    Create
                  </Button>
                </form>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setCreatingTopic(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Topic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setMerging(true)}
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    Merge
                  </Button>
                </>
              )}
            </div>
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
                {topicSort === "count" ? "A\u2013Z" : "#"}
              </Button>
            </div>
          </div>

          {merging && (
            <p className="text-sm text-muted-foreground">
              Select 2 or more topics to merge, then click &ldquo;Merge Selected&rdquo;.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.slug}
                topic={topic}
                selectable={merging}
                selected={selected.has(topic.slug)}
                onToggle={() => toggleSelection(topic.slug)}
              />
            ))}
          </div>
          {filteredTopics.length === 0 && topicSearch && (
            <p className="text-center text-muted-foreground py-4">
              No topics matching &ldquo;{topicSearch}&rdquo;
            </p>
          )}
        </section>
      )}

      {merging && selected.size >= 2 && (
        <div className="fixed bottom-0 left-60 right-0 border-t bg-background p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.size} topics selected
          </p>
          <Button onClick={() => setMergeDialogOpen(true)}>
            Merge Selected
          </Button>
        </div>
      )}

      <MergeDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        topics={selectedTopics}
        onMerged={() => {
          exitMergeMode();
          mutateTopics();
        }}
      />
    </div>
  );
}
