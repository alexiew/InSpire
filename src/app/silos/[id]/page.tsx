// ABOUTME: Silo detail page showing content items and cross-content synthesis.
// ABOUTME: Submit URLs, accept/discard content, and generate synthesis within an isolated research container.

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, FileSearch, RefreshCw, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentCard } from "@/components/content/content-card";
import { StatusBadge } from "@/components/content/status-badge";
import { EditableTitle } from "@/components/content/editable-title";
import { SynthesisSection } from "@/components/topics/synthesis-section";
import { UrlForm } from "@/components/content/url-form";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { useSilo } from "@/hooks/use-silos";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import Link from "next/link";

interface SourceResult {
  id: string;
  title: string;
  reason: string;
}

export default function SiloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const siloId = Number(id);
  const { data: silo, mutate } = useSilo(siloId);
  const { data: subscriptions, mutate: mutateSubs } = useSubscriptions(siloId);
  const router = useRouter();
  const [sourceResult, setSourceResult] = useState<{ text: string; sources: SourceResult[] } | null>(null);
  const [findingSource, setFindingSource] = useState(false);
  const [subUrl, setSubUrl] = useState("");
  const [subHints, setSubHints] = useState("");
  const [showSubHints, setShowSubHints] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subError, setSubError] = useState("");
  const [maxItems, setMaxItems] = useState("15");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState("");

  if (!silo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  async function handleStatusChange(contentId: string, status: "accepted" | "discarded") {
    await fetch(`/api/content/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate();
  }

  async function handleSource(text: string) {
    setFindingSource(true);
    setSourceResult(null);
    const contentIds = silo!.items.filter((i) => i.status === "accepted").map((i) => i.id);

    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, contentIds }),
      });
      const json = await res.json();
      if (res.ok) {
        setSourceResult({ text, sources: json.sources });
      }
    } catch {
      // silently fail
    } finally {
      setFindingSource(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!subUrl.trim()) return;
    setSubscribing(true);
    setSubError("");
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: subUrl.trim(),
        siloId,
        ...(subHints.trim() ? { extractionHints: subHints.trim() } : {}),
        ...(parseInt(maxItems, 10) !== 15 ? { maxItems: parseInt(maxItems, 10) } : {}),
      }),
    });
    if (res.ok) {
      setSubUrl("");
      setSubHints("");
      setShowSubHints(false);
      setMaxItems("15");
      mutateSubs();
      mutate();
    } else {
      const data = await res.json();
      setSubError(data.error || "Failed to subscribe");
    }
    setSubscribing(false);
  }

  async function handleDeleteSub(subId: number) {
    await fetch(`/api/subscriptions/${subId}`, { method: "DELETE" });
    mutateSubs();
  }

  async function handleSaveSub(subId: number, updates: { extractionHints: string; excludeTerms: string }) {
    await fetch(`/api/subscriptions/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutateSubs();
  }

  async function handleCheckSubs() {
    setChecking(true);
    setCheckResult("");
    try {
      const res = await fetch("/api/subscriptions/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siloId }),
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
      setCheckResult("Check failed");
    }
    setChecking(false);
    mutateSubs();
    mutate();
  }

  const processing = silo.items.filter((i) => i.status === "processing");
  const ready = silo.items.filter((i) => i.status === "ready");
  const accepted = silo.items.filter((i) => i.status === "accepted");
  const errored = silo.items.filter((i) => i.status === "error");

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/silos")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Silos
        </Button>
        <h1 className="text-2xl font-bold">{silo.name}</h1>
      </div>

      <UrlForm
        onSubmitted={() => mutate()}
        apiEndpoint={`/api/silos/${id}`}
      />

      <div className="border-t pt-6 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Subscriptions</h2>
        <form onSubmit={handleSubscribe} className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="YouTube channel, podcast, or blog RSS feed URL"
              value={subUrl}
              onChange={(e) => setSubUrl(e.target.value)}
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
            <Input
              type="number"
              min={1}
              value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)}
              className="w-16 h-9 text-sm text-center"
              title="Number of items to import"
            />
            <Button type="submit" disabled={!subUrl.trim() || subscribing}>
              {subscribing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Subscribe
            </Button>
          </div>
          {showSubHints && (
            <Textarea
              placeholder="Extraction hints for this channel"
              value={subHints}
              onChange={(e) => setSubHints(e.target.value)}
              rows={2}
              className="text-sm"
            />
          )}
        </form>
        {subError && <p className="text-sm text-destructive">{subError}</p>}
        {subscriptions && subscriptions.length > 0 && (
          <>
            <div className="flex items-center justify-end gap-3">
              {checkResult && (
                <p className="text-sm text-muted-foreground">{checkResult}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckSubs}
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
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  onDelete={handleDeleteSub}
                  onSave={handleSaveSub}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {processing.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Processing</h2>
          {processing.map((item) => (
            <Card key={item.id} className="animate-pulse">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">
                  <EditableTitle
                    contentId={item.id}
                    title={item.title}
                    fallback={item.url || "Processing..."}
                    onUpdated={() => mutate()}
                  />
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {errored.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-destructive">Errors</h2>
          {errored.map((item) => (
            <Card key={item.id} className="border-destructive/30">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    <EditableTitle
                      contentId={item.id}
                      title={item.title}
                      fallback={item.url}
                      onUpdated={() => mutate()}
                    />
                  </CardTitle>
                  <StatusBadge status={item.status} />
                </div>
                {item.error && (
                  <CardDescription className="text-destructive">{item.error}</CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {ready.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Ready for Review</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {ready.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onAccept={() => handleStatusChange(item.id, "accepted")}
                onDiscard={() => handleStatusChange(item.id, "discarded")}
              />
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Accepted ({accepted.length})
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {accepted.map((item) => (
              <ContentCard key={item.id} item={item} showStatus={false} />
            ))}
          </div>
        </div>
      )}

      {silo.items.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No content yet. Submit a URL above to start building this silo.
        </p>
      )}

      <div className="border-t pt-6 space-y-4">
        <SynthesisSection
          synthesizeUrl={`/api/silos/${id}/synthesize`}
          name={silo.name}
          sourceLabel="silo-synthesis"
          synthesis={silo.synthesis}
          synthesizedAt={silo.synthesizedAt}
          synthesisHistory={silo.synthesisHistory ?? []}
          itemCount={accepted.length}
          minItems={1}
          onSynthesized={() => mutate()}
          showSource
          onSource={handleSource}
        />

        {findingSource && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <p className="text-sm text-muted-foreground animate-pulse">
              <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
              Finding source...
            </p>
          </Card>
        )}

        {sourceResult && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <p className="text-xs font-medium text-primary">
                  <FileSearch className="inline h-3 w-3 mr-1" />
                  Source for: &ldquo;{sourceResult.text.slice(0, 100)}{sourceResult.text.length > 100 ? "..." : ""}&rdquo;
                </p>
                {sourceResult.sources.length > 0 ? (
                  <ul className="space-y-2">
                    {sourceResult.sources.map((s) => (
                      <li key={s.id} className="text-sm">
                        <Link href={`/content/${s.id}`} className="font-medium text-primary hover:underline">
                          {s.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{s.reason}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific source identified for this passage.</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => setSourceResult(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
