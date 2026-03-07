// ABOUTME: Silo list page showing all research containers.
// ABOUTME: Create new silos and click through to silo detail pages.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSilos } from "@/hooks/use-silos";

export default function SilosPage() {
  const { data: silos, mutate } = useSilos();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError("");

    const res = await fetch("/api/silos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      setName("");
      mutate();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create silo");
    }
    setCreating(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this silo and all its content?")) return;
    await fetch(`/api/silos/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          placeholder="New silo name (e.g., AI Ethics, Longevity Research)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          disabled={creating}
        />
        <Button type="submit" disabled={!name.trim() || creating}>
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {silos && silos.length > 0 ? (
        <div className="space-y-3">
          {silos.map((silo) => (
            <Card key={silo.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <Link href={`/silos/${silo.id}`} className="flex-1">
                  <CardTitle className="text-base">{silo.name}</CardTitle>
                  <CardDescription>
                    {silo.contentCount} item{silo.contentCount !== 1 ? "s" : ""}
                    {silo.synthesis ? " · Synthesized" : ""}
                  </CardDescription>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(silo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : silos ? (
        <p className="text-center text-muted-foreground py-12">
          No silos yet. Create one above to start a focused research container.
        </p>
      ) : null}
    </div>
  );
}
