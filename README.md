# InSpire

Personal knowledge distillery. Feed it YouTube videos, podcast episodes, and blog articles — it extracts topics, claims, and people, then synthesizes insights across sources.

## Prerequisites

1. **Claude CLI** — [install Claude Code](https://docs.anthropic.com/en/docs/claude-code), the Anthropic CLI. This is the only thing you need to install manually. Once you have it, open this project and ask Claude to set up the rest.

2. **Node.js 20+** — required for the app itself.

3. **summarize CLI** — extracts text from YouTube videos, podcasts, and web pages. Claude can install this for you.

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> inspire
cd inspire

# 2. Open Claude Code in the project
claude

# 3. Ask Claude to set up and run the project
> Help me set up and run InSpire
```

Claude will read the project's `CLAUDE.md` and handle installing dependencies, verifying prerequisites, and launching the dev server.

## What It Does

- **Subscribe** to YouTube channels, podcast feeds, and blog RSS feeds
- **Process** content: transcripts are extracted, then AI identifies topics, claims, and people
- **Review** processed content in the inbox, accept or discard
- **Explore** your knowledge base by topic, person, or full-text search
- **Synthesize** cross-content analysis per topic (agreements, contradictions, unique insights)
- **Map** visualize how topics and people relate through shared content
- **Journal** save highlights from any content, compile into printable documents
- **Newsroom** daily briefings with trending topics and people
