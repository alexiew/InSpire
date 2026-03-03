// ABOUTME: Extracts structured knowledge from a transcript via Claude CLI.
// ABOUTME: Produces a summary, topics, claims, and people from content.

import { callClaude } from "./claude";

export interface ExtractionResult {
  summary: string;
  topics: string[];
  claims: string[];
  people: string[];
}

export function buildExtractionPrompt(
  title: string,
  transcript: string,
  existingTopics?: string[],
  extractionHints?: string
): string {
  const topicsSection =
    existingTopics && existingTopics.length > 0
      ? `\nThe knowledge base already contains these topics:\n${existingTopics.join(", ")}\n\nWhen assigning topics, REUSE existing topics from this list wherever they fit.\nOnly create a new topic if the content genuinely doesn't match any existing topic.\n`
      : "";

  const hintsSection =
    extractionHints
      ? `\nAdditional instructions for this content:\n${extractionHints}\n`
      : "";

  return `Analyze this transcript titled "${title}".

Produce TWO things:

1. A readable markdown summary covering key points, main arguments, and notable insights. Be concise but comprehensive.

2. A fenced JSON metadata block at the very end with exactly this structure:
\`\`\`json
{
  "topics": ["topic1", "topic2", ...],
  "claims": ["claim1", "claim2", ...],
  "people": ["person1", "person2", ...]
}
\`\`\`

Guidelines for the metadata:
- **topics**: 3-5 topic tags. Use meaningful categories like "longevity", "vitamin D", "neuroplasticity", "intermittent fasting" — specific enough to search and organize by, broad enough that multiple sources could share them. Avoid overly broad tags like "health" or "science". Reuse existing topics where they fit. Only create a new topic if nothing matches.
- **claims**: 3-7 core claims made in the content, each as a single clear sentence.
- **people**: Key people mentioned, interviewed, or presenting.
${topicsSection}${hintsSection}
The JSON block MUST be the last thing in your output.

Transcript:
${transcript}`;
}

export function parseExtraction(raw: string): ExtractionResult {
  // Find the last fenced code block (``` or ```json)
  const fencePattern = /```(?:json)?\s*\n([\s\S]*?)```/g;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(raw)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) {
    return {
      summary: raw.trim(),
      topics: [],
      claims: [],
      people: [],
    };
  }

  const jsonStr = lastMatch[1].trim();
  const summary = raw.slice(0, lastMatch.index).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      summary,
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
    };
  } catch {
    return {
      summary,
      topics: [],
      claims: [],
      people: [],
    };
  }
}

export function filterAuthor(people: string[], author: string): string[] {
  if (!author) return people;
  const authorLower = author.toLowerCase();
  return people.filter((p) => {
    const personLower = p.toLowerCase();
    // Exact match
    if (personLower === authorLower) return false;
    // Person's name appears in author (e.g., "Huberman" in "Huberman Lab")
    // or author appears in person (e.g., "Andrew Huberman" in "Dr. Andrew Huberman")
    // Check individual words (2+ chars) from the person's name against the author
    const personWords = personLower.split(/\s+/).filter((w) => w.length >= 2);
    const authorWords = authorLower.split(/\s+/).filter((w) => w.length >= 2);
    const overlap = personWords.filter((w) => authorWords.includes(w));
    // If any significant name word overlaps, consider it a match
    return overlap.length === 0;
  });
}

export async function extract(
  title: string,
  transcript: string,
  existingTopics?: string[],
  extractionHints?: string
): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt(title, transcript, existingTopics, extractionHints);
  const raw = await callClaude(prompt);
  return parseExtraction(raw);
}
