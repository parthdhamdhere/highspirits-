# Graph Report - highspirits-  (2026-10-29)

## Corpus Check
- 41 files · ~10,702 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .blend 1, .css 1)

## Summary
- 325 nodes · 773 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a2f717b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- management.tsx
- backend/package.json
- frontend/package.json
- acceptance.mjs
- booking.test.ts
- package.json
- build_scene.py
- app.ts
- run-system.mjs
- compilerOptions
- frontend/tsconfig.json
- contracts/package.json
- backend/tsconfig.json
- encode.sh

## God Nodes (most connected - your core abstractions)
1. `buildApp()` - 29 edges
2. `Management()` - 17 edges
3. `ClubApp()` - 16 edges
4. `api()` - 16 edges
5. `post()` - 14 edges
6. `checkout()` - 13 edges
7. `database` - 13 edges
8. `Booking()` - 13 edges
9. `Message()` - 13 edges
10. `capture()` - 12 edges

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

## Communities (15 total, 2 thin omitted)

### Community 0 - "management.tsx"
Cohesion: 0.16
Nodes (41): Page(), Login(), submit(), Profile(), ArrowUpRightIcon(), Booking(), ClubApp(), CocktailScrollExperience() (+33 more)

### Community 1 - "backend/package.json"
Cohesion: 0.07
Nodes (41): dependencies, dotenv@^17.2.3, @electric-sql/pglite@^0.3.14, fastify@^5.6.2, @fastify/cookie@^11.0.2, @fastify/cors@^11.1.0, @fastify/helmet@^13.0.2, @fastify/multipart@^9.3.0 (+33 more)

### Community 2 - "frontend/package.json"
Cohesion: 0.08
Nodes (28): metadata, dependencies, @fontsource-variable/schibsted-grotesk@^5.2.6, @highspirits/contracts@*, lucide-react@^0.468.0, next@^16.0.0, qrcode@^1.5.4, react@^19.2.0 (+20 more)

### Community 3 - "acceptance.mjs"
Cohesion: 0.13
Nodes (4): results, go(), results, wait()

### Community 4 - "booking.test.ts"
Cohesion: 0.10
Nodes (41): buildApp(), bot(), rate(), session(), audit(), capture(), checkout(), createHold() (+33 more)

### Community 5 - "package.json"
Cohesion: 0.13
Nodes (18): devDependencies, concurrently@^9.2.1, prettier@^3.9.10, @types/node@^22.19.0, typescript@^5.9.3, name, private, scripts (+10 more)

### Community 6 - "build_scene.py"
Cohesion: 0.11
Nodes (6): cylinder(), finish(), lathe(), pose(), smooth(), tube()

### Community 7 - "app.ts"
Cohesion: 0.13
Nodes (22): fastify, FastifyRequest, Row, events(), guestView(), iso(), orders(), checkoutInput (+14 more)

### Community 8 - "run-system.mjs"
Cohesion: 0.25
Nodes (4): children, env, launch(), run()

### Community 9 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+2 more)

### Community 10 - "frontend/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, incremental, jsx, plugins, exclude, extends, include, ../tsconfig.base.json

### Community 11 - "contracts/package.json"
Cohesion: 0.25
Nodes (8): dependencies, zod@^4.6.7, exports, zod, name, private, type, version

### Community 13 - "backend/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../tsconfig.base.json

## Knowledge Gaps
- **2 isolated node(s):** `../tsconfig.base.json`, `../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `management.tsx` to `frontend/package.json`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `../tsconfig.base.json`, `../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06504065040650407 - nodes in this community are weakly interconnected._
- **Why does `react` connect `management.tsx` to `frontend/package.json`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07661290322580645 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `management.tsx` to `frontend/package.json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `acceptance.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._