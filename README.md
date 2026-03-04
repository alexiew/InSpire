# InSpire

Personal knowledge distillery. Feed it YouTube videos, podcast episodes, and blog articles — it extracts topics, claims, and people, then synthesizes insights across sources.

## How It Works

1. **Subscribe** to YouTube channels, podcast feeds, or blog RSS feeds — or paste individual URLs
2. **Process** — transcripts and article text are extracted automatically, then AI identifies topics, claims, and key people mentioned
3. **Review** — processed content appears in your inbox. Accept what's valuable, discard the rest
4. **Explore** — browse your knowledge base by topic or person. Full-text search across everything
5. **Synthesize** — per-topic cross-content analysis surfaces agreements, contradictions, and unique insights
6. **Map** — interactive force-directed graph shows how topics and people relate through shared content
7. **Journal** — save text highlights from any content, compile them into printable documents
8. **Newsroom** — daily briefings with trending topics, rising people, and AI-generated summaries

## Content Lifecycle

```
URL submitted → processing → ready → accepted / discarded
```

- **Processing**: transcript extraction + AI analysis runs in the background
- **Ready**: appears in your Review inbox for triage
- **Accepted**: enters your knowledge base, visible in Topics, People, Library, and Synthesis
- **Discarded**: hidden from everywhere

## Prerequisites

1. **Claude CLI** — install [Claude Code](https://claude.ai/download). This is the only thing you need to install manually. Once you have it, open this project and ask Claude to set up the rest.

2. **Node.js 22+** — required for the app and the summarize CLI.

3. **summarize CLI** — extracts text from YouTube videos, podcasts, and web pages. Claude can install this for you, or: `npm install -g @steipete/summarize`

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/alexiew/InSpire.git
cd InSpire

# 2. Install dependencies
npm install

# 3. Open Claude Code in the project
claude

# 4. Ask Claude to set up and run the project
> Help me set up and run InSpire
```

Claude will read the project's `CLAUDE.md`, verify prerequisites, and launch the dev server. The SQLite database is created automatically on first launch.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Data fetching**: SWR
- **Database**: SQLite via better-sqlite3 (local file, zero config)
- **Transcript extraction**: `summarize` CLI by [@steipete](https://github.com/steipete/summarize)
- **AI extraction & synthesis**: `claude --print` CLI
- **Testing**: Vitest (205+ tests)
- **Visualization**: react-force-graph-2d for the topic/people network map

## Running Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

## Project Structure

```
src/
  app/              # Next.js pages and API routes
  components/       # React components (UI, layout, content)
  hooks/            # SWR data fetching hooks
  lib/              # Core logic (content, topics, people, extraction,
                    #   synthesis, subscriptions, journal, briefings)
  __tests__/        # Vitest test suites
data/
  inspire.db        # SQLite database (created on first launch, gitignored)
```

