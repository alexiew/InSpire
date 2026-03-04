// ABOUTME: Tests for people data layer.
// ABOUTME: Verifies listing and retrieval of people across content items.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { closeDb } from "@/lib/db";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-test-"));
  process.env.INSPIRE_DATA_DIR = tmpDir;
});

afterEach(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
});

async function loadModules() {
  const content = await import("@/lib/content");
  const people = await import("@/lib/people");
  return { ...content, ...people };
}

describe("listPeople", () => {
  it("returns empty array when no content exists", async () => {
    const { listPeople } = await loadModules();
    expect(listPeople()).toEqual([]);
  });

  it("returns people sorted by content count descending", async () => {
    const { createContent, updateContent, listPeople } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, {
      people: ["Andrew Huberman", "Anna Lembke"],
      status: "accepted",
    });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, {
      people: ["Andrew Huberman", "David Goggins"],
      status: "accepted",
    });

    const people = listPeople();
    expect(people).toHaveLength(3);
    expect(people[0].name).toBe("Andrew Huberman");
    expect(people[0].contentIds).toHaveLength(2);
    expect(people[0].slug).toBe("andrew-huberman");
  });

  it("excludes content items that are not ready", async () => {
    const { createContent, updateContent, listPeople } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, {
      people: ["Andrew Huberman"],
      status: "accepted",
    });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, {
      people: ["Andrew Huberman", "David Goggins"],
      status: "processing",
    });

    const people = listPeople();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe("Andrew Huberman");
    expect(people[0].contentIds).toHaveLength(1);
  });
});

describe("getPerson", () => {
  it("returns a person by slug with content IDs", async () => {
    const { createContent, updateContent, getPerson } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, {
      people: ["Dr. Anna Lembke"],
      status: "accepted",
    });

    const person = getPerson("dr-anna-lembke");
    expect(person).toBeDefined();
    expect(person!.name).toBe("Dr. Anna Lembke");
    expect(person!.contentIds).toContain(c1.id);
  });

  it("returns undefined for nonexistent slug", async () => {
    const { getPerson } = await loadModules();
    expect(getPerson("nonexistent")).toBeUndefined();
  });
});

describe("getPeopleGraph", () => {
  it("returns nodes for people with accepted content", async () => {
    const { createContent, updateContent, getPeopleGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { people: ["Alice", "Bob"], status: "accepted" });

    const graph = getPeopleGraph();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.map((n) => n.name).sort()).toEqual(["Alice", "Bob"]);
    expect(graph.nodes[0].contentCount).toBe(1);
  });

  it("returns edges for people sharing content", async () => {
    const { createContent, updateContent, getPeopleGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { people: ["Alice", "Bob"], status: "accepted" });

    const graph = getPeopleGraph();
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].weight).toBe(1);
  });

  it("edge weight reflects number of shared items", async () => {
    const { createContent, updateContent, getPeopleGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { people: ["Alice", "Bob"], status: "accepted" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { people: ["Alice", "Bob"], status: "accepted" });

    const graph = getPeopleGraph();
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].weight).toBe(2);
  });

  it("excludes people with only non-accepted content", async () => {
    const { createContent, updateContent, getPeopleGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { people: ["Alice"], status: "accepted" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { people: ["Alice", "Charlie"], status: "ready" });

    const graph = getPeopleGraph();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].name).toBe("Alice");
    expect(graph.edges).toHaveLength(0);
  });
});
