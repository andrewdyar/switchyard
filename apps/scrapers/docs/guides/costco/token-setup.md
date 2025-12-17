# Costco Token Management Setup

The Costco token management system automatically stores and refreshes JWT tokens using Upstash Redis, similar to the Walmart cookie management system. **It runs automatically in the background - no manual updates needed once configured.**

## Initial Setup

### 1. Set Costco Credentials for Automatic Refresh

Set these environment variables in Vercel for automatic token refresh:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `COSTCO_EMAIL` with your Costco account email
3. Add `COSTCO_PASSWORD` with your Costco account password
4. (Optional) Add `COSTCO_AUTHORIZATION_TOKEN` with an initial token (will be saved to Redis)
5. Redeploy the application

### 2. Verify Upstash Redis is Configured

Ensure these environment variables are set in Vercel:
- `UPSTASH_REDIS_REST_URL` - Your Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Your Upstash Redis REST token

## How Automatic Refresh Works

1. **Vercel Cron Job:** Runs every 15 minutes automatically
2. **Token Check:** Checks if the current token is older than 15 minutes
3. **Browser Automation:** If token needs refresh and credentials are set:
   - Automatically logs into Costco.com using your credentials
   - Navigates to pages that trigger API calls
   - Extracts the JWT token from network requests
   - Saves the new token to Redis
4. **Automatic Usage:** Your app automatically uses the latest token from Redis on each request

**No manual intervention needed** - it works exactly like the Walmart cookie refresh system.

## Token Storage

- **Redis (Production):** Tokens are stored in Upstash Redis, persisting across serverless invocations
- **File (Local Dev):** Falls back to `.costco_token.json` for local development
- **Environment Variable:** Initial token can be set via `COSTCO_AUTHORIZATION_TOKEN` env var

## Token Expiration

Costco JWT tokens typically expire in 30-60 minutes. The system:
- Checks token age every 15 minutes via cron job
- Automatically refreshes before expiration
- Always uses the latest token from Redis

## Troubleshooting

### Token Not Refreshing Automatically

1. **Check Credentials:**
   - Verify `COSTCO_EMAIL` and `COSTCO_PASSWORD` are set in Vercel
   - Ensure credentials are correct

2. **Check Cron Job:**
   - Verify the cron job is configured in `vercel.json`
   - Check Vercel logs for cron job execution

3. **Check Token Status:**
   ```bash
   curl https://your-app.vercel.app/api/refresh-costco-token
   ```
   This will show token age and refresh status.

### Manual Token Update (Fallback)

If automatic refresh fails, you can manually update the token:

```bash
curl -X POST https://your-app.vercel.app/api/refresh-costco-token \
  -H "Content-Type: application/json" \
  -d '{"token": "your_jwt_token_here"}'
```

### Token Expired Errors

If you see "Unauthorized. Invalid token" errors:
1. Check Vercel logs for the refresh endpoint
2. Verify `COSTCO_EMAIL` and `COSTCO_PASSWORD` are set correctly
3. The cron job should automatically refresh, but you can manually trigger it by calling the refresh endpoint

## Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `COSTCO_EMAIL` | Yes (for auto-refresh) | Costco account email for automatic token refresh |
| `COSTCO_PASSWORD` | Yes (for auto-refresh) | Costco account password for automatic token refresh |
| `COSTCO_AUTHORIZATION_TOKEN` | No (optional) | Initial token (will be saved to Redis) |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |

## Cron Job Configuration

The cron job is configured in `vercel.json`:
- **Path:** `/api/refresh-costco-token`
- **Schedule:** Every 15 minutes (`*/15 * * * *`)
- **Action:** Checks token age and refreshes if needed using browser automation
