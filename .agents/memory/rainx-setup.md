---
name: RainX setup
description: Architecture, key files, env vars, and known constraints for the RainX trading app.
---

## Architecture

- `artifacts/rainx` — React + Vite frontend (JSX, Supabase auth, lightweight-charts)
- `artifacts/api-server` — Express 5 backend; runs on PORT env var (assigned by Replit)
- Supabase credentials are hardcoded in `artifacts/rainx/src/supabaseClient.ts`
- All chart data comes from Yahoo Finance via `/api/candles` in the Express server

## Symbol mapping (Yahoo Finance)
- Crypto: `BTCUSD` → `BTC-USD`, `ETHUSD` → `ETH-USD`, etc.
- Forex 6-char: `EURUSD` → `EURUSD=X`
- Gold: `XAUUSD` → `GC=F`

## API routes (artifacts/api-server/src/routes/)
- `GET /api/candles?symbol&interval&limit[&before]` — Yahoo Finance OHLCV proxy; returns `{ values: [{datetime,open,high,low,close}] }` newest-first
- `GET /api/price?symbol` — live price from Yahoo Finance 1m chart
- `/api/proxy/*`, `/api/chat`, `/api/signals/*` — forwarded to `RAINA_AI_URL` (Railway bot)
- `/api/push/keys`, `/api/push/subscribe` — push notification VAPID (needs `VAPID_PUBLIC_KEY`)

## Required env vars (not yet set)
- `RAINA_AI_URL` — Railway bot URL; without it, signals/chat return 503 (expected)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — for push notifications

## Key constraints
- `artifacts/api-server/src/routes/proxy.ts` uses `router.use()` not `router.all()` for wildcard routes — Express 5 / path-to-regexp v8 rejects `/*` and `(.*)` patterns in `.all()`
- `RainxApp.jsx` is plain JSX — no TypeScript type annotations allowed in `.jsx` files
- `LightweightChart.jsx` already has `autoscaleInfoProvider` to prevent SL/TP price lines from squishing candles
- SW message listener for PLAY_SOUND is already wired in RainxApp.jsx (lines ~1195-1207)
- Profile save uses `saveProfileExtended` which does a 3-step Supabase upsert; 503s on signals are unrelated

**Why:** These constraints caused build/runtime failures and were non-obvious from reading the code.
