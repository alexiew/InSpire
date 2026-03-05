# InSpire

Personal knowledge distillery. Topics are the primary organizing principle — YouTube videos are inputs, not the structure. Content gets extracted into topics, claims, and people, then synthesized across sources.

## First-Time Setup

When a new user asks for help setting up InSpire, follow these steps in order:

1. **Node.js** — verify with `node --version` (requires 20+). If missing, instruct the user to install from https://nodejs.org
2. **Install dependencies** — run `npm install` in the project root
3. **summarize CLI** — verify with `which summarize`. If missing, install with `npm install -g @steipete/summarize` (requires Node 22+). This tool extracts text from YouTube videos (captions), podcast audio (transcription), and web pages. See https://github.com/steipete/summarize
4. **claude CLI** — verify with `which claude`. The app uses `claude --print` for AI extraction and synthesis.
5. **Verify setup** — run `npm test` to confirm everything works (205+ tests should pass)
6. **Launch** — run `npm run dev` (defaults to port 3000, use `PORT=XXXX npm run dev` if that's taken)

The SQLite database is created automatically on first launch at `data/inspire.db`. No separate database setup required.

## Launching

```bash
npm run dev
```

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SWR
- SQLite storage via better-sqlite3 (`data/inspire.db`)
- Transcript extraction via `summarize` CLI (`@steipete/summarize`) — YouTube captions + podcast audio transcription
- AI extraction and synthesis via `claude --print` CLI
- Vitest for testing

## Architecture

- **Database** (`src/lib/db.ts`): SQLite connection management, schema init, `closeDb()` for test isolation
- **ContentItem** (`src/lib/content.ts`): Core data model with summary, topics[], claims[], people[]
- **Extraction** (`src/lib/extract.ts`): AI produces markdown summary + JSON metadata block
- **Topics** (`src/lib/topics.ts`): Topic CRUD with JOIN queries; content_topics join table maintains index at write time
- **Synthesis** (`src/lib/synthesize.ts`): Cross-content analysis per topic (agreements, contradictions, unique insights)
- **Podcast** (`src/lib/podcast.ts`): Podcast RSS feed parsing and audio transcript extraction
- **Blog** (`src/lib/blog.ts`): Blog RSS/Atom feed parsing and article text extraction
- **Processing pipeline** (`src/lib/process-content.ts`): fetchMetadata → fetchTranscript → extract → save (branches on sourceType for YouTube vs podcast vs blog)
- **Subscriptions** (`src/lib/subscriptions.ts`): YouTube channel, podcast feed, and blog feed subscriptions with auto-check via Recent API poll

## Content Lifecycle

`processing` → `ready` → `accepted` | `discarded` | `error`

- **ready**: processed, visible in Recent, NOT in topics/people/synthesis
- **accepted**: in the knowledge base, still visible in Recent (if within newest 9)
- **discarded**: hidden from everywhere

## Key Routes

- `GET/POST /api/content` — list and submit content
- `GET/PATCH/DELETE /api/content/[id]` — single content item; PATCH accepts `{ topics, people, status }`
- `GET /api/recent` — items pending review (processing, ready, error)
- `GET /api/library?q=search` — accepted content, optional title search
- `GET /api/topics` — all topics
- `GET /api/topics/[slug]` — topic with content items
- `POST /api/topics/[slug]/synthesize` — generate cross-content synthesis
- `POST /api/topics/merge` — merge multiple topics into one
- `GET /api/people` — all people
- `GET /api/people/[slug]` — person with content items
- `GET/POST /api/subscriptions` — list and add subscriptions (YouTube channels or podcast RSS feeds)
- `DELETE /api/subscriptions/[id]` — remove subscription
- `POST /api/subscriptions/check` — manually trigger feed checks

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

Tests use `INSPIRE_DATA_DIR` env var + `closeDb()` for SQLite isolation.
