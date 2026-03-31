# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server with nodemon (watches src/)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled application
npm run lint         # Check for ESLint violations
npm run lint:fix     # Auto-fix ESLint violations
npm run format       # Format code with Prettier
npm run type-check   # Type check without emitting output
```

`nodemon.json` at project root configures the watch — it runs `tsx src/index.ts` on every `.ts` change inside `src/`.

No test framework is configured yet.

## Architecture

Express.js REST API in TypeScript, backed by Supabase (PostgreSQL). Schema is in `schema.sql` at the project root.

**Module structure** — each entity lives under `src/modules/<name>/` with three files:
- `<name>.service.ts` — Supabase queries (all DB access goes here)
- `<name>.controller.ts` — request/response handling, calls service
- `<name>.routes.ts` — Express router with the 5 CRUD endpoints

Routes are registered centrally in `src/routes/index.ts`.

**Entities and their REST prefixes:**

| Module | Table | Prefix |
|---|---|---|
| users | users | `/users` |
| carga | carga | `/carga` |
| centro_logistica | centro_logistica | `/centros-logistica` |
| clientes | clientes | `/clientes` |
| armazens_parceiros | armazens_parceiros | `/armazens` |
| caminhao | caminhao | `/caminhoes` |
| entregas | entregas | `/entregas` |

**Middleware stack** (applied in `src/index.ts`): `express.json()` → custom request logger → Helmet (security headers) → CORS.

**Configuration** — `src/config/environment.ts` exports env vars. `src/config/supabase.ts` initializes the Supabase client (throws on missing credentials). Required env vars: `SUPABASE_URL`, `SUPABASE_API_KEY`. See `.env.example` for all vars.

**Shared utilities** — `src/utils/constants.ts` has `HTTP_STATUS`, `ERROR_MESSAGES`, and `PAGINATION`. Use these instead of hardcoding values. All list endpoints support `?page=` and `?limit=` query params (max 100).

**Health check** — `GET /health` is registered directly in `src/index.ts`.

## Code style

- ESLint with `airbnb-base` + TypeScript. Prettier with single quotes, 2-space indent, 100-char line width.
- Unused variables are allowed only when prefixed with `_`.
- Console statements trigger a warning (not error) — prefer the morgan logger for HTTP logging.
- Joi is available for request validation but not yet wired up anywhere.
