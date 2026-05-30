# Yoshlar Frontend (Next.js 16)

Frontend for the Yoshlar Agentligi monitoring CRM. Consumes the FastAPI backend in `../backend/`. See [docs/roles/](../docs/roles/) for per-role UI scope and [docs/backend/modules.md](../docs/backend/modules.md) for the API surface.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript 5 (strict)
- Tailwind CSS v4 (`@theme inline`)
- shadcn/ui + Radix UI primitives
- TanStack Query v5 (server state)
- Vercel AI SDK (until AI placement decision)
- pnpm workspace

## Quick start

```bash
# install
pnpm install

# configure
cp .env.example .env.local
# set NEXT_PUBLIC_API_URL to the running backend

# run
pnpm dev
```

Open <http://localhost:3000>. Backend must be running on `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## Layout

```
frontend/
├── app/                  # Next.js App Router pages, layouts, API routes
│   ├── api/ai/           # AI streaming + structured-output routes
│   ├── globals.css       # Tailwind v4 tokens (OKLCH)
│   ├── layout.tsx        # Root layout (wraps <AppProviders>)
│   └── page.tsx          # Currently the demo SPA (to be replaced)
├── components/
│   ├── ai/               # AI chat + insights
│   ├── layout/           # Sidebar, topbar, main-layout
│   ├── pages/            # One component per "page" (legacy SPA pattern)
│   └── ui/               # shadcn primitives + district-selector
├── hooks/                # Custom React hooks
├── lib/
│   ├── api/
│   │   ├── client.ts     # fetch wrapper (Bearer token, error envelope)
│   │   ├── errors.ts     # ApiError class
│   │   ├── types.ts      # Mirrors backend types (UserRole, User, …)
│   │   └── hooks/        # TanStack Query hooks (use-districts.ts, …)
│   ├── auth/
│   │   ├── storage.ts    # localStorage token helpers
│   │   ├── session.tsx   # SessionProvider + useSession()
│   │   └── route-guard.tsx  # <RouteGuard allow={[…]}>
│   ├── config.ts         # Env access
│   ├── providers.tsx     # QueryClient + Session providers
│   ├── app-context.tsx   # Legacy mock-state context (to be retired)
│   ├── mock-data.ts      # Legacy seed data (to be retired)
│   ├── types.ts          # Legacy local types
│   └── utils.ts
├── middleware.ts         # Next.js middleware: security headers + public paths
├── public/
├── styles/
├── components.json       # shadcn config
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

## Foundation primitives

### `api/client.ts`

Typed fetch wrapper. Attaches `Authorization: Bearer <token>` from localStorage. Throws `ApiError` for non-2xx with the backend's error envelope `{code, message}`.

```ts
import { api } from "@/lib/api/client";

const districts = await api.get<{ data: string[] }>("/api/districts");
```

### `auth/session.tsx`

Single source of truth for the logged-in user. Backed by TanStack Query `["session", "me"]`.

```tsx
import { useSession, useCurrentUser } from "@/lib/auth/session";

const { user, login, logout } = useSession();
await login({ email, password });
```

### `auth/route-guard.tsx`

Client-side gate. Use it inside any page that requires a role.

```tsx
import { RouteGuard } from "@/lib/auth/route-guard";

export default function UsersPage() {
  return (
    <RouteGuard allow={["admin"]}>
      <UsersTable />
    </RouteGuard>
  );
}
```

### `lib/providers.tsx`

Wraps the app with `QueryClientProvider` + `SessionProvider`. Already mounted in `app/layout.tsx`.

## Migrating from the v0 demo

The current `app/page.tsx` is a single-page switch driven by `lib/app-context.tsx` mock state. The plan:

1. Replace `app-context.tsx` data calls with TanStack Query hooks (`use-youth`, `use-plans`, etc. — one per backend module).
2. Replace the demo-account switcher in `components/pages/login-page.tsx` with `useSession().login(...)` calls to the real backend.
3. Convert the in-page switch in `app/page.tsx` to proper App Router segments (`app/dashboard/page.tsx`, `app/yoshlar/page.tsx`, …) wrapped in `<RouteGuard>`.
4. Delete `lib/mock-data.ts` once every page reads from the API.

Track per-role migration in [docs/roles/](../docs/roles/) — each role doc lists the components/pages its team owns.

## Conventions

- Imports use `@/*` alias relative to `frontend/` (configured in `tsconfig.json`).
- Server-only secrets (e.g. `OPENAI_API_KEY`) stay in `.env.local` without the `NEXT_PUBLIC_` prefix.
- Never read env vars directly in components — go through `lib/config.ts`.
- Never store JWTs in component state or React Context — use `lib/auth/storage.ts` so SSR fetches see a consistent absence of token.
- New data hooks live in `lib/api/hooks/`; one hook per query.
- Page-level guards: always wrap protected pages in `<RouteGuard>` even though `middleware.ts` is permissive — the middleware can't read localStorage.

## Lint / typecheck

```bash
pnpm lint
pnpm typecheck
pnpm build
```
