# NAUTILUS Data Ingestion Scripts

## What's real

All data in `peru_trade_flows` comes from **OEC BACI** (UN COMTRADE normalized).
This is the authoritative source for bilateral trade flows — used by the World Bank, IMF, and academic researchers.

- Source: https://api.oec.world
- Coverage: Peru exports of copper ore, zinc ore, lead ore, copper matte, refined copper
- Countries: all major importers (China, Japan, Canada, Germany, South Korea, etc.)
- Years: 2019–2024

## Scripts

### `ingest-oec.ts`
Pulls 2023-2024 data from OEC BACI API for key HS codes.
```
npx tsx scripts/ingest-oec.ts
```

### Package.json commands
```
npm run ingest:oec   — pull latest OEC data
npm run ingest:daily — run all ingestion
```

## Vessel-level data (TODO)

Real vessel calls at Callao/Matarani require one of:
- **MarineTraffic API** (~$150/mo) — vessel positions, port calls, ETAs
- **AIS Hub** (~$50/mo) — raw AIS stream
- **SUNAT** — Peru customs manifest scraper (free, complex)

Current data: country-level annual aggregates (real, authoritative, no vessel names)
Next level: company-level + vessel-level (requires paid AIS feed or SUNAT scraper)
