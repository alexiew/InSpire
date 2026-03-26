// ABOUTME: Subscription card displaying name, type, last checked, with edit/delete controls.
// ABOUTME: Shared between the global subscriptions page and silo detail page.

"use client";

import { useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriptionCardProps {
  sub: {
    id: number;
    sourceType: string;
    name: string;
    extractionHints: string;
    excludeTerms: string;
    lastCheckedAt: string | null;
  };
  onDelete: (id: number) => void;
  onSave: (id: number, updates: { extractionHints: string; excludeTerms: string }) => void;
}

function formatLastChecked(lastCheckedAt: string | null): string {
  if (!lastCheckedAt) return "Never checked";
  const date = new Date(lastCheckedAt);
  return `Checked ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

export function SubscriptionCard({ sub, onDelete, onSave }: SubscriptionCardProps) {
  const [editing, setEditing] = useState(false);
  const [hints, setHints] = useState(sub.extractionHints);
  const [excludeTerms, setExcludeTerms] = useState(sub.excludeTerms);

  function handleSave() {
    onSave(sub.id, { extractionHints: hints, excludeTerms });
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{sub.name}</CardTitle>
          <CardDescription>
            {sub.sourceType === "podcast" ? "Podcast" : sub.sourceType === "blog" ? "Blog" : "YouTube"} · {formatLastChecked(sub.lastCheckedAt)}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
            title="Settings"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(sub.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {editing && (
        <CardContent className="pt-0 space-y-2">
          <Textarea
            placeholder="Extraction hints (e.g., 'Include step-by-step instructions')"
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Input
            placeholder="Exclude terms, comma-separated (e.g., #Shorts, Clip)"
            value={excludeTerms}
            onChange={(e) => setExcludeTerms(e.target.value)}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      )}
      {!editing && (sub.extractionHints || sub.excludeTerms) && (
        <CardContent className="pt-0 space-y-1">
          {sub.extractionHints && (
            <p className="text-xs text-muted-foreground">{sub.extractionHints}</p>
          )}
          {sub.excludeTerms && (
            <p className="text-xs text-muted-foreground">Exclude: {sub.excludeTerms}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
