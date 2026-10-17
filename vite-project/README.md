# GhostCheck — Solana Token Safety Checker

## Project structure

- `src/` + `index.html` + `vite.config.js` — React frontend (Vite + Tailwind)
- `backend/` — standalone Express API (`/api/analyze`), deployable as its own service
- `scripts/dev.mjs` — runs the API and the Vite dev server together for local development

## Local development

```bash
npm install
npm install --prefix backend   # first time only
npm run dev                    # API on http://localhost:5174, web on http://localhost:5173
```

`npm run dev` starts both processes. Vite proxies `/api/*` to the backend, so the
frontend works with same-origin paths during development. You can also run them
separately: `npm run dev:api` and `npm run dev:web`.

## Token analysis setup

Copy `.env.example` to `.env`. Dexscreener supplies the market data without an API key.

**Backend environment variables (set these on Render, or in `.env` for local runs):**

- `SOLSCAN_API_KEY` — optional, Solscan Pro API key for token metadata/holder enrichment
- `CHAT_B_AI_API_KEY`, `CHAT_B_AI_API_URL`, `CHAT_B_AI_MODEL` — optional, OpenAI-compatible provider for AI explanations
- `CORS_ORIGIN` — optional, restrict API access to your deployed frontend origin

Holder distribution, contract permissions, and honeypot status are unavailable
from Dexscreener and are never treated as passed. Never expose API keys through
`VITE_` variables or client-side code.

## Deploying the backend to Render

1. Create a **Web Service** on Render from this repository.
2. Set the **Root Directory** to `backend`.
3. Build command: `npm install` · Start command: `npm start`.
4. Add any optional env vars above (`CORS_ORIGIN` should be your frontend's URL).
5. Note the service URL, e.g. `https://ghostcheck-api.onrender.com`.

## Deploying the frontend

Host the static build (`npm run build` → `dist/`) on Render Static, Netlify,
Vercel, or any static host, and set `VITE_API_URL` to the backend URL from the
previous step before building. Without it, the frontend calls same-origin
`/api/analyze`, which only works when the backend runs behind the same origin.

### Render static site

- Root Directory: repo/project root · Build command: `npm install && npm run build`
- Publish directory: `dist` · Env var: `VITE_API_URL=https://<your-api>.onrender.com`
