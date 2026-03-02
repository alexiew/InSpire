// ABOUTME: Library page showing all accepted content in the knowledge base.
// ABOUTME: Provides title search and links to content detail pages.

"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContentCard } from "@/components/content/content-card";
import { useLibrary } from "@/hooks/use-library";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const { data: items } = useLibrary(search || undefined);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search titles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {items && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} showStatus={false} />
          ))}
        </div>
      ) : items ? (
        <p className="text-center text-muted-foreground py-12">
          {search
            ? "No results found."
            : "Your library is empty. Accept content from the Review queue to build it."}
        </p>
      ) : null}
    </div>
  );
}
