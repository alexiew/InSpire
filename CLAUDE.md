# InSpire

Personal knowledge distillery. Topics are the primary organizing principle — YouTube videos are inputs, not the structure. Content gets extracted into topics, claims, and people, then synthesized across sources.

## Launching

```bash
cd /Users/alex/2026/claude/projects/inspire
npm run dev
```

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SWR
- SQLite storage via better-sqlite3 (`data/inspire.db`)
- YouTube transcript extraction via `summarize` CLI (`@steipete/summarize`)
- AI extraction and synthesis via `claude --print` CLI (uses Max plan, no API costs)
- Vitest for testing

## Architecture

- **Database** (`src/lib/db.ts`): SQLite connection management, schema init, `closeDb()` for test isolation
- **ContentItem** (`src/lib/content.ts`): Core data model with summary, topics[], claims[], people[]
- **Extraction** (`src/lib/extract.ts`): Claude produces markdown summary + JSON metadata block
- **Topics** (`src/lib/topics.ts`): Topic CRUD with JOIN queries; content_topics join table maintains index at write time
- **Synthesis** (`src/lib/synthesize.ts`): Cross-content analysis per topic (agreements, contradictions, unique insights)
- **Processing pipeline** (`src/lib/process-content.ts`): fetchMetadata → fetchTranscript → extract → save
- **Subscriptions** (`src/lib/subscriptions.ts`): YouTube channel subscriptions with auto-check via Recent API poll

## Content Lifecycle

`processing` → `ready` → `accepted` | `discarded` | `error`

- **ready**: processed, visible in Recent, NOT in topics/people/synthesis
- **accepted**: in the knowledge base, still visible in Recent (if within newest 9)
- **discarded**: hidden from everywhere

## Key Routes

- `GET/POST /api/content` — list and submit content
- `GET/PATCH/DELETE /api/content/[id]` — single content item; PATCH accepts `{ topics, status }`
- `GET /api/recent` — newest 9 non-discarded items
- `GET /api/topics` — all topics
- `GET /api/topics/[slug]` — topic with content items
- `POST /api/topics/[slug]/synthesize` — generate cross-content synthesis
- `POST /api/topics/merge` — merge multiple topics into one
- `GET /api/people` — all people
- `GET /api/people/[slug]` — person with content items
- `GET/POST /api/subscriptions` — list and add channel subscriptions
- `DELETE /api/subscriptions/[id]` — remove subscription
- `POST /api/subscriptions/check` — manually trigger feed checks

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

Tests use `INSPIRE_DATA_DIR` env var + `closeDb()` for SQLite isolation.
