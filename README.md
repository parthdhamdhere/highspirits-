# highspirits-

Web application for highspirts cafe, Pune. Mobile-first customer booking and desktop-friendly staff operations.

## Tech Stack & Architecture

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Fastify, TypeScript, PostgreSQL
- **Shared Contracts**: `@highspirits/contracts` (TypeScript definitions and shared schemas)

## Features

- Event discovery & ticket booking (female and couple entry, 21+ verification)
- Table reservations & cover charge management
- QR code ticket generation & retrieval
- Operations portals for Admin, Manager, and Promoters
- Atomic inventory holds and automated payment reconciliation

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Setup & Installation

```bash
# Install dependencies
npm install

# Run frontend
cd frontend
npm run dev

# Run backend
cd backend
npm run dev
```

## Verification

- `npm test`: unit and API/database integration tests, including session recovery, role permissions, inventory, payments, deletion and content management.
- `npm run typecheck`: TypeScript checks for both applications.
- `npm run build`: production frontend build and type checks.
- `npm run test:system`: builds an isolated frontend, starts a temporary in-memory API on port 4002 and frontend on port 3002, then runs real Chrome acceptance journeys. Requires Chrome/Chromium and the installed project Taste skill. Test services are stopped automatically. Existing services on those ports are protected.

The system suite covers signup, login, logout, cross-tab session changes, tickets and tables with demo payments, QR profiles, staff event editing, guestlists, manual reservations, charges, invitations, gallery/menu publishing, promoter restrictions, mobile layouts and account deletion. No real payments or emails are sent. Test screenshots and results are stored in `.taste-skill/acceptance/`.
