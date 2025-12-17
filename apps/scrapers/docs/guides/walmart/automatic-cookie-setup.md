# Automatic Cookie Management Setup

This system automatically refreshes Walmart cookies every 20 minutes, eliminating the need for manual updates.

## How It Works

1. **Persistent Storage**: Uses Upstash Redis (free tier) to store cookies across serverless function invocations
2. **Automatic Refresh**: Vercel Cron Job calls `/api/refresh-cookies` every 20 minutes
3. **In-Request Refresh**: The cookie manager also refreshes cookies during API requests if they're about to expire

## Setup Instructions

### Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up/login (free tier available)
3. Click "Create Database"
4. Choose:
   - **Region**: Select closest to your Vercel deployment
   - **Type**: Redis
   - **Plan**: Free (10,000 commands/day is plenty)
5. Click "Create"

### Step 2: Get Redis Credentials

After creating the database:
1. Click on your database
2. Copy the **REST URL** (looks like: `https://xxx.upstash.io`)
3. Copy the **REST TOKEN** (long string)

### Step 3: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add these variables:

**Required:**
- `UPSTASH_REDIS_REST_URL` - Your Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Your Redis REST token
- `WALMART_COOKIES` - Initial cookie string (from browser)

**Optional:**
- `HEB_COOKIES` - HEB cookie string (has default)

4. Apply to: **Production, Preview, Development**

### Step 4: Initial Cookie Setup

1. Open your browser and log into Walmart
2. Open Developer Tools (F12) → Network tab
3. Add an item to your list
4. Find the `addItemToListLite` request
5. Copy the entire `Cookie` header value
6. Set `WALMART_COOKIES` in Vercel with this value

### Step 5: Deploy

The system will automatically:
- ✅ Save cookies to Redis on first use
- ✅ Refresh cookies every 20 minutes via Cron Job
- ✅ Refresh cookies during API requests if needed
- ✅ Persist refreshed cookies to Redis

## How Automatic Refresh Works

### Background Refresh (Cron Job)
- Runs every 20 minutes via Vercel Cron
- Calls `/api/refresh-cookies`
- Refreshes cookies and saves to Redis
- Happens automatically, no manual intervention needed

### In-Request Refresh
- When the app makes an API request
- Cookie manager checks if cookies are >20 minutes old
- If so, refreshes them before the request
- Saves refreshed cookies to Redis

## Monitoring

Check if cookies are refreshing:
1. Go to Vercel → Your Project → Functions
2. Look for `/api/refresh-cookies` function
3. Check execution logs to see refresh status

## Troubleshooting

### Cookies Not Refreshing

1. **Check Redis Connection:**
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
   - Check Upstash dashboard for connection errors

2. **Check Cron Job:**
   - Go to Vercel → Settings → Cron Jobs
   - Verify `/api/refresh-cookies` is scheduled
   - Check execution logs

3. **Check Initial Cookies:**
   - Ensure `WALMART_COOKIES` is set with valid cookies
   - Cookies must be from a logged-in session

4. **Check Logs:**
   - Vercel → Functions → View logs
   - Look for refresh errors

### Still Getting "Unauthorized"

If you still get unauthorized errors:
1. The initial `WALMART_COOKIES` may be expired
2. Update `WALMART_COOKIES` with fresh cookies
3. The system will automatically refresh from there

## Cost

- **Upstash Redis Free Tier**: 10,000 commands/day
- **Usage**: ~3 commands per refresh × 72 refreshes/day = ~216 commands/day
- **Well within free tier limits!**

## Manual Refresh (if needed)

You can manually trigger a refresh:
```bash
curl https://your-app.vercel.app/api/refresh-cookies
```

## Summary

Once set up:
- ✅ Cookies automatically refresh every 20 minutes
- ✅ No manual updates needed
- ✅ Works across all serverless function invocations
- ✅ Free tier is sufficient for this use case

The system is fully automatic - just set the initial cookies once, and it handles the rest!

