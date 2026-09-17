# KauaArtx Video Studio

**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

The production system behind the [@KauaArtx](https://www.youtube.com/@KauaArtx) channel. It carries an idea to a published video through an eight-stage workflow, keeping the script, the decisions and the progress in one place.

[Open the application](https://sistema-videos.vercel.app) · Authentication required

---

## Why it exists

A generic task board does not understand video production: it knows there is a task called "record", but not that recording means working through the very segments you wrote, which will later be edited one by one. Here the script is the spine of the system, not an attachment.

## The workflow

```text
Idea → Script → Recording → Editing → Thumbnail & Title → Review → Scheduled → Published
```

Each stage has its own workspace with the fields that belong there — hook and references in Idea, title options in the Title stage, lessons learned once published — instead of one generic form repeated eight times.

## The script block is the spine

The video is broken into timed blocks ("0–30s: I say this"). **It is always the same block changing state**: it is born in Script, becomes an item in Recording and a task in Editing. They are not three separate lists you have to keep in sync in your head.

Two features come out of that:

- **A continuous timeline.** Each block starts where the previous one ends. Move one block's end and the next follows, with everything below sliding along and keeping its own duration. A block can never collapse to zero or run backwards.
- **Reading mode.** One block at a time in large type, full screen, with that block's planned range and a stopwatch that turns amber once you pass it. Arrows move between blocks, `P` runs the stopwatch, `Esc` closes. This is what you use while filming.

## Other capabilities

- Drag-and-drop Kanban board across the eight stages.
- Per-stage checklists, editable and reorderable, stored per video.
- Optional editorial assistant for scripts, titles and thumbnail concepts — with deterministic local suggestions when no model is configured, so the tool never depends on AI to work.
- JSON export for portable backups.
- An approved-account system that also serves the other applications in the ecosystem.

## Engineering decisions worth noting

- **Authorization checked at the database, not in the client.** All eighteen write operations go through a guard that re-scopes the query by record owner. No member can reach another's row, and no authorization trusts data from the browser.
- **Row Level Security that is real**, covering all five account tables rather than being decorative.
- **Passwords never reversible.** Scrypt hashing with a per-account salt, constant-time comparison and attempt throttling.
- **The AI credential stays on the server.** The endpoint validates the session, bounds the request size and caps generations per hour.
- **Migrations applied by CI.** The Vercel deploy does not run migrations; a dedicated workflow applies what is pending when the schema changes, so new code never meets an old database.

## Tech stack

Next.js 16, React 19, TypeScript, Prisma, PostgreSQL/Supabase, dnd-kit and Vercel.

## Local development

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:deploy
npm.cmd run dev
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled application connection |
| `DIRECT_URL` | Direct connection, used by migrations |
| `APP_PASSWORD` | Owner password |
| `AUTH_SECRET` | Random secret signing session cookies |
| `LLM_BASE_URL` | OpenAI-compatible endpoint (optional) |
| `LLM_MODEL` | Model identifier (optional) |
| `LLM_API_KEY` | Provider credential — never exposed to the browser |

Never commit a real `.env`. The application fails closed when authentication secrets are missing.

## Verification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd audit --omit=dev
```

## Repository map

```text
prisma/            Schema, migrations and seed data
src/actions/       Authenticated server mutations
src/app/           Routes, endpoints and pages
src/components/    Board and video workspace
src/lib/           Auth, database, timeline and workflow rules
tests/             Authentication and timeline tests
```

## Status

A tool in real use by one creator. It is not a multi-tenant SaaS, and external AI is optional rather than a runtime dependency.

Built and maintained by [Kauã Diniz Souza](https://github.com/Kauadsouza).
