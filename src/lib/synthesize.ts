// ABOUTME: Generates cross-content synthesis for a topic via Claude CLI.
// ABOUTME: Compares claims across content items to find agreements and insights.

import { callClaude } from "./claude";
import { getContent } from "./content";
import { getTopic, updateTopicSynthesis } from "./topics";

export async function synthesizeTopic(slug: string): Promise<string> {
  const topic = getTopic(slug);
  if (!topic) {
    throw new Error(`Topic "${slug}" not found`);
  }

  if (topic.contentIds.length < 2) {
    throw new Error("Need at least 2 content items to synthesize");
  }

  const sections: string[] = [];
  for (const id of topic.contentIds) {
    const item = getContent(id);
    if (!item) continue;

    const claims = item.claims.length > 0
      ? item.claims.map((c) => `  - ${c}`).join("\n")
      : "  (no claims extracted)";

    sections.push(`### ${item.title} (by ${item.author})\n${claims}`);
  }

  const prompt = `You are analyzing ${topic.contentIds.length} pieces of content about "${topic.name}".

For each source, here are the core claims:

${sections.join("\n\n")}

Produce a synthesis that covers:
- **Agreements**: Where do these sources agree?
- **Disagreements**: Where do they disagree or present conflicting information?
- **Unique insights**: What unique contribution does each source make?
- **Open questions**: What questions remain unanswered across all sources?

Be concise and specific. Reference the source titles when attributing claims.`;

  const synthesis = await callClaude(prompt);
  updateTopicSynthesis(slug, synthesis);
  return synthesis;
}
