# ClaimSense

AI-assisted patent drafting workspace. Turn a technical disclosure into USPTO-style
claims and a full specification through a guided Q&A flow or an express one-shot draft.

Built with React + TypeScript + Vite, Tailwind CSS, and Supabase (auth, Postgres,
and Edge Functions for the AI calls).

## Features

- Email/password auth (Supabase Auth)
- Disclosure analysis that generates targeted clarification questions
- Guided drafting from your answers, or express drafting from the description alone
- Generated abstract, background, summary, drawings description, detailed description, and claims
- Independent/dependent claim breakdown, plain-English translation, and scope analysis
- Prior-art reference capture, draft version history, and soft-delete/trash

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL and anon key
npm run dev
```

The app expects a Supabase project with the schema in `supabase/migrations/` applied and
the `patent-ai` Edge Function (in `supabase/functions/`) deployed.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Vite dev server            |
| `npm run build`     | Production build                     |
| `npm run preview`   | Preview the production build         |
| `npm run lint`      | Run ESLint                           |
| `npm run typecheck` | Type-check with `tsc --noEmit`       |

## Environment variables

| Variable                  | Description                       |
| ------------------------- | --------------------------------- |
| `VITE_SUPABASE_URL`       | Supabase project URL              |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anonymous (public) key   |

`.env` is gitignored; never commit real credentials.
