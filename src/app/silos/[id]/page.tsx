// ABOUTME: Silo detail page showing content items and cross-content synthesis.
// ABOUTME: Submit URLs, accept/discard content, and generate synthesis within an isolated research container.

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/content/status-badge";
import { UrlForm } from "@/components/content/url-form";
import { useSilo } from "@/hooks/use-silos";
import Link from "next/link";

export default function SiloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: silo, mutate } = useSilo(Number(id));
  const router = useRouter();
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState("");

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

  async function handleSynthesize() {
    setSynthesizing(true);
    setSynthError("");
    const res = await fetch(`/api/silos/${id}/synthesize`, { method: "POST" });
    if (res.ok) {
      mutate();
    } else {
      const data = await res.json();
      setSynthError(data.error || "Synthesis failed");
    }
    setSynthesizing(false);
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

      {processing.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Processing</h2>
          {processing.map((item) => (
            <Card key={item.id} className="animate-pulse">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{item.title || "Processing..."}</CardTitle>
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
                  <CardTitle className="text-sm">{item.title || item.url}</CardTitle>
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
          {ready.map((item) => (
            <Card key={item.id}>
              <CardHeader className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/content/${item.id}`} className="flex-1 min-w-0">
                    <CardTitle className="text-sm">{item.title}</CardTitle>
                    {item.author && <CardDescription>{item.author}</CardDescription>}
                  </Link>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" onClick={() => handleStatusChange(item.id, "accepted")}>
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, "discarded")}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {item.summary && (
                <CardContent className="pt-0 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
                  {item.topics.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Topics: {item.topics.join(", ")}
                    </p>
                  )}
                  {item.people.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      People: {item.people.join(", ")}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Accepted ({accepted.length})
          </h2>
          {accepted.map((item) => (
            <Card key={item.id} className="bg-muted/30">
              <CardHeader className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/content/${item.id}`} className="flex-1 min-w-0">
                    <CardTitle className="text-sm">{item.title}</CardTitle>
                    {item.author && <CardDescription>{item.author}</CardDescription>}
                  </Link>
                  <StatusBadge status={item.status} />
                </div>
              </CardHeader>
              {(item.topics.length > 0 || item.people.length > 0) && (
                <CardContent className="pt-0 pb-3">
                  {item.topics.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Topics: {item.topics.join(", ")}
                    </p>
                  )}
                  {item.people.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      People: {item.people.join(", ")}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {silo.items.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No content yet. Submit a URL above to start building this silo.
        </p>
      )}

      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Synthesis</h2>
          <Button
            onClick={handleSynthesize}
            disabled={synthesizing || accepted.length === 0}
          >
            {synthesizing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {synthesizing ? "Synthesizing..." : silo.synthesis ? "Regenerate" : "Synthesize"}
          </Button>
        </div>
        {synthError && <p className="text-sm text-destructive">{synthError}</p>}
        {accepted.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Accept at least one content item to enable synthesis.
          </p>
        )}
        {silo.synthesis && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {silo.synthesis}
          </div>
        )}
      </div>
    </div>
  );
}
