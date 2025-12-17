# Retailer Image Migration

This script migrates HEB and Costco product images from retailer URLs to Supabase Storage buckets.

## Overview

- **Creates buckets**: `heb` and `costco` in Supabase Storage
- **Downloads images**: From retailer URLs (heb.com, costco.com, etc.)
- **Uploads to buckets**: Stores images in retailer-specific buckets
- **Updates database**: Updates `product_store_mappings.store_image_url` with new Supabase URLs

## Storage Structure

- **HEB bucket**: `{store_item_id}.jpg` (or .png, .webp)
- **Costco bucket**: `{store_item_id}.jpg` (or .png, .webp)

## Running the Migration

### Run in Background

```bash
# Run in background and log to file
nohup python3 migrate_retailer_images.py > retailer_image_migration.log 2>&1 &

# Or with screen/tmux for better control
screen -S image_migration
python3 migrate_retailer_images.py
# Press Ctrl+A then D to detach
# Reattach with: screen -r image_migration
```

### Monitor Progress

```bash
# Watch the log file
tail -f retailer_image_migration.log

# Check if process is running
ps aux | grep migrate_retailer_images
```

### Stop the Migration

```bash
# Find the process ID
ps aux | grep migrate_retailer_images

# Kill the process
kill <PID>
```

## Features

- **Rate Limiting**: Built-in delays to avoid overwhelming servers
- **Error Handling**: Continues processing even if individual images fail
- **Progress Logging**: Logs every 10 successful migrations
- **Skip Already Migrated**: Automatically skips images already in Supabase Storage
- **Batch Processing**: Processes images one at a time with proper error handling

## Requirements

- Python 3.9+
- Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Dependencies: `requests`, `supabase`, `python-dotenv`

## Output

The script logs to:
- Console (stdout)
- File: `retailer_image_migration.log`

Final summary includes:
- Number of images migrated
- Number skipped (already migrated)
- Number failed
- Total processed

