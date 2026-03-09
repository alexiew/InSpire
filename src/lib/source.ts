// ABOUTME: Source attribution for AI-generated synthesis text.
// ABOUTME: Identifies which content items a selected passage draws from.

import { getContent, listLibrary } from "./content";

const MAX_CANDIDATES = 15;

export interface SourceCandidate {
  id: string;
  title: string;
  author: string;
  summary: string;
  claims: string[];
}

export function loadSourceCandidates(contentIds: string[], searchText?: string): SourceCandidate[] {
  const idSet = new Set(contentIds);

  // Use FTS to find the most relevant items for the selected text
  if (searchText) {
    const words = searchText.match(/[a-zA-Z0-9]+/g)?.filter((w) => w.length >= 3) ?? [];
    if (words.length > 0) {
      const query = words.slice(0, 10).join(" OR ");
      try {
        const results = listLibrary(query)
          .filter((c) => idSet.has(c.id))
          .slice(0, MAX_CANDIDATES);
        if (results.length > 0) {
          return results.map((c) => ({
            id: c.id,
            title: c.title,
            author: c.author,
            summary: c.summary,
            claims: c.claims,
          }));
        }
      } catch {
        // FTS query syntax error — fall through to loading by ID
      }
    }
  }

  // Fallback: load by ID, capped
  const candidates: SourceCandidate[] = [];
  for (const id of contentIds) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const item = getContent(id);
    if (!item) continue;
    candidates.push({
      id: item.id,
      title: item.title,
      author: item.author,
      summary: item.summary,
      claims: item.claims,
    });
  }
  return candidates;
}

export function buildSourcePrompt(text: string, candidates: SourceCandidate[]): string {
  const sections: string[] = [];

  sections.push(
    `The user selected the following text from an AI-generated synthesis and wants to know which source(s) it comes from:\n\n"${text.trim()}"`
  );

  const items = candidates.map((c) => {
    const parts = [`### [${c.id}] ${c.title} (by ${c.author})`, `**Summary:** ${c.summary}`];
    if (c.claims.length > 0) {
      parts.push("**Claims:** " + c.claims.join("; "));
    }
    return parts.join("\n");
  });
  sections.push(`SOURCE CONTENT:\n${items.join("\n\n")}`);

  sections.push(`Identify which content item(s) the selected text most likely draws from. Consider both direct references and paraphrased ideas.

Respond with ONLY a JSON array of objects, each with:
- "id": the content item ID (from the brackets)
- "title": the content item title
- "reason": one sentence explaining how this source relates to the selected text

Example: [{"id": "abc123", "title": "Some Title", "reason": "The selected text paraphrases this source's claim about X."}]

If no source clearly matches, return an empty array: []`);

  return sections.join("\n\n");
}
