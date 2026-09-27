# CollabDash

A shared workspace for turning datasets into dashboards. Import data, choose a chart or metric, and arrange the results on a canvas your team can edit together.

## What you can do

- Import CSV, JSON, or Excel datasets and search their names and contents.
- Build dashboards with bar, line, pie, and area charts, plus KPI cards.
- Move and resize widgets, and connect them to fields in a dataset.
- Invite collaborators with owner, editor, or viewer access.
- See live presence, follow activity, and save or restore dashboard snapshots.
- Export the dashboard as a PNG image.

The frontend uses React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. Supabase provides authentication, database storage, and realtime updates.

## Run locally

You need Node.js with npm and a Supabase project.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and publishable key.
3. Apply the SQL files in `supabase/migrations/` to your Supabase project in filename order. They define the tables, access policies, and realtime configuration. If you use the Supabase CLI, link your own project before pushing migrations; the checked-in configuration contains the original project reference.
4. Configure Supabase email/password authentication and allow `http://localhost:8080` as a redirect URL. Account confirmation follows your project's email settings.
5. Run `npm run dev` and open `http://localhost:8080`.

Create an account, open a new dashboard, and add a dataset before adding widgets. Each widget belongs to a dataset.

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 8080 |
| `npm run build` | Create a production bundle in `dist/` |
| `npm run build:dev` | Build with development-mode settings |
| `npm run preview` | Serve the built bundle locally |
| `npm run lint` | Check source files with ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Keep Vitest running while editing |

The existing Vitest suite is a smoke check, not coverage of authentication or collaborative editing. Those flows need a configured Supabase project and multiple signed-in browser sessions.

## Project layout

```text
src/
  pages/                 Route-level screens
  components/dashboard/  Canvas, widgets, datasets, and collaboration controls
  components/ui/         Shared UI primitives
  contexts/              Authentication state
  hooks/                 Data access and realtime subscriptions
  integrations/supabase/ Client and generated database types
  lib/                   Shared helpers, including dataset search
supabase/migrations/     Database schema and policy changes
docs/                    Maintenance notes and historical reports
```

Read [the naming conventions](docs/conventions.md) before adding components. [Dataset search](docs/dataset-search.md) describes ranking behavior. Earlier implementation reports are retained in the [documentation archive](docs/archive/README.md).

## Deployment notes

Build with the Supabase environment variables set, then serve `dist/` from a static host. Configure a fallback to `index.html` so direct visits to `/auth` and `/dashboard/:id` work. Add the deployed origin to your Supabase authentication redirect settings.

Vite includes `VITE_*` variables in the browser bundle. Use the Supabase publishable key here, never a service-role key.
