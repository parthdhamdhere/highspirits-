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
