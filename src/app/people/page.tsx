// ABOUTME: People listing page with search and sort.
// ABOUTME: Shows all people mentioned across content items.

"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PersonCard } from "@/components/people/person-card";
import { usePeople } from "@/hooks/use-people";

export default function PeoplePage() {
  const { data: people } = usePeople();
  const [search, setSearch] = useState("");
  const [sortAlpha, setSortAlpha] = useState(false);

  const filtered = useMemo(() => {
    if (!people) return [];
    let result = people;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (sortAlpha) {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [people, search, sortAlpha]);

  const hasPeople = people && people.length > 0;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {!hasPeople && (
        <p className="text-center text-muted-foreground py-12">
          People are extracted automatically when content is processed.
        </p>
      )}

      {hasPeople && (
        <section className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter people..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 w-48 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-mono"
              onClick={() => setSortAlpha((s) => !s)}
            >
              {sortAlpha ? "#" : "A\u2013Z"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
          {filtered.length === 0 && search && (
            <p className="text-center text-muted-foreground py-4">
              No people matching &ldquo;{search}&rdquo;
            </p>
          )}
        </section>
      )}
    </div>
  );
}
