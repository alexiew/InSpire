# InSpire

Personal knowledge distillery. Topics are the primary organizing principle — YouTube videos are inputs, not the structure. Content gets extracted into topics, claims, and people, then synthesized across sources.

## Launching

```bash
cd /Users/alex/2026/claude/projects/inspire
npm run dev
```

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SWR
- File-based JSON storage (`data/content.json`, `data/topics.json`)
- YouTube transcript extraction via `summarize` CLI (`@steipete/summarize`)
- AI extraction and synthesis via `claude --print` CLI (uses Max plan, no API costs)
- Vitest for testing

## Architecture

- **ContentItem** (`src/lib/content.ts`): Core data model with summary, topics[], claims[], people[]
- **Extraction** (`src/lib/extract.ts`): Claude produces markdown summary + JSON metadata block
- **Topics** (`src/lib/topics.ts`): Index derived from content items, rebuilt on content changes
- **Synthesis** (`src/lib/synthesize.ts`): Cross-content analysis per topic (agreements, contradictions, unique insights)
- **Processing pipeline** (`src/lib/process-content.ts`): fetchMetadata → fetchTranscript → extract → save → rebuildTopicIndex

## Key Routes

- `GET/POST /api/content` — list and submit content
- `GET/DELETE /api/content/[id]` — single content item
- `GET /api/topics` — all topics
- `GET /api/topics/[slug]` — topic with content items
- `POST /api/topics/[slug]/synthesize` — generate cross-content synthesis

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

Tests use `INSPIRE_DATA_DIR` env var for file isolation.
