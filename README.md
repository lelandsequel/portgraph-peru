# PortGraph Peru

**Maritime Trade Intelligence for Peru's Export Corridors**

Confidence-scored trade intelligence platform. Ingests bilateral trade data from the OEC (Observatory of Economic Complexity) BACI dataset — normalizes entities, reconstructs trade relationships, and surfaces intelligence on what is moving through Peru's ports, who is buying it, and how those relationships are changing year-over-year.

## Data Source

- **OEC BACI** — Annual bilateral trade flows via the Tesseract API (free, no key)
- **Granularity:** Annual, country-level (not vessel-level)
- **Years:** 2019–2022
- **Commodities:** Copper ore/concentrate (HS 2603), zinc ore (HS 2608), lead ore (HS 2607), precipitated copper (HS 7401), refined copper (HS 7403)

## Hero Question

> "Who is buying Peruvian copper concentrate? How have those relationships changed year-over-year?"

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres)
- Vercel deployment

## COSMIC Pipeline

- **METEOR** — Entity Resolution (countries, companies, ports)
- **COMET** — Cargo Chain Reconstruction (origin → Peru → destination)
- **AURORA** — Confidence Scoring + Provenance (HIGH/MEDIUM/LOW per record)
- **QUASAR** — Anomaly Detection (YoY changes, emerging corridors, new relationships)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local .env.local
# Edit .env.local with your Supabase keys

# 3. Set up database
# Copy src/lib/db/schema.sql into Supabase SQL Editor and execute

# 4. Seed data (fetches real OEC data + runs full pipeline)
npx tsx scripts/seed.ts

# 5. Run development server
npm run dev
```

## Product Views

- **Intelligence Query** (`/`) — Search-first hero workflow. Enter commodity/country/company, get Trade Intelligence Profile with observed + enriched + inferred sections
- **Trade Feed** (`/feed`) — Chronological trade activity with confidence tiers
- **Route Map** (`/map`) — Flow lines from Peru to destination countries

## Key Features

- Every relationship carries a confidence tier (HIGH / MEDIUM / LOW)
- Inferred intelligence is visually distinct from observed facts
- Provenance panel shows source chain for any data card
- AURORA score < 0.80 = flagged, not hidden
- Entity resolution before chain building (METEOR before COMET)
- Year-over-year analysis flags emerging corridors (>25% growth) and new relationships
