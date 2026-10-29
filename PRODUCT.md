# The High Spirits Cafe

## Platform
Web application for The High Spirits Cafe, Pune. Mobile-first customer booking and desktop-friendly staff operations.

## Stack
The supplied spec requests Next.js and TypeScript with PostgreSQL. The user's newer instruction requires separate frontend and backend applications. `frontend/` owns Next.js UI; `backend/` owns the Fastify API, sessions, payments, inventory and database; `packages/contracts/` owns shared validation and TypeScript contracts. Frontend calls HTTP only, never the database.

## Users and purpose
Guests discover events and choose female or couple entry. Customers book tickets or table-size options, pay, and retrieve named QR tickets. Admins and managers run events, tiers, guestlists and reservations. Promoters add and view their own guestlist only.

## Confirmed business rules
- Exact working name: The High Spirits Cafe. City: Pune.
- Minimum age 21. Female and couple ticket entry only, photo ID required, couples enter together.
- Table cover charge starts at INR 100 per table booking and is editable by managers. The table tier price is additional if configured. Per-booking charging is an implementation assumption pending confirmation.
- No voluntary refunds. Failed/unfulfilled transactions and duplicate payments are automatically reversed; this is payment recovery rather than discretionary cancellation.
- Applicable GST must be itemized at checkout. Actual GST rate, registration and taxable treatment remain unconfirmed; live checkout stays disabled until admin confirms tax configuration. No rate is invented.
- Ten-minute inventory holds; four bookings per account per tier; 700 maximum venue capacity.
- No floor plan, scanner, door role, waitlist, referral links or commissions in this release.

## Evidence and assets
SPEC.md and features.md, plus the supplied 16-page wireframe/story map. Updated spec supersedes old floor plan and scanner screens. User will supply assets later and explicitly instructed continuing other work. Seed events are illustrative and labeled; no real club photographs, lineup, address, phone, menu prices or logo are claimed.

## Success criteria
Independent frontend/backend builds, shared validated requests, server-enforced permissions, atomic inventory, verified idempotent payment confirmation, useful error and empty states, mobile and keyboard usability, and meaningful integration tests. Performance targets and production provider behavior require actual staging infrastructure and are not inferred from local tests.

Confirmed update: official logo supplied; public styling draws on red/yellow/blue concert posters and dark nightlife imagery. Customer and staff login currently use email/password; OTP is deferred. Admins and managers manage gallery and menu images with draft previews and publishing.
