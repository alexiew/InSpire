// ABOUTME: Generates cross-content synthesis for a topic via Claude CLI.
// ABOUTME: Analyzes summaries and claims across content items to produce deep insights.

import { callClaude } from "./claude";
import { getContent } from "./content";
import { getTopic, updateTopicSynthesis } from "./topics";

export interface SynthesisInput {
  title: string;
  author: string;
  summary: string;
  claims: string[];
}

export function buildSynthesisPrompt(topicName: string, items: SynthesisInput[]): string {
  const sections: string[] = [];

  for (const item of items) {
    const parts: string[] = [`### ${item.title} (by ${item.author})`];

    parts.push(`**Summary:** ${item.summary}`);

    if (item.claims.length > 0) {
      parts.push("**Key claims:**");
      parts.push(...item.claims.map((c) => `  - ${c}`));
    }

    sections.push(parts.join("\n"));
  }

  return `You are a research analyst synthesizing ${items.length} pieces of content about "${topicName}".

For each source, here is the summary and extracted claims:

${sections.join("\n\n")}

Produce a thorough synthesis that covers:
- **Agreements**: Where do these sources converge? What consensus emerges?
- **Disagreements**: Where do they conflict or present contradictory information? Be specific about who says what.
- **Unique insights**: What distinctive contribution does each source make that others don't cover?
- **Deeper patterns**: What underlying themes, trends, or connections emerge when viewing these sources together?
- **Open questions**: What important questions remain unanswered across all sources?

Be specific and substantive. Reference source titles when attributing claims. Draw out non-obvious connections and implications rather than just restating what each source says.`;
}

export async function synthesizeTopic(slug: string): Promise<string> {
  const topic = getTopic(slug);
  if (!topic) {
    throw new Error(`Topic "${slug}" not found`);
  }

  if (topic.contentIds.length < 2) {
    throw new Error("Need at least 2 content items to synthesize");
  }

  const items: SynthesisInput[] = [];
  for (const id of topic.contentIds) {
    const item = getContent(id);
    if (!item) continue;
    items.push({
      title: item.title,
      author: item.author,
      summary: item.summary,
      claims: item.claims,
    });
  }

  const prompt = buildSynthesisPrompt(topic.name, items);
  const synthesis = await callClaude(prompt);
  updateTopicSynthesis(slug, synthesis);
  return synthesis;
}
