# Market Refresh Cron (Railway)

This service is a short-lived Railway cron worker that calls:

- `POST ${MARKET_SERVICE_URL}/api/refresh`

It exits immediately after the request finishes, which matches Railway cron requirements.

## Required Environment Variables

- `MARKET_SERVICE_URL` (example: `https://your-market-service.up.railway.app`)
- `ANALYSIS_SERVICE_API_KEY` (must match your market-service key)

## Default Schedule

Defined in `railway.json`:

- `0 * * * *` (hourly, UTC)

Change `deploy.cronSchedule` if you want a different cadence.
