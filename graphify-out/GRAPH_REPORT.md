# Graph Report - highspirts  (2026-10-28)

## Corpus Check
- 30 files · ~6,703 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 256 nodes · 605 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- management.tsx
- backend/package.json
- frontend/package.json
- app.ts
- db.ts
- package.json
- buildApp
- booking.ts
- booking.test.ts
- compilerOptions
- frontend/tsconfig.json
- contracts/package.json
- views.ts
- backend/tsconfig.json
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `buildApp()` - 25 edges
2. `ClubApp()` - 17 edges
3. `Management()` - 16 edges
4. `Booking()` - 13 edges
5. `date()` - 13 edges
6. `time()` - 12 edges
7. `database` - 11 edges
8. `Profile()` - 11 edges
9. `Message()` - 11 edges
10. `api()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `buildApp()` --calls--> `isAdult()`  [EXTRACTED]
  backend/src/app.ts → packages/contracts/src/index.ts
- `Booking()` --calls--> `priceBreakdown()`  [EXTRACTED]
  frontend/components/booking.tsx → packages/contracts/src/index.ts
- `FastifyRequest` --references--> `SessionUser`  [EXTRACTED]
  backend/src/app.ts → packages/contracts/src/index.ts
- `checkout()` --calls--> `priceBreakdown()`  [EXTRACTED]
  backend/src/booking.ts → packages/contracts/src/index.ts
- `Profile()` --calls--> `money()`  [EXTRACTED]
  frontend/components/account.tsx → packages/contracts/src/index.ts

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "management.tsx"
Cohesion: 0.19
Nodes (37): Page(), Login(), Profile(), ArrowUpRightIcon(), Booking(), ClubApp(), Empty(), EventCard() (+29 more)

### Community 1 - "backend/package.json"
Cohesion: 0.07
Nodes (41): dependencies, dotenv@^17.2.3, @electric-sql/pglite@^0.3.14, fastify@^5.6.2, @fastify/cookie@^11.0.2, @fastify/cors@^11.1.0, @fastify/helmet@^13.0.2, @fastify/multipart@^9.3.0 (+33 more)

### Community 2 - "frontend/package.json"
Cohesion: 0.08
Nodes (27): metadata, dependencies, @fontsource-variable/schibsted-grotesk@^5.2.6, @highspirits/contracts@*, lucide-react@^0.468.0, next@^16.0.0, qrcode@^1.5.4, react@^19.2.0 (+19 more)

### Community 3 - "app.ts"
Cohesion: 0.15
Nodes (17): fastify, FastifyRequest, checkoutInput, customerInput, EventInput, guestInput, Hold, holdInput (+9 more)

### Community 4 - "db.ts"
Cohesion: 0.24
Nodes (9): provider(), Config, dataDir, validateConfig(), database, migrate(), Query, runJobs() (+1 more)

### Community 5 - "package.json"
Cohesion: 0.15
Nodes (15): devDependencies, concurrently@^9.2.1, @types/node@^22.19.0, typescript@^5.9.3, name, private, scripts, build (+7 more)

### Community 6 - "buildApp"
Cohesion: 0.24
Nodes (12): buildApp(), bot(), rate(), session(), ApiError, csv(), escapeHtml(), fail() (+4 more)

### Community 7 - "booking.ts"
Cohesion: 0.35
Nodes (9): audit(), capture(), checkout(), createHold(), expireHolds(), expireTier(), holdView(), settings() (+1 more)

### Community 8 - "booking.test.ts"
Cohesion: 0.24
Nodes (3): passwordHash(), seed(), c

### Community 9 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+2 more)

### Community 10 - "frontend/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, incremental, jsx, plugins, exclude, extends, include, ../tsconfig.base.json

### Community 11 - "contracts/package.json"
Cohesion: 0.25
Nodes (8): dependencies, zod@^4.6.7, exports, zod, name, private, type, version

### Community 12 - "views.ts"
Cohesion: 0.53
Nodes (5): Row, events(), guestView(), iso(), orders()

### Community 13 - "backend/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../tsconfig.base.json

## Knowledge Gaps
- **2 isolated node(s):** `../tsconfig.base.json`, `../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 70 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `management.tsx` to `frontend/package.json`, `next.config.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `../tsconfig.base.json`, `../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06504065040650407 - nodes in this community are weakly interconnected._
- **Why does `react` connect `management.tsx` to `frontend/package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07956989247311828 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `management.tsx` to `frontend/package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._