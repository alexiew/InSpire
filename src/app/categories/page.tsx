// ABOUTME: Topic network graph showing how topics relate through shared content.
// ABOUTME: Force-directed layout where connected topics cluster naturally.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { TopicGraph } from "@/lib/topics";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TopicMapPage() {
  const { data } = useSWR<TopicGraph>("/api/topics/graph", fetcher);
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
      if (node.slug) router.push(`/topics/${node.slug}`);
    },
    [router]
  );

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          No topics with content yet. Add content to see the topic map.
        </p>
      </div>
    );
  }

  const graphData = {
    nodes: data.nodes.map((n) => ({ ...n, id: n.slug })),
    links: data.edges.map((e) => ({ ...e })),
  };

  const maxCount = Math.max(...data.nodes.map((n) => n.contentCount));
  const maxWeight = Math.max(...data.edges.map((e) => e.weight), 1);

  return (
    <div ref={containerRef} className="h-full w-full">
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
        nodeColor={() => "hsl(221, 83%, 53%)"}
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
