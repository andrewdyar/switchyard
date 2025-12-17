# Walmart Integration Setup

This document explains how to set up Walmart authentication for the Goods Grocery app.

## Environment Variable

Set the `WALMART_COOKIES` environment variable with your Walmart session cookies:

```bash
export WALMART_COOKIES='_lat=...; _msit=...; _tsc=...; ...'
```

## Getting Walmart Cookies

1. Open your browser and navigate to https://www.walmart.com
2. Log in to your Walmart account
3. Open Developer Tools (F12 or Cmd+Option+I)
4. Go to the Network tab
5. Add an item to a shopping list
6. Find the GraphQL request to `addItemToListLite`
7. In the request headers, look for the `Cookie` header
8. Copy the entire cookie string (it will be a long string with semicolons separating cookies)

The cookie string should look like:
```
isoLoc=US_TX_t3; adblocked=true; _m=9; assortmentStoreId=2991; ... (many more cookies)
```

**Important**: Copy the entire `Cookie` header value from the request headers, not the `set-cookie` response headers.

## Cookie Format

The cookies should be formatted as a single string with semicolons separating each cookie:

```
_lat=MDYyMTYyMDI1...; _msit=MDYyMTYyMDI1...; _tsc=MTQyODYyMDI1...; ...
```

## Important Cookies

Key cookies that are typically required:
- `auth` - Authentication token
- `_lat` - Location/tracking
- `_msit` - Session tracking
- `_tsc` - Tracking
- `vtc` - Verification token
- `bstc` - Browser session tracking

## Walmart List ID

The Walmart list ID is hardcoded in `heb_cart_app.py`:
- `WALMART_LIST_ID = "7d8c7bde-821c-4a4d-9284-0d7170ef357e"`

To use a different list, update this value in the code.

## Testing

After setting the environment variable, restart the Flask app:

```bash
python3 heb_cart_app.py
```

The app will display a warning if `WALMART_COOKIES` is not set, but will still start.

