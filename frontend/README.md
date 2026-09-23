# MarketLens Food Price Intelligence

A frontend for exploring historical Sri Lankan food prices and the R Plumber models. It connects to the real backend by default. A separate demo mode retains the illustrative price forecasts and economic scenarios.

## Run locally

Start the backend from the repository root in a separate PowerShell terminal (the analytics pipeline must already have generated `model_bundle.rds`):

```powershell
& "C:\Program Files\R\R-4.5.1\bin\Rscript.exe" api/run_api.R
```

Then run these commands inside `frontend`:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Look for **Backend data** and **Backend connected**. The dev server proxies `/api` to `http://127.0.0.1:8000`.

Select **Lentils → Ampara**, open **Movement Forecast**, and click **Generate forecast**. The displayed movement magnitude and probability should match `POST /api/predictions` for commodity `108` and market `360`.

## API mode

Copy `.env.example` to `.env` and choose a mode:

```env
VITE_API_MODE=live
VITE_API_BASE_URL=/api
```

`live` is the default even without an environment file. Set `VITE_API_MODE=mock` for the original demo screens. Restart Vite after changing environment settings. Backend failures display an error and never fall back to fabricated data.

| Screen | R API routes beneath `/api` |
| --- | --- |
| Service status | `/health` |
| Food and market selection | `/foods`, `/markets?commodity_id=...` |
| Overview and Market Explorer | `/metadata`, `/prices/history?commodity_id=...&market_id=...` |
| Market volatility | `/volatility/history?commodity_id=...&market_id=...` |
| Movement Forecast | `POST /predictions` with numeric `commodity_id` and `market_id` |
| Model Insights | `/models/performance` |

The live forecast reports **movement magnitude in either direction** and the **probability of a change exceeding 10%**. It does not estimate a future price, multi-month path, or confidence interval. The data cutoff and forecast month are displayed explicitly. Economic scenario controls are available only in demo mode because the R models do not accept these inputs.

The API client normalizes Plumber's scalar arrays without flattening dataset rows and treats omitted R missing values as unavailable. Model Insights displays MAE/RMSE in percentage points and identifies when a benchmark outperforms the Ridge model currently served by the prediction endpoint.

For a production build, configure a reverse proxy for `/api`, or set `VITE_API_BASE_URL` to the backend's full API URL **before building**. The local dev proxy is not a production server.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite checks both demo and live modes on desktop and mobile. Most tests use fixed API fixtures and do not require R. To additionally test the running R server through the frontend, use:

```powershell
$env:TEST_REAL_BACKEND = "1"
npm run test:e2e
```

The suite needs a Playwright Chromium installation. If using an installed Microsoft Edge instead, set `$env:PLAYWRIGHT_CHANNEL = "msedge"` before running it.

The application intentionally excludes authentication, exports, maps, alerts, saved accounts, supplier recommendations, and inventory recommendations from this MVP.
