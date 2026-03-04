// ABOUTME: Subscriptions management page.
// ABOUTME: Subscribe to YouTube channels, podcast feeds, or blog feeds and trigger manual checks.

"use client";

import { useState } from "react";
import { Loader2, Trash2, RefreshCw, Pencil, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptions } from "@/hooks/use-subscriptions";

interface Subscription {
  id: number;
  sourceType: string;
  name: string;
  extractionHints: string;
  lastCheckedAt: string | null;
}

function SubscriptionCard({
  sub,
  formatLastChecked,
  onDelete,
  onSaveHints,
}: {
  sub: Subscription;
  formatLastChecked: (d: string | null) => string;
  onDelete: (id: number) => void;
  onSaveHints: (id: number, hints: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hints, setHints] = useState(sub.extractionHints);

  function handleSave() {
    onSaveHints(sub.id, hints);
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
            title="Extraction hints"
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
            placeholder="Extraction hints for this channel (e.g., 'Include step-by-step instructions and tool configurations')"
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            rows={2}
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
      {!editing && sub.extractionHints && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{sub.extractionHints}</p>
        </CardContent>
      )}
    </Card>
  );
}

export default function SubscriptionsPage() {
  const { data: subscriptions, mutate } = useSubscriptions();
  const [url, setUrl] = useState("");
  const [subHints, setSubHints] = useState("");
  const [showSubHints, setShowSubHints] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [maxItems, setMaxItems] = useState("15");
  const [checkResult, setCheckResult] = useState("");
  const [error, setError] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setSubscribing(true);
    setError("");

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url.trim(),
        ...(subHints.trim() ? { extractionHints: subHints.trim() } : {}),
        ...(parseInt(maxItems, 10) !== 15 ? { maxItems: parseInt(maxItems, 10) } : {}),
      }),
    });

    if (res.ok) {
      setUrl("");
      setSubHints("");
      setShowSubHints(false);
      setMaxItems("15");
      mutate();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to subscribe");
    }
    setSubscribing(false);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    mutate();
  }

  async function handleSaveHints(id: number, hints: string) {
    await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractionHints: hints }),
    });
    mutate();
  }

  async function handleCheckNow() {
    setChecking(true);
    setCheckResult("");
    try {
      const res = await fetch("/api/subscriptions/check", {
        method: "POST",
      });
      const data = await res.json();
      if (data.ingested > 0) {
        setCheckResult(`Found ${data.ingested} new item${data.ingested === 1 ? "" : "s"}`);
      } else if (data.checked > 0) {
        setCheckResult("No new content found");
      } else {
        setCheckResult("All subscriptions are up to date");
      }
    } catch {
      setCheckResult("Check failed — see console for details");
    }
    setChecking(false);
    mutate();
  }

  function formatLastChecked(lastCheckedAt: string | null): string {
    if (!lastCheckedAt) return "Never checked";
    const date = new Date(lastCheckedAt);
    return `Checked ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  const hasSubs = subscriptions && subscriptions.length > 0;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <form onSubmit={handleSubscribe} className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="YouTube channel, podcast, or blog RSS feed URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={subscribing}
          />
          <Button
            type="button"
            variant={showSubHints ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowSubHints(!showSubHints)}
            title="Extraction hints"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)}
              className="w-16 h-9 text-sm text-center"
              title="Number of items to import"
            />
          </div>
          <Button type="submit" disabled={!url.trim() || subscribing}>
            {subscribing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Subscribe
          </Button>
        </div>
        {showSubHints && (
          <Textarea
            placeholder="Extraction hints for this channel (e.g., 'Include step-by-step instructions and tool configurations')"
            value={subHints}
            onChange={(e) => setSubHints(e.target.value)}
            rows={2}
            className="text-sm"
          />
        )}
      </form>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {hasSubs && (
        <div className="flex items-center justify-end gap-3">
          {checkResult && (
            <p className="text-sm text-muted-foreground">{checkResult}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckNow}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Check Now
          </Button>
        </div>
      )}

      {hasSubs ? (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              formatLastChecked={formatLastChecked}
              onDelete={handleDelete}
              onSaveHints={handleSaveHints}
            />
          ))}
        </div>
      ) : subscriptions ? (
        <p className="text-center text-muted-foreground py-12">
          No subscriptions yet. Paste a YouTube channel, podcast, or blog feed URL above to subscribe.
        </p>
      ) : null}
    </div>
  );
}
