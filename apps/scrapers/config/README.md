# Proxy Configuration

This directory contains proxy configuration files for use across all scrapers.

## Files

- `proxies.json` - Webshare proxy configuration with 5 US residential proxies

## Usage

### Environment Variable
```bash
export WEBSHARE_PROXIES='["http://user:pass@host:port", ...]'
```

### File-based
The proxy manager will automatically look for proxies in:
1. `WEBSHARE_PROXIES` environment variable
2. `webshare_proxies.json` (current directory)
3. `proxies.json` (current directory)
4. `config/proxies.json` (repo-wide config - **recommended**)

### Format
```json
{
  "webshare": {
    "proxies": [
      "http://username:password@host:port",
      ...
    ]
  }
}
```

Or simple array format:
```json
[
  "http://username:password@host:port",
  ...
]
```

## Integration

All scrapers that use the `WebshareProxyManager` will automatically load proxies from this config file if no other source is specified.

