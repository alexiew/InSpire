// ABOUTME: Network graph showing how topics or people relate through shared content.
// ABOUTME: Force-directed layout with Topics/People toggle.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import type { TopicGraph } from "@/lib/topics";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ViewMode = "topics" | "people";

export default function MapPage() {
  const [view, setView] = useState<ViewMode>("topics");
  const { data } = useSWR<TopicGraph>(
    view === "topics" ? "/api/topics/graph" : "/api/people/graph",
    fetcher
  );
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback(
    (node: any) => {
      if (node.slug) {
        router.push(view === "topics" ? `/topics/${node.slug}` : `/people/${node.slug}`);
      }
    },
    [router, view]
  );

  const toggle = (
    <div className="absolute top-3 left-3 z-10 flex gap-1 bg-background/80 backdrop-blur rounded-md border p-1">
      <Button
        size="sm"
        variant={view === "topics" ? "default" : "ghost"}
        className="h-7 text-xs"
        onClick={() => setView("topics")}
      >
        Topics
      </Button>
      <Button
        size="sm"
        variant={view === "people" ? "default" : "ghost"}
        className="h-7 text-xs"
        onClick={() => setView("people")}
      >
        People
      </Button>
    </div>
  );

  if (!data) {
    return (
      <div className="relative h-full w-full">
        {toggle}
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="relative h-full w-full">
        {toggle}
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            No {view} with content yet. Add content to see the map.
          </p>
        </div>
      </div>
    );
  }

  const MIN_EDGE_WEIGHT = 2;
  const strongEdges = data.edges.filter((e) => e.weight >= MIN_EDGE_WEIGHT);
  const connectedSlugs = new Set(strongEdges.flatMap((e) => [e.source, e.target]));
  const visibleNodes = data.nodes.filter((n) => connectedSlugs.has(n.slug));

  const graphData = {
    nodes: visibleNodes.map((n) => ({ ...n, id: n.slug })),
    links: strongEdges.map((e) => ({ ...e })),
  };

  const maxCount = Math.max(...visibleNodes.map((n) => n.contentCount), 1);
  const maxWeight = Math.max(...strongEdges.map((e) => e.weight), 1);
  const nodeColor = view === "topics" ? "hsl(221, 83%, 53%)" : "hsl(262, 83%, 58%)";

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {toggle}
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeId="id"
        nodeVal={(node: any) => 2 + (node.contentCount / maxCount) * 8}
        nodeLabel={(node: any) =>
          `${node.name} (${node.contentCount} items)`
        }
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const fontSize = Math.max(12 / globalScale, 2);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#888";
          ctx.fillText(node.name, node.x ?? 0, (node.y ?? 0) + 6);
        }}
        nodeColor={() => nodeColor}
        linkWidth={(link: any) =>
          1 + ((link.weight ?? 1) / maxWeight) * 4
        }
        linkColor={() => "hsla(221, 30%, 50%, 0.3)"}
        onNodeClick={handleNodeClick}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
