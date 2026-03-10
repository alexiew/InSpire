// ABOUTME: QVC list page showing all product opportunity explorations.
// ABOUTME: Displays items with their current pipeline stage and links to detail view.

"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQvcItems } from "@/hooks/use-qvc";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  seed: "Seed",
  researching: "Researching",
  drafting: "Drafting",
  complete: "Complete",
};

const STATUS_COLORS: Record<string, string> = {
  seed: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  researching: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  drafting: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  complete: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export default function QvcListPage() {
  const { data: items, mutate } = useQvcItems();

  async function handleDelete(id: number) {
    if (!confirm("Delete this QVC item?")) return;
    await fetch(`/api/qvc/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">QVC</h1>

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
                <Link href={`/qvc/${item.id}`} className="flex-1 min-w-0">
                  <CardTitle className="text-base">
                    {item.title || item.seedText.slice(0, 80) + (item.seedText.length > 80 ? "..." : "")}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span>
                      {item.sourceType === "briefing" ? "From briefing" : `From topic`}
                    </span>
                    <span>·</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </CardDescription>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : items ? (
        <p className="text-center text-muted-foreground py-12">
          No QVC items yet. Select text in a briefing or use the QVC button on a topic to start exploring product opportunities.
        </p>
      ) : null}
    </div>
  );
}
