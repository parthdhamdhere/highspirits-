# Features

Companion to SPEC.md. Status key: **MVP** = in the 2-week launch, **P2** = after launch, **Later** = not planned yet.
Tick the boxes as you build.

---

## 1. Public site

- [ ] **MVP** Homepage with hero (next event), events, gallery, menu, reservations and log in
- [ ] **MVP** Hero shows next event, price from, tickets left and a "Get tickets" button
- [ ] **MVP** Events list page with tier status per event (on sale, sold out, opens soon)
- [ ] **MVP** Event detail page with description, lineup, entry policy and tier picker
- [ ] **MVP** Gallery (photos)
- [ ] **MVP** Menu (food, cocktails, spirits)
- [ ] **MVP** Footer with entry policy, dress code, age limit, refund policy, terms, privacy, contact
- [ ] **MVP** Public pages cached on the CDN
- [ ] P2 Aftermovie videos in the gallery
- [ ] P2 "Remind me" when sales open
- [ ] P2 Waitlist when sold out
- [ ] Later Share cards and SEO event pages

## 2. Accounts and login

- [ ] **MVP** Customer sign up and log in (phone OTP preferred, email magic link as fallback)
- [ ] **MVP** Date of birth captured for the age check
- [ ] **MVP** Log in page has a "Management log in" button at the bottom
- [ ] **MVP** Separate staff login at `/manage/login` (email and password)
- [ ] **MVP** Rate limits and bot challenge on login
- [ ] **MVP** Delete my account and data
- [ ] P2 Google login
- [ ] P2 2FA (TOTP) for admin and manager (aim for MVP if time allows)

## 3. Tickets

- [ ] **MVP** Only Female and Couple ticket types (no male single)
- [ ] **MVP** Customizable tiers per event: early bird, VIP, Phase 1, Phase 2 and any other name
- [ ] **MVP** Tier settings: price, quantity, max per order, sale start and end, perks, sort order
- [ ] **MVP** Couple ticket captures both names
- [ ] **MVP** Entry policy agreement checkbox at checkout, stored with a timestamp
- [ ] **MVP** Tickets held for 10 minutes while the customer pays, with a visible countdown
- [ ] **MVP** Sold-out state shown instantly from cache
- [ ] **MVP** Max tickets per account per tier
- [ ] **MVP** QR code on every ticket
- [ ] **MVP** Ticket delivered by email after payment is confirmed
- [ ] P2 "Opens when Phase 1 sells out" automatic tier opening
- [ ] P2 Ticket transfer to another name
- [ ] P2 Promo codes
- [ ] Later Wallet pass (Apple and Google)
- [ ] Later WhatsApp ticket delivery
- [ ] Later Virtual waiting room (only if load tests need it)

## 4. Table reservations (simple, like tickets)

- [ ] **MVP** Table options are tiers: Table for 2, Table for 4, Table for 6+ (sizes configurable)
- [ ] **MVP** Customer picks event or date, picks table size, enters lead name, phone and special request
- [ ] **MVP** Same 10-minute hold, same Razorpay payment, same confirmation email as tickets
- [ ] **MVP** Booking amount treated as a deposit against the bill (to confirm)
- [ ] **MVP** Reservations appear in the dashboard Reservations tab
- [ ] **MVP** Nights without an event can still sell tables by creating a tables-only event
- [ ] Later Floor plan, table numbers and seat selection
- [ ] Later Table waitlist

## 5. Payments (Razorpay)

- [ ] **MVP** Razorpay Orders API, amount calculated on the server
- [ ] **MVP** Razorpay Checkout (UPI, cards, netbanking, wallets)
- [ ] **MVP** Payment signature verification
- [ ] **MVP** Webhook is the source of truth; idempotent handler with stored event IDs
- [ ] **MVP** Price, platform fee and GST shown as separate lines
- [ ] **MVP** Automatic refund if a payment arrives after the hold expired and inventory is gone
- [ ] **MVP** Admin and manager can refund (manager up to a limit, to confirm)
- [ ] P2 Nightly reconciliation job between Razorpay and orders
- [ ] P2 Customer refund request inside the policy window
- [ ] P2 GST invoice download (MVP if GST-registered)
- [ ] Later Resume a failed payment inside the hold

## 6. Customer profile

- [ ] **MVP** Upcoming events and tickets with QR
- [ ] **MVP** Past events
- [ ] **MVP** Table bookings
- [ ] **MVP** Account details
- [ ] P2 Cancel or transfer a booking
- [ ] P2 Download invoices

## 7. Management dashboard

Tabs: **Home, Events, Guestlist, Reservations, Users.** Menu and actions depend on role (see section 8).

### Home
- [ ] **MVP** Revenue, tickets sold, tables booked, guestlist count for the selected event
- [ ] **MVP** Promoter home shows only their own numbers
- [ ] P2 Sales over time by tier chart
- [ ] P2 "Needs attention" list (pending payments, refund requests)

### Events (admin and manager)
- [ ] **MVP** Create, edit, publish and unpublish events
- [ ] **MVP** Poster upload, date, doors time, capacity, description
- [ ] **MVP** Tier builder for ticket and table tiers
- [ ] **MVP** Event status: draft, on sale, sold out, cancelled
- [ ] **MVP** **Save as CSV** for the event list
- [ ] **MVP (suggested)** **Save as CSV** for the attendee list of one event
- [ ] P2 Duplicate an event
- [ ] P2 Scheduled sale open and close

### Guestlist
- [ ] **MVP** Add entries: name, phone, type (female or couple), plus count, notes
- [ ] **MVP** Duplicate phone warning
- [ ] **MVP** Promoter sees and adds only their own entries
- [ ] **MVP** Admin and manager see all entries
- [ ] **MVP** **Save as CSV** for the guestlist (admin and manager)
- [ ] P2 Promoter quota and cutoff time per event
- [ ] P2 Upload guests by CSV
- [ ] P2 Free-entry pass sent to guests

### Reservations (admin and manager)
- [ ] **MVP** List of table bookings per event with status
- [ ] **MVP** **Save as CSV** for reservations
- [ ] **MVP** Admin and manager can add a manual reservation
- [ ] P2 Manual booking sent as a payment link
- [ ] P2 Block a table type for sponsors or VIPs

### Users (admin only, IAM)
- [ ] **MVP** Invite staff by email
- [ ] **MVP** Assign role: admin, manager or promoter
- [ ] **MVP** Suspend or reactivate a user (ends their sessions)
- [ ] P2 Audit log view
- [ ] Later Custom roles

## 8. Roles

| Capability | Admin | Manager | Promoter |
|---|---|---|---|
| Home stats | All | All | Own only |
| Create and edit events | Yes | Yes | No |
| Guestlist add | Yes | Yes | Own entries |
| Guestlist view | All | All | Own only |
| Reservations | Yes | Yes | No |
| Refunds | Yes | Up to limit (TBD) | No |
| Users (IAM) | Yes | No | No |
| CSV export | Yes | Yes | No |

All checks are enforced on the server.

## 9. CSV exports

| Export | Columns |
|---|---|
| Event list | event name, date, status, capacity, tickets sold, tables booked, revenue |
| Guestlist | event, name, phone, type, plus count, added by, added at, notes |
| Reservations | event, booking ID, lead guest name, phone, table type, party size, amount paid, status, special request, booked at |
| Attendees (suggested) | event, order ID, holder name(s), tier, party type, phone, status |

- [ ] **MVP** UTF-8 with BOM so Excel reads it correctly
- [ ] **MVP** Cells starting with `=`, `+`, `-` or `@` are escaped
- [ ] **MVP** Every export is written to the audit log
- [ ] **MVP** Admin and manager only

## 10. Platform and reliability

- [ ] **MVP** Next.js and TypeScript app on Fly.io Mumbai, at least 2 machines always on, no auto-stop
- [ ] **MVP** Managed Postgres with connection pooler, daily backups, tested restore
- [ ] **MVP** Cloudflare in front for CDN, WAF and caching
- [ ] **MVP** Atomic inventory update (no overselling)
- [ ] **MVP** Hold expiry job runs every minute
- [ ] **MVP** Rate limits per IP and per account
- [ ] **MVP** Sentry error tracking and uptime monitor
- [ ] **MVP** k6 load test: 20,000 users on the event page, 2,000 concurrent checkouts, zero oversells
- [ ] **MVP** Audit log recorded for staff actions
- [ ] P2 Redis, only if load tests show it is needed
- [ ] P2 Documented fallback deploy (Render or AWS Mumbai) rehearsed

## 11. Not in this version

Door staff role and ticket scanner, floor plan and seat selection, virtual waiting room, promoter referral links and commissions, WhatsApp delivery, wallet passes, custom roles, loyalty features.

## 12. Start-today checklist

- [ ] Apply for Razorpay live-mode activation (KYC)
- [ ] Start DLT registration for SMS OTP (or decide on email and Google login)
- [ ] Create Fly.io, Cloudflare, managed Postgres and email provider accounts
- [ ] Write the entry policy, dress code, age limit and refund policy text
- [ ] Decide the open questions in SPEC.md section 14
