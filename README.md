# Transformation Command Centre: web app (Release 1 vertical slice)

React + TypeScript + Vite implementation of the Release 1 vertical slice:
create programme → import ERP inventory → upload evidence → accept a finding →
review AI output → accept or reject a recommendation → see the dashboard update.

The backend is simulated in the browser so the UI can be built and tested before
the FastAPI services exist. Data is fictional and persists in local storage.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # domain logic tests (vitest)
npm run build      # type-check and production build
```

## Structure (matches `apps/web/src` in the blueprint)

```
src/
├── app/            App router, shell, navigation
├── components/
│   ├── ui/         Chip, Button, Gate, Section, Drawer
│   ├── setup/      Programme setup
│   ├── dashboard/  Executive dashboard, metric drawer (AIInsightDrawer)
│   ├── discovery/  Inventory, ERP detail, evidence library, discovery
│   ├── strategy/   AI consultant, recommendation card, scenarios
│   ├── governance/ Decisions, risks, audit trail
│   └── flow/       Vertical-slice tracker and architecture map
├── features/       Pure domain logic: import validation, metrics registry,
│                   recommendation rules + assurance, scenario scoring
├── stores/         Zustand store (stand-in for the API)
├── hooks/          Pipeline worker, state selectors
└── types/          Domain types (move to packages/contracts later)
```

## Routes

| Route | Screen |
|---|---|
| `/programmes/new` | Programme setup |
| `/dashboard` | Executive dashboard |
| `/landscapes`, `/landscapes/:id` | ERP inventory and detail |
| `/documents` | Evidence library |
| `/discovery` | Gaps, questions, baseline |
| `/strategy` | AI strategy consultant |
| `/strategy/scenarios` | Scenario comparison |
| `/governance` | Decisions, risks, audit |
| `/flow` | Software flow |

## Moving to the real backend

1. Each store action in `stores/programmeStore.ts` maps to one endpoint in the
   blueprint’s REST specification. Replace the action body with a TanStack Query
   mutation and invalidate the related queries.
2. Keep `features/` logic as the reference implementation and port metric,
   validation and assurance rules to the FastAPI domain modules; the server is
   the authority, the client only displays results.
3. Replace `useDocumentPipeline` with polling of `GET /api/v1/imports/{id}` and
   document job status.
4. Replace the role switcher with Entra ID claims; keep `features/permissions.ts`
   for UI gating only (the API must enforce permissions).
5. Replace `generateRecommendations` with the orchestrator call, keeping the
   `finalise` assurance checks server-side.

Styling uses plain CSS with design tokens and light/dark themes (`styles.css`).
The blueprint specifies Tailwind and shadcn/ui; the tokens map directly onto a
Tailwind theme if you migrate.
