// ABOUTME: QVC detail page showing pipeline stages for a product opportunity.
// ABOUTME: Advance through research, angle, strategy, and brief stages with AI assistance.

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ChevronRight, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EditableTitle } from "@/components/content/editable-title";
import { useQvcItem } from "@/hooks/use-qvc";

const STAGES = [
  { key: "seed", label: "Seed", field: "seedText" },
  { key: "research", label: "Research", field: "research" },
  { key: "angle", label: "Angle", field: "angle" },
  { key: "strategy", label: "Strategy", field: "strategy" },
  { key: "brief", label: "Brief", field: "brief" },
] as const;

function nextStageLabel(item: { status: string; angle: string; strategy: string; brief: string }): string | null {
  if (item.status === "seed") return "Research";
  if (item.status === "researching" && !item.angle) return "Angle";
  if (item.status === "drafting" && !item.strategy) return "Strategy";
  if (item.status === "drafting" && !item.brief) return "Brief";
  return null;
}

function StageCard({
  label,
  content,
  itemId,
  field,
  onUpdated,
}: {
  label: string;
  content: string;
  itemId: number;
  field: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content);

  async function handleSave() {
    setEditing(false);
    if (value === content) return;
    await fetch(`/api/qvc/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdated();
  }

  if (!content && !editing) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            if (editing) {
              handleSave();
            } else {
              setValue(content);
              setEditing(true);
            }
          }}
        >
          {editing ? (
            <><Check className="h-3 w-3 mr-1" />Save</>
          ) : (
            <><Pencil className="h-3 w-3 mr-1" />Edit</>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={12}
            className="text-sm font-mono"
          />
        ) : (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function QvcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: item, mutate } = useQvcItem(Number(id));
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState("");

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  async function handleAdvance() {
    setAdvancing(true);
    setError("");
    try {
      const res = await fetch(`/api/qvc/${id}/advance`, { method: "POST" });
      if (res.ok) {
        mutate();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to advance");
      }
    } catch {
      setError("Failed to advance");
    } finally {
      setAdvancing(false);
    }
  }

  const next = nextStageLabel(item);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/qvc")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          QVC
        </Button>
        <h1 className="text-2xl font-bold flex-1">
          <EditableTitle
            contentId={String(item.id)}
            title={item.title}
            fallback={item.seedText.slice(0, 60) + "..."}
            onUpdated={() => mutate()}
            apiEndpoint={`/api/qvc/${item.id}`}
          />
        </h1>
      </div>

      {/* Stage progress indicator */}
      <div className="flex items-center gap-1 text-xs">
        {STAGES.map((stage, i) => {
          const value = item[stage.field as keyof typeof item] as string;
          const isCurrent = !value && i > 0 &&
            (item[STAGES[i - 1].field as keyof typeof item] as string) !== "";
          const isDone = value !== "";
          const isSeed = i === 0;

          return (
            <div key={stage.key} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span
                className={`px-2 py-0.5 rounded-full ${
                  isDone || isSeed
                    ? "bg-primary/10 text-primary font-medium"
                    : isCurrent
                      ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-medium"
                      : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stage content cards */}
      {STAGES.map((stage) => (
        <StageCard
          key={stage.key}
          label={stage.label}
          content={item[stage.field as keyof typeof item] as string}
          itemId={item.id}
          field={stage.field}
          onUpdated={() => mutate()}
        />
      ))}

      {/* Advance button */}
      {next && (
        <div className="flex items-center gap-3">
          <Button onClick={handleAdvance} disabled={advancing}>
            {advancing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating {next}...</>
            ) : (
              <>Generate {next}</>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
