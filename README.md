# Video Production System

A private production workspace built for the [@KauaArtx](https://www.youtube.com/@KauaArtx) YouTube channel. It turns an idea into a published video through a clear eight-stage workflow, while keeping scripts, decisions and progress in one place.

[Open the live application](https://sistema-videos.vercel.app) · Authentication required

## The workflow

```text
Idea -> Script -> Recording -> Editing -> Thumbnail & Title -> Review -> Scheduled -> Published
```

## Key capabilities

- Drag-and-drop Kanban board with eight production stages.
- Stage-specific checklists that can be edited and reordered per video.
- Detailed video workspace for hooks, notes, references and timed script blocks.
- Authenticated integration with ARTX Hub.
- PostgreSQL persistence through Prisma and Supabase.
- JSON export for portable backups.
- Optional OpenAI-compatible editorial generation for scripts, titles and thumbnail concepts.
- Deterministic local suggestions when no model is configured or a provider is unavailable.
- Server-side session validation, request limits and rate-limited generation.

## Tech stack

Next.js 15, React 19, TypeScript, Prisma, PostgreSQL/Supabase, dnd-kit and Vercel.

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
| `DATABASE_URL` | Pooled PostgreSQL application connection |
| `DIRECT_URL` | Direct/session connection used by migrations |
| `APP_PASSWORD` | Single-owner application password |
| `AUTH_SECRET` | Random secret used to sign session cookies |
| `LLM_BASE_URL` | Optional OpenAI-compatible API endpoint |
| `LLM_MODEL` | Optional model identifier |
| `LLM_API_KEY` | Optional server-only provider credential |

Never commit a real `.env` file. The application fails closed when authentication secrets are missing.

## Database commands

```powershell
npm.cmd run db:deploy
npm.cmd run db:studio
npm.cmd run db:seed
```

## Verification

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
```

## Repository map

```text
prisma/            Schema, migrations and seed data
src/actions/       Authenticated server mutations
src/app/           Routes, API endpoints and pages
src/components/    Board and video workspace UI
src/lib/           Auth, database and workflow rules
```

## Status

Active production tool for a single creator. This is not a multi-tenant SaaS product, and external AI is optional rather than a runtime dependency.

Built and maintained by [Kauã Diniz Souza](https://github.com/Kauadsouza).
