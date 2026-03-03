// ABOUTME: Knowledge-base-grounded explanation for selected briefing text.
// ABOUTME: Searches content via FTS and topic syntheses to build context for Claude.

import { listLibrary } from "./content";
import { listTopics } from "./topics";

export interface ExplainContext {
  matchingContent: { title: string; author: string; summary: string; claims: string[] }[];
  relevantSyntheses: { name: string; synthesis: string }[];
}

const MAX_CONTENT_RESULTS = 5;

export function searchKnowledgeBase(text: string): ExplainContext {
  // Extract search terms: alphanumeric words 3+ chars, skip noise
  const words = text.match(/[a-zA-Z0-9]+/g)?.filter((w) => w.length >= 3) ?? [];

  let matchingContent: ExplainContext["matchingContent"] = [];

  if (words.length > 0) {
    // FTS5 OR query for broad matching
    const query = words.slice(0, 10).join(" OR ");
    try {
      const results = listLibrary(query).slice(0, MAX_CONTENT_RESULTS);
      matchingContent = results.map((c) => ({
        title: c.title,
        author: c.author,
        summary: c.summary,
        claims: c.claims,
      }));
    } catch {
      // FTS query syntax error — fall through with no results
    }
  }

  // Find topics whose names appear in the text
  const lowerText = text.toLowerCase();
  const topics = listTopics();
  const relevantSyntheses = topics
    .filter((t) => t.synthesis && lowerText.includes(t.name.toLowerCase()))
    .map((t) => ({ name: t.name, synthesis: t.synthesis! }));

  return { matchingContent, relevantSyntheses };
}

export function buildExplainPrompt(text: string, context: ExplainContext): string {
  const sections: string[] = [];

  sections.push(
    `The user selected the following text from an intelligence briefing and wants to understand what their knowledge base says about it:\n\n"${text.trim()}"`
  );

  if (context.matchingContent.length > 0) {
    const items = context.matchingContent.map((c) => {
      const parts = [`### ${c.title} (${c.author})`, c.summary];
      if (c.claims.length > 0) {
        parts.push("Claims: " + c.claims.join("; "));
      }
      return parts.join("\n");
    });
    sections.push(`RELEVANT CONTENT FROM KNOWLEDGE BASE:\n${items.join("\n\n")}`);
  }

  if (context.relevantSyntheses.length > 0) {
    const synths = context.relevantSyntheses.map(
      (s) => `### ${s.name}\n${s.synthesis}`
    );
    sections.push(`RELEVANT TOPIC SYNTHESES:\n${synths.join("\n\n")}`);
  }

  if (context.matchingContent.length === 0 && context.relevantSyntheses.length === 0) {
    sections.push(
      "No directly matching content was found in the knowledge base."
    );
  }

  sections.push(`Using the knowledge base content above, explain what it says about the selected text. Cover:
- What the knowledge base contains about this topic
- Key claims and evidence from the sources
- Any areas of agreement or disagreement between sources
- What's NOT covered that might be worth exploring

Cite content by title when possible. Ground your explanation in the specific sources. If the knowledge base has limited information on this topic, say so honestly.

Keep it focused — 2-4 short paragraphs max.`);

  return sections.join("\n\n");
}
