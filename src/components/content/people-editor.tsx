// ABOUTME: Inline editor for removing people from a content item.
// ABOUTME: Toggles between read-only links and editable badges with delete buttons.

"use client";

import { useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";

interface PeopleEditorProps {
  contentId: string;
  people: string[];
  onUpdated: () => void;
}

export function PeopleEditor({ contentId, people, onUpdated }: PeopleEditorProps) {
  const [editing, setEditing] = useState(false);

  async function patchPeople(newPeople: string[]) {
    await fetch(`/api/content/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ people: newPeople }),
    });
    onUpdated();
  }

  function removePerson(name: string) {
    patchPeople(people.filter((p) => p !== name));
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {people.map((person) => (
          <Link
            key={person}
            href={`/people/${slugify(person)}`}
            className="text-sm bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
          >
            {person}
          </Link>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {people.map((person) => (
        <Badge key={person} variant="outline" className="gap-1 pr-1">
          {person}
          <button
            onClick={() => removePerson(person)}
            className="ml-0.5 rounded-full hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => setEditing(false)}
      >
        <Check className="h-3 w-3 mr-1" />
        Done
      </Button>
    </div>
  );
}
