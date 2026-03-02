// ABOUTME: Main page with URL input, tabbed navigation (Topics/People/Categories), and recent content.
// ABOUTME: Topics and People tabs have search/sort; Categories is a placeholder.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { UrlForm } from "@/components/content/url-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContentCard } from "@/components/content/content-card";
import { TopicCard } from "@/components/topics/topic-card";
import { PersonCard } from "@/components/people/person-card";
import { useContent } from "@/hooks/use-content";
import { useTopics } from "@/hooks/use-topics";
import { usePeople } from "@/hooks/use-people";
import { filterAndSortTopics, type TopicSortOrder } from "@/lib/filter-topics";
import { slugify } from "@/lib/utils";

export default function HomePage() {
  const { data: items, mutate: mutateContent } = useContent();
  const { data: topics, mutate: mutateTopics } = useTopics();
  const { data: people } = usePeople();
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSort, setTopicSort] = useState<TopicSortOrder>("count");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleSortAlpha, setPeopleSortAlpha] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const router = useRouter();

  function handleSubmitted() {
    mutateContent();
    mutateTopics();
  }

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

  const hasTopics = topics && topics.length > 0;
  const hasPeople = people && people.length > 0;
  const hasItems = items && items.length > 0;
  const hasAnything = hasTopics || hasPeople || hasItems;

  const filteredTopics = useMemo(
    () => (topics ? filterAndSortTopics(topics, topicSearch, topicSort) : []),
    [topics, topicSearch, topicSort]
  );

  const filteredPeople = useMemo(() => {
    if (!people) return [];
    let filtered = people;
    if (peopleSearch) {
      const q = peopleSearch.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (peopleSortAlpha) {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [people, peopleSearch, peopleSortAlpha]);

  return (
    <>
      <Header title="InSpire" />
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <UrlForm onSubmitted={handleSubmitted} />

        {!hasAnything && (
          <p className="text-center text-muted-foreground py-12">
            No content yet. Paste a YouTube URL above to get started.
          </p>
        )}

        {hasAnything && (
          <Tabs defaultValue="topics">
            <TabsList>
              <TabsTrigger value="topics">
                Topics{hasTopics ? ` (${topics.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="people">
                People{hasPeople ? ` (${people.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="topics">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {creatingTopic ? (
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setCreatingTopic(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Topic
                      </Button>
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
            </TabsContent>

            <TabsContent value="people">
              <section className="space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter people..."
                      value={peopleSearch}
                      onChange={(e) => setPeopleSearch(e.target.value)}
                      className="pl-9 h-8 w-48 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs font-mono"
                    onClick={() => setPeopleSortAlpha((s) => !s)}
                  >
                    {peopleSortAlpha ? "#" : "A\u2013Z"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {filteredPeople.map((person) => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>
                {filteredPeople.length === 0 && peopleSearch && (
                  <p className="text-center text-muted-foreground py-4">
                    No people matching &ldquo;{peopleSearch}&rdquo;
                  </p>
                )}
                {!hasPeople && !peopleSearch && (
                  <p className="text-center text-muted-foreground py-8">
                    People are extracted automatically when content is processed.
                  </p>
                )}
              </section>
            </TabsContent>

            <TabsContent value="categories">
              <div className="text-center text-muted-foreground py-12">
                <p>Categories let you group related topics together.</p>
                <p className="text-sm mt-1">Coming soon.</p>
              </div>
            </TabsContent>
          </Tabs>
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
