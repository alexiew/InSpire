// ABOUTME: Extracts structured knowledge from a transcript via Claude CLI.
// ABOUTME: Produces a summary, topics, claims, and people from content.

import { callClaude } from "./claude";

export interface ExtractionResult {
  summary: string;
  topics: string[];
  claims: string[];
  people: string[];
}

const EXTRACTION_PROMPT = `Analyze this transcript titled "{title}".

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
- **topics**: 3-5 topic tags. Use meaningful categories like "longevity", "vitamin D", "neuroplasticity", "intermittent fasting" — specific enough to search and organize by, broad enough that multiple sources could share them. Avoid overly broad tags like "health" or "science".
- **claims**: 3-7 core claims made in the content, each as a single clear sentence.
- **people**: Key people mentioned, interviewed, or presenting.

The JSON block MUST be the last thing in your output.

Transcript:
{transcript}`;

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

export async function extract(
  title: string,
  transcript: string
): Promise<ExtractionResult> {
  const prompt = EXTRACTION_PROMPT
    .replace("{title}", title)
    .replace("{transcript}", transcript);

  const raw = await callClaude(prompt);
  return parseExtraction(raw);
}
