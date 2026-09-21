# MarketLens Food Price Intelligence

A responsive decision-support frontend for exploring Sri Lankan food prices, generating transparent forecasts, and comparing economic scenarios. The app runs with representative demo data by default and is ready to connect to the REST API described in the project PRD.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The interface displays a **Demo data** indicator whenever the local mock client is active.

## API mode

Copy `.env.example` to `.env` and choose a mode:

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=/api
```

Set `VITE_API_MODE=live` to use the configured backend. The frontend expects `/metadata`, `/prices`, `/overview`, `/predict`, `/model/info`, and `/health` beneath `VITE_API_BASE_URL`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The application intentionally excludes authentication, exports, maps, alerts, saved accounts, supplier recommendations, and inventory recommendations from this MVP.
