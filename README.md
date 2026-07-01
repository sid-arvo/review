# Spotify Voice of Customer Intelligence Platform

An internal analytics platform that ingests public feedback about Spotify (Play Store, App Store, Reddit, Spotify Community, X, YouTube, Google News, NewsAPI, Medium, blogs), runs it through an AI enrichment pipeline, and surfaces why users struggle to discover new music despite Spotify's recommendation system - with an executive dashboard, RAG-powered AI chat, and a daily automated ETL pipeline.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Prisma 6 · PostgreSQL + pgvector · Supabase Auth · OpenAI (GPT + embeddings) · LangGraph · Vercel AI SDK · BullMQ + Redis · Recharts · Sentry · PostHog

Every external integration (OpenAI, Supabase, Google Play, Twitter/X, YouTube, NewsAPI, Slack, Sentry, PostHog) has a graceful fallback, so the app is fully functional end-to-end with zero API keys configured - see **Settings** in the dashboard for live integration status.

## Quick start (local)

Requires Node 22+, pnpm, PostgreSQL with the `vector` extension, and Redis.

```bash
pnpm install

# Point DATABASE_URL / REDIS_URL at your local Postgres+pgvector and Redis instances
cp .env.example .env

pnpm exec prisma migrate deploy   # create schema + pgvector/HNSW indexes
pnpm db:seed                      # generate ~1,800 synthetic reviews and run the full AI pipeline

pnpm dev                          # http://localhost:3000
```

Without `OPENAI_API_KEY` set, embeddings/sentiment/topic classification/chat all run on deterministic heuristics instead of GPT calls - the whole pipeline and dashboard work fully offline. Set `OPENAI_API_KEY` to switch to real GPT-5.5 structured-output enrichment and grounded chat answers.

The app auto-provisions a demo Admin account when `NEXT_PUBLIC_SUPABASE_URL` is unset, so the dashboard is reviewable with zero auth setup. Configure Supabase (with Google + GitHub OAuth providers enabled in the Supabase dashboard) to enable real sign-in and RBAC.

## Running the daily ETL manually

```bash
curl "http://localhost:3000/api/cron/daily-etl?secret=$CRON_SECRET"
```

This fetches from all 10 sources, runs AI enrichment, refreshes clusters + trend snapshots, and generates a new executive summary. In production, Vercel Cron triggers this at `00:00 UTC` (see `vercel.json`).

For higher-volume production use beyond serverless execution limits, point ingestion at the BullMQ queues instead (`enqueueDailyIngestion()` in `src/lib/queue/producers.ts`) and run the standalone worker:

```bash
pnpm worker
```

## Docker

```bash
docker compose up --build
```

Brings up Postgres (with pgvector), Redis, the Next.js app, and the BullMQ worker.

## Project structure

```
src/app/(dashboard)/     14 dashboard sections (overview, discovery, sentiment, chat, admin, cron, ...)
src/app/api/             REST endpoints: chat, cron, reports, admin
src/lib/ingestion/       10 source connectors + synthetic fallback generator
src/lib/ai/              LangGraph enrichment pipeline, clustering, trends, executive summaries
src/lib/rag/             pgvector retrieval + heuristic/GPT answer generation
src/lib/etl/             daily ETL orchestration (used by both the cron route and the worker)
src/workers/             standalone BullMQ worker process
prisma/schema.prisma     full data model (reviews, taxonomy, clusters, trends, chat, RBAC)
```
