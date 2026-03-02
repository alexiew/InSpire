// ABOUTME: Subscriptions management page.
// ABOUTME: Subscribe to YouTube channels, view subscriptions, and trigger manual checks.

"use client";

import { useState } from "react";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptions } from "@/hooks/use-subscriptions";

export default function SubscriptionsPage() {
  const { data: subscriptions, mutate } = useSubscriptions();
  const [url, setUrl] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setSubscribing(true);
    setError("");

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (res.ok) {
      setUrl("");
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

  async function handleCheckNow() {
    setChecking(true);
    await fetch("/api/subscriptions/check", { method: "POST" });
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
      <form onSubmit={handleSubscribe} className="flex gap-2">
        <Input
          placeholder="YouTube channel or podcast RSS feed URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
          disabled={subscribing}
        />
        <Button type="submit" disabled={!url.trim() || subscribing}>
          {subscribing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Subscribe
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {hasSubs && (
        <div className="flex justify-end">
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
            <Card key={sub.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{sub.name}</CardTitle>
                  <CardDescription>
                    {sub.sourceType === "podcast" ? "Podcast" : "YouTube"} · {formatLastChecked(sub.lastCheckedAt)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(sub.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : subscriptions ? (
        <p className="text-center text-muted-foreground py-12">
          No subscriptions yet. Paste a YouTube channel or podcast feed URL above to subscribe.
        </p>
      ) : null}
    </div>
  );
}
