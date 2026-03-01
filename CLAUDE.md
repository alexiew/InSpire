# InSpire

Personal knowledge distillery. Paste a YouTube URL, get the transcript extracted and AI-summarized.

## Launching

```bash
cd /Users/alex/2026/claude/projects/inspire
npm run dev
```

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SWR
- File-based JSON storage (`data/videos.json`)
- YouTube transcript extraction via `summarize` CLI (`@steipete/summarize`)
- Summarization via `claude --print` CLI (uses Max plan, no API costs)
- Vitest for testing

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

Tests use `INSPIRE_DATA_DIR` env var for file isolation.
