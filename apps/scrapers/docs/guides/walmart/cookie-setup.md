# Walmart Cookie Management

This app now includes automatic cookie refresh to avoid manual updates every 30 minutes.

## How It Works

1. **Cookie Storage**: Cookies are saved to `.walmart_cookies.json` (automatically created)
2. **Auto-Refresh**: Cookies are automatically refreshed every 20 minutes (before the 30-minute expiry)
3. **Persistent**: Cookies persist across app restarts
4. **Browser Automation** (Advanced): For more reliable refresh, use browser automation (see below)

## Initial Setup

### Option 1: From Environment Variable (One-time setup)

```bash
# Set cookies from your browser
export WALMART_COOKIES='your_cookie_string_here'

# Run the refresh script to save them
python3 refresh_walmart_cookies.py
```

### Option 2: Direct Cookie String

```bash
python3 refresh_walmart_cookies.py 'your_cookie_string_here'
```

## How to Get Fresh Cookies

1. Open your browser and log into Walmart
2. Open Developer Tools (F12) → Network tab
3. Add an item to your list
4. Find the `addItemToListLite` request
5. Copy the `Cookie` header value
6. Run: `python3 refresh_walmart_cookies.py 'pasted_cookie_string'`

## Automatic Refresh

The app automatically:
- Refreshes cookies every 20 minutes (before 30-min expiry)
- Saves refreshed cookies to file
- Uses refreshed cookies for all requests

## Manual Refresh

To manually refresh cookies:

```bash
python3 refresh_walmart_cookies.py
```

## Troubleshooting

If you get "Unauthorized" errors:

1. **Check cookie file exists**: `.walmart_cookies.json` should be in the project root
2. **Verify cookies are valid**: Run `python3 refresh_walmart_cookies.py` to check
3. **Get fresh cookies**: If auto-refresh fails, get fresh cookies from browser and run the setup again

## Cookie File Location

Cookies are stored in: `.walmart_cookies.json` (gitignored for security)

## Advanced: Browser Automation (Most Reliable)

For the most reliable cookie management, use browser automation to maintain a logged-in session:

### Setup

```bash
# Install Playwright
pip install playwright
playwright install chromium
```

### Run Browser Session

In a separate terminal, run:

```bash
# Visible browser (recommended for first-time setup)
python3 walmart_browser_session.py

# Or headless (background)
python3 walmart_browser_session.py --headless
```

This will:
- Open a browser and log into Walmart (you'll need to log in manually the first time)
- Keep the session alive automatically
- Refresh cookies every 20 minutes
- Save cookies to `.walmart_cookies.json` for the Flask app to use

The Flask app will automatically use the cookies saved by the browser session.

### Benefits

- ✅ Most reliable - maintains actual browser session
- ✅ Cookies stay fresh automatically
- ✅ No manual cookie updates needed
- ✅ Works even if API-based refresh fails

## Notes

- **API-based refresh**: The default mechanism tries to refresh cookies via API calls, but this may not always work
- **Browser automation**: More reliable but requires Playwright and a browser process running
- **Manual refresh**: If both fail, you can always manually update cookies using `refresh_walmart_cookies.py`
- If you're logged out of Walmart in your browser, cookies will expire and need to be refreshed manually

