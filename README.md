# Warm Home Grant — Sales Checker

Mobile-first Warmer Kiwi Homes eligibility funnel for Facebook / paid ads.

## Why this exists

A streamlined conversion tool: 4 taps, big mobile buttons, auto-advance on yes/no, phone-first lead capture, and clear existing-claim handling.

## Flow

1. NZ address + consent  
2. Own & live here? (rentals exit early)  
3. Built before 2008?  
4. Community Services Card? → EECA + NZDep check  
5. Result → callback form (extra fields if existing claim)

## Funding rules

| Situation | Funding |
| --- | --- |
| Community Services Card | 90% |
| NZDep 5–7 | 50% |
| NZDep 8 | 80% |
| NZDep 9–10 | 90% |
| Zones 1–4 without CSC | Not eligible |

Existing claim = EECA `hasInsulation` (ceiling & underfloor on record) and/or open requests.

## Run locally

```bash
npm install
npx playwright install chromium
npm run dev
```

Open http://localhost:3001 (or 3000 if free).

### Email (optional)

```bash
export RESEND_API_KEY=re_xxx
export NOTIFY_EMAIL=insulator.dan@gmail.com
```

Without email keys, leads save to SQLite + `data/outbox/`.

## Stack

Next.js · AddressRight · Playwright (EECA) · ArcGIS NZDep2023 · SQLite · Resend/SMTP/outbox
