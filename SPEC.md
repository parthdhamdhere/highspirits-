# Club Event Booking Platform: Technical Spec

Version 0.2 · 28 Oct 2026 · Team: 2 developers · Target: 2 weeks to launch

Wireframes and story map: https://claude.ai/artifact/DwEQZcVeX92ciV3qmnbjxa
(Two wireframe screens are now out of date: the table floor plan and the door scanner. See "Changes since the wireframes" at the end.)

---

## 1. Goals

1. Sell tickets and table bookings for one club's events online, with Razorpay payments.
2. Survive a spike of about 20,000 people hitting checkout at the same moment, with no overselling, no downtime and low latency in India.
3. Give staff a role-based dashboard to run events, guestlists and reservations.
4. Be buildable by 2 people in 2 weeks.

## 2. Key facts and constraints

| Item | Value |
|---|---|
| Club capacity | 700 when full, 300 to 350 usual |
| Peak demand | about 20,000 users at once (demand, not inventory) |
| Entry policy | Female and couple entry only. No stag entry. |
| Payments | Razorpay |
| Priority | Low latency, no lag, no shutdown |
| Hosting preference | Fly.io (Mumbai region) |
| Team and timeline | 2 developers, 2 weeks |

**The important insight:** only about 700 tickets exist, so most of the 20k visitors will see "sold out" within seconds. The hard problems are (a) never selling the same ticket twice, (b) not letting the spike knock over the database, and (c) payment edge cases. Load balancing alone does not solve these.

## 3. Roles and permissions

Three staff roles plus customers. There is no door staff role for now.

| Capability | Admin | Manager | Promoter | Customer |
|---|---|---|---|---|
| Dashboard home (stats) | All | All | Own numbers only | n/a |
| Create events and tiers | Yes | **Yes** | No | n/a |
| Edit and publish events | Yes | Yes | No | n/a |
| Guestlist: add | Yes | Yes | Yes (own entries) | n/a |
| Guestlist: view | All | All | Own only | n/a |
| Guestlist: remove | Yes | Yes | No | n/a |
| Reservations: view and manage | Yes | Yes | No | n/a |
| Refunds | Yes | Up to a limit (TBD) | No | Request only |
| Users tab (IAM) | Yes | No | No | n/a |
| CSV export | Yes | Yes | No | n/a |
| Audit log | Yes | No | No | n/a |

Rules:
- Permissions are enforced on the server for every request. Hiding a menu item is not security.
- A promoter's menu shows only Home and Guestlist, and the API returns 403 for everything else.
- Staff log in on a separate route (`/manage/login`) with email and password. Admin and manager accounts should use 2FA (TOTP).
- Customers log in on `/login`. The "Management log in" button sits at the bottom of that page and links to `/manage/login`.

## 4. Product rules

### 4.1 Entry policy
- Only "Female" and "Couple" ticket types exist. There is deliberately no male single product.
- Customers must tick an agreement to the entry policy at checkout: female and couple entry only, couples enter together, photo ID is checked at the door and must match the ticket name.
- Gender cannot be verified online. Enforcement happens at the door by staff checking ID against the guest list exports (see 4.6).
- Couple tickets store both names.

### 4.2 Tickets and tiers
Each event has any number of **tiers** created by admin or manager. A tier is a row, so new names need no code change.

Tier fields: name (Early bird, VIP, Phase 1, Phase 2, anything), type (ticket or table), party type (female, couple), price, quantity, max per order, sale start, sale end, optional "opens when tier X sells out", perks text, sort order, active flag.

Examples: Early bird (Female), Phase 1 (Female), Phase 1 (Couple), VIP (Couple), Phase 2 (opens when Phase 1 sells out).

### 4.3 Table reservations (kept simple)
Reservations work exactly like tickets. There is no floor plan, no seat map and no table numbers.

- A table is a tier with type = table, for example **Table for 2**, **Table for 4**, **Table for 6+**. Admin or manager sets the sizes, price (booking amount), quantity available and sale window per event, like any other tier.
- Customer flow: pick the event (or date) on `/reservations`, pick a table size, enter lead guest name, phone and any special request, pay with Razorpay.
- The same 10-minute hold, atomic inventory check and webhook confirmation as tickets apply.
- The booking amount is treated as a deposit that is adjusted against the bill at the venue. **Assumption, please confirm.**
- Staff see bookings in the Reservations tab (this is just the list of paid table orders) and can export them to CSV.
- If the club wants reservations on a night with no ticketed event, staff create a normal event for that night with only table tiers.

### 4.4 Guestlist
- Admin and manager can add guestlist entries for any event.
- Promoters can add entries only for events and only see their own entries.
- Entry fields: name, phone, type (female or couple), plus count, notes (optional).
- Duplicate phone numbers within an event are flagged before saving.
- Guestlist per event can be exported to CSV by admin and manager.

### 4.5 Customer profile
Upcoming events and tickets (with QR code), past events, table bookings, account details, and a "delete my account and data" action.

### 4.6 CSV export (replaces door scanner for now)
There is no scanner and no door staff role. Instead, staff export lists and use them at the door.

Each of these has a **Save as CSV** button:

| Export | Where | Columns |
|---|---|---|
| Event list | Events tab | event name, date, status, capacity, tickets sold, tables booked, revenue |
| Guestlist | Guestlist tab (per event) | event, name, phone, type, plus count, added by, added at, notes |
| Reservations | Reservations tab (per event) | event, booking ID, lead guest name, phone, table type, party size, amount paid, status, special request, booked at |
| Attendees (suggested addition) | Events tab (per event) | event, order ID, ticket holder name(s), tier, party type, phone, status |

The attendee export is not in your list but is what makes the door workable without a scanner, because it is the list of everyone who bought a ticket. Recommended for MVP.

Export rules:
- Only admin and manager can export.
- Files are UTF-8 with a BOM so Excel opens Hindi and other scripts correctly.
- Any cell starting with `=`, `+`, `-` or `@` is prefixed with `'` to prevent spreadsheet formula injection from guest-entered names.
- Every export is written to the audit log (who, what, when).
- The QR code on tickets is still generated and stored, so a scanner can be added later without changing tickets.

## 5. Architecture

```
Users -> Cloudflare (CDN, WAF, bot protection, cache)
      -> Fly.io Mumbai (bom): 2+ app machines, always on, load balanced
             Next.js + TypeScript (web and API in one app)
      -> Managed Postgres (Mumbai region) with a connection pooler
      -> Razorpay (orders, checkout, webhooks, refunds)
      -> Email provider (tickets, receipts)
      -> Object storage (posters, gallery images)
```

### 5.1 Stack
- **App:** Next.js with TypeScript, single codebase for site, API and dashboard. No microservices.
- **Database:** PostgreSQL, managed, in a Mumbai-area region. Prisma or Drizzle as ORM. Use PgBouncer or the provider's pooler.
- **Cache and rate limits:** start without Redis. Use CDN caching and Postgres. Add Redis only if load testing shows a need.
- **Payments:** Razorpay Orders API, Checkout, Webhooks, Refunds API.
- **Email:** Resend, Postmark or SES.
- **Observability:** Sentry for errors, uptime monitor, structured logs.
- **CI/CD:** GitHub Actions to Fly.io deploy.

### 5.2 Hosting and availability (Fly.io)
- Region: Mumbai (verify it is available to your account before committing).
- Run at least 2 machines, always on. Disable auto-stop and auto-suspend so there are no cold starts.
- Do not run Postgres yourself on Fly. Use a managed Postgres with automatic backups and failover.
- Health checks on every machine and rolling deploys.
- Keep a documented fallback: the app is containerized so it can be redeployed to Render or AWS Mumbai if Fly has an incident.
- Do not deploy on event nights or on-sale days.

### 5.3 Handling the 20k spike
1. Cloudflare caches public pages (home, events list, gallery, menu). They never hit the app during the spike.
2. "Tickets left" counts are cached for a few seconds.
3. Once a tier is sold out, the "sold out" state is served from cache without a database query.
4. Rate limit per IP and per account on login, hold and checkout endpoints. Bot challenge (Cloudflare Turnstile) on login and checkout.
5. Maximum tickets per account per tier (suggest 4).
6. Database inventory changes use one atomic statement:
   `UPDATE ticket_tiers SET remaining = remaining - :qty WHERE id = :id AND remaining >= :qty`
   If no row is updated, the tier is sold out. This cannot oversell.
7. Connection pooling keeps thousands of requests from exhausting Postgres connections.
8. A virtual waiting room is **not** in the MVP. Add it later only if load tests show checkout struggling.

### 5.4 Booking and payment flow
1. Customer picks a tier and quantity. Server runs the atomic decrement and creates a **hold** (expires in 10 minutes).
2. Customer enters names (and policy agreement). Server creates a pending order and a Razorpay Order. The amount is always computed server-side.
3. Razorpay Checkout opens in the browser. Customer pays.
4. Browser returns a signature. The server verifies it, but **does not issue tickets yet**.
5. The `payment.captured` webhook is the source of truth. It marks the order paid, creates tickets with QR codes, and sends the email.
6. A scheduled job runs every minute to expire holds and return inventory.
7. If payment arrives after the hold expired, the server tries to re-take inventory. If that fails, it refunds automatically.
8. A nightly reconciliation job compares Razorpay payments with orders and flags mismatches.

Rules:
- Webhook handling is idempotent: store each Razorpay event ID with a unique constraint and ignore repeats.
- Verify the webhook signature on every call.
- Create the Razorpay order only when the customer proceeds to pay, not at tier selection.
- Never trust prices or quantities from the client.

## 6. Data model

All money in paise (integers). All timestamps in UTC, displayed in IST.

| Table | Key fields |
|---|---|
| `users` (customers) | id, phone, email, name, dob, created_at, deleted_at |
| `staff` | id, name, email, password_hash, role (admin, manager, promoter), totp_secret, status |
| `events` | id, title, description, poster_url, starts_at, doors_at, capacity, status (draft, published, cancelled), created_by_staff_id |
| `ticket_tiers` | id, event_id, name, kind (ticket, table), party_type (female, couple, table), seats, price_paise, quantity, remaining, max_per_order, sale_starts_at, sale_ends_at, opens_when_tier_id, perks, sort_order, active |
| `holds` | id, user_id, tier_id, qty, expires_at, status (active, converted, expired) |
| `orders` | id, user_id, event_id, status (pending, paid, failed, expired, refunded, part_refunded), total_paise, razorpay_order_id, policy_accepted_at |
| `order_items` | id, order_id, tier_id, qty, unit_price_paise, holder_names (json), party_size, lead_phone, notes |
| `tickets` | id, order_item_id, code, holder_name, status (valid, void), qr_payload |
| `payments` | id, order_id, razorpay_payment_id, status, amount_paise, raw (json) |
| `webhook_events` | razorpay_event_id (unique), type, payload, processed_at |
| `refunds` | id, payment_id, amount_paise, reason, status, created_by (staff or system) |
| `guestlist_entries` | id, event_id, name, phone, party_type, plus_count, notes, added_by_staff_id, created_at |
| `audit_log` | id, staff_id, action, entity, entity_id, diff (json), created_at |

Notes:
- Reservations are `orders` and `order_items` whose tier has kind = table. There is no separate reservations table.
- Add a unique constraint on (event_id, phone) in `guestlist_entries`, or check in code, to flag duplicates.
- Index `ticket_tiers(event_id)`, `orders(user_id)`, `orders(razorpay_order_id)`, `holds(expires_at)`.

## 7. Screens and routes

Public and customer:
- `/` Homepage: hero with next event, events, gallery, menu, reservations, log in
- `/events` Events list
- `/events/[id]` Event detail, tier picker, checkout
- `/reservations` Table booking (pick event, pick table size, pay)
- `/login` Log in and sign up, with "Management log in" button at the bottom
- `/profile` Upcoming events and tickets, past events, table bookings, account

Management (`/manage/*`, role-based):
- `/manage` Home (stats)
- `/manage/events` Events list, create and edit, tier builder, Save as CSV
- `/manage/guestlist` Guestlist per event, add entries, Save as CSV
- `/manage/reservations` Table bookings per event, Save as CSV
- `/manage/users` IAM (admin only): invite staff, assign role, suspend

## 8. Authentication
- **Customers:** phone OTP is the preferred method. Fallback options: email magic link and Google login.
- **Staff:** email and password with TOTP 2FA for admin and manager. Invites by email. Suspending a staff member ends their sessions.
- **Risk:** SMS OTP in India needs DLT registration, which can take days. Start it now, or launch with email magic link and add phone OTP later.
- Sessions use secure, HTTP-only cookies. CSRF protection on all mutating requests.

## 9. Non-functional requirements

| Area | Target |
|---|---|
| Latency | Public pages under 300 ms from India; API p95 under 500 ms under load |
| Availability | No planned downtime on sale days; 2+ always-on machines; managed DB with failover |
| Capacity | Pass a k6 load test of 20,000 concurrent users on the event page and 2,000 concurrent checkouts before launch |
| Correctness | Zero oversells in the load test; verified by comparing tickets issued with tier quantity |
| Security | Server-side authorization on every route, rate limits, input validation, signed webhooks, secrets in environment variables, HTTPS only |
| Privacy | Consent at sign-up, account deletion on request, phone numbers masked from promoters, data stored in India region |
| Backups | Daily automatic backups, point-in-time recovery, test a restore once before launch |
| Accessibility | Touch targets at least 44 px, readable contrast, works at phone width |

## 10. Payments and tax
- Razorpay live mode needs business KYC approval. **Apply on day 1**, build in test mode until approved.
- Show price, platform fee and GST as separate lines at checkout.
- Generate a GST invoice per order (Phase 2 if you are not GST-registered yet).
- Publish a refund and cancellation policy and link it from the footer and checkout.
- Refunds go through the Razorpay Refunds API and are logged.

## 11. Two-week plan

Two people. Suggested split: **Dev A** backend, payments and data. **Dev B** frontend, dashboard and exports. Both review each other's code.

**Day 0 (before starting):** apply for Razorpay live access, start DLT registration, create Fly.io, Cloudflare, managed Postgres and email accounts, set up the repo and CI.

| Days | Dev A | Dev B |
|---|---|---|
| 1 to 2 | Schema and migrations, customer auth, staff auth and roles middleware | App shell, design tokens, homepage, events list |
| 3 to 4 | Tier model, atomic inventory, holds and expiry job | Event detail, tier picker, checkout UI, login and sign-up |
| 5 to 6 | Razorpay order, signature check, webhook, ticket and QR creation, email | Profile page, e-ticket view, table booking page |
| 7 | **Checkpoint:** full ticket purchase works in Razorpay test mode end to end | |
| 8 to 9 | Guestlist API, reservations listing, refunds, auto-refund on late payment | Management shell, Home, Events tab with tier builder |
| 10 to 11 | CSV export endpoints (events, guestlist, reservations, attendees), audit log | Guestlist, Reservations and Users tabs, export buttons |
| 12 | k6 load test at 20k, fix bottlenecks, rate limits | Cloudflare caching rules, polish, accessibility pass |
| 13 | Deploy to production, Razorpay live mode, restore test of backups | Real-device testing, copy and policy pages |
| 14 | Buffer, dry run with a small private test event, fix issues | Buffer |

Drop order if time runs short (drop from the bottom first):
1. Phone OTP (use email or Google)
2. Attendees CSV
3. Audit log UI (keep writing the log)
4. Admin 2FA

Never drop: atomic inventory, holds, webhook confirmation, server-side role checks, load test.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Razorpay KYC delay | Apply day 1; build in test mode; keep a manual payment-link fallback |
| SMS OTP DLT delay | Launch with email magic link or Google login |
| Fly.io incident on an on-sale day | 2+ machines, managed DB, tested fallback deploy, no deploys on sale days |
| Overselling under load | Single atomic update, load test checks tickets issued equals quantity |
| Missed or duplicated webhooks | Idempotent handler, nightly reconciliation |
| Fake or resold tickets | Name on ticket, ID check at door, per-account caps |
| Gender rule disputes | Policy shown at tier picker and checkout, acceptance stored with timestamp |
| Scope creep in 2 weeks | Follow the drop order in section 11 |

## 13. Out of scope for the 2-week launch
Door staff role and ticket scanner, table floor plan or seat selection, virtual waiting room, promoter referral links and commissions, WhatsApp ticket delivery, ticket transfer, custom roles, wallet passes, promo codes, waitlist, loyalty features.

## 14. Open questions
1. Manager refund limit: a rupee amount, or no limit?
2. Is the table booking amount a deposit adjusted against the bill, or a fixed fee?
3. Does the female and couple rule also apply to table parties? If yes, the table booking should collect every guest's name.
4. Minimum age (21+ or per state excise rules) and what ID is accepted.
5. Maximum tickets per account per tier (suggested 4).
6. Is the business GST-registered, and should invoices be in the MVP?
7. Refund and cancellation policy text and cutoff time.
8. Hold duration: 10 minutes is suggested.
9. Do promoters need a quota and cutoff time per event in the MVP, or is it Phase 2?

## 15. Changes since the wireframes
- **Reservations:** the floor plan screen is superseded. Use a simple list of table-size options (Table for 2, 4, 6+) with the same flow as tickets. The staff Reservations tab becomes a plain list with Save as CSV.
- **Door scanner:** the scanner screen and door staff role are removed from the MVP. The e-ticket QR stays.
- **Managers:** can create events, so the Users permission matrix should show a tick for create.
- **CSV:** add Save as CSV buttons to the Events, Guestlist and Reservations tabs.
