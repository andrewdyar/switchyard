"""
Retry failed image migrations from the retailer_image_migration.log file.

This script:
1. Extracts all failed image URLs from the log
2. Retries downloading and uploading those specific images
3. Updates the database with the new Supabase URLs
"""

import os
import sys
import re
import requests
import time
import logging
import mimetypes
from pathlib import Path
from typing import Optional, List, Tuple
from supabase_client import get_client
from supabase_config import get_config
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('retry_failed_images.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Rate limiting
DOWNLOAD_DELAY = 1.0  # Slightly longer delay for retries
UPLOAD_DELAY = 0.5
MAX_RETRIES = 3  # Retry failed downloads up to 3 times


def get_file_extension_from_url(url: str, content_type: str = None) -> str:
    """Extract file extension from URL or content type."""
    path = url.split('?')[0]
    ext = Path(path).suffix.lower()
    
    if not ext or ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
        if content_type:
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = '.jpg'
            elif 'png' in content_type:
                ext = '.png'
            elif 'webp' in content_type:
                ext = '.webp'
            else:
                ext = '.jpg'  # Default
        else:
            ext = '.jpg'
    
    return ext


def download_image_with_retry(url: str, timeout: int = 60, max_retries: int = MAX_RETRIES) -> Optional[Tuple[bytes, str]]:
    """Download image with retry logic."""
    for attempt in range(1, max_retries + 1):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            logger.info(f"  Attempt {attempt}/{max_retries}: Downloading from {url}")
            response = requests.get(url, timeout=timeout, stream=True, headers=headers)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', 'image/jpeg')
            logger.info(f"  ✅ Successfully downloaded ({len(response.content)} bytes)")
            return (response.content, content_type)
            
        except requests.exceptions.Timeout:
            logger.warning(f"  ⚠️  Timeout on attempt {attempt}/{max_retries}")
            if attempt < max_retries:
                wait_time = attempt * 2  # Exponential backoff: 2s, 4s, 6s
                logger.info(f"  Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                logger.error(f"  ❌ Failed after {max_retries} attempts: Read timeout")
                return None
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 503 and attempt < max_retries:
                logger.warning(f"  ⚠️  503 Service Unavailable on attempt {attempt}/{max_retries}")
                wait_time = attempt * 2
                logger.info(f"  Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                logger.error(f"  ❌ HTTP Error: {e}")
                return None
                
        except Exception as e:
            logger.error(f"  ❌ Failed to download: {e}")
            if attempt < max_retries:
                wait_time = attempt * 2
                logger.info(f"  Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                return None
    
    return None


def upload_to_supabase_storage(
    client,
    bucket: str,
    file_path: str,
    file_content: bytes,
    content_type: str = 'image/jpeg'
) -> Optional[str]:
    """Upload file to Supabase Storage. Returns public URL or None."""
    try:
        response = client.storage.from_(bucket).upload(
            file_path,
            file_content,
            file_options={
                "content-type": content_type,
                "upsert": "true"
            }
        )
        
        public_url = client.storage.from_(bucket).get_public_url(file_path)
        logger.info(f"  ✅ Uploaded to {bucket}/{file_path}")
        return public_url
    except Exception as e:
        logger.error(f"  ❌ Failed to upload {bucket}/{file_path}: {e}")
        return None


def extract_failed_items_from_log(log_file: str = 'retailer_image_migration.log') -> List[Tuple[str, str, str]]:
    """Extract failed items from migration log.
    
    Returns: List of (store_item_id, store_name, source_url) tuples
    """
    failed_items = []
    
    if not os.path.exists(log_file):
        logger.error(f"Log file not found: {log_file}")
        return failed_items
    
    try:
        with open(log_file, 'rb') as f:
            content = f.read()
            text = content.decode('utf-8', errors='ignore')
    except Exception as e:
        logger.error(f"Failed to read log file: {e}")
        return failed_items
    
    lines = text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        # Look for processing lines
        if 'Processing:' in line:
            match = re.search(r'Processing: (\d+)\s*\((\w+)\)', line)
            if match:
                store_item_id = match.group(1)
                store_name = match.group(2).lower()
                
                # Look ahead for failures and source URL
                found_failure = False
                source_url = None
                
                for j in range(i, min(i+10, len(lines))):
                    if 'Source URL:' in lines[j]:
                        url_match = re.search(r'Source URL: (.+)', lines[j])
                        if url_match:
                            source_url = url_match.group(1).strip()
                    
                    if any(x in lines[j] for x in ['Failed to download', 'Failed to upload', 'Failed to update', '❌ Failed']):
                        found_failure = True
                        break
                
                if found_failure and source_url:
                    failed_items.append((store_item_id, store_name, source_url))
        i += 1
    
    # Remove duplicates
    failed_items = list(set(failed_items))
    
    return failed_items


def retry_failed_images():
    """Main function to retry failed image migrations."""
    try:
        client = get_client()
        
        logger.info("=" * 80)
        logger.info("Retry Failed Image Migrations")
        logger.info("=" * 80)
        
        # Extract failed items from log
        logger.info("Extracting failed items from log...")
        failed_items = extract_failed_items_from_log()
        
        if not failed_items:
            logger.info("No failed items found in log file!")
            return
        
        logger.info(f"Found {len(failed_items)} failed items to retry:")
        for store_item_id, store_name, url in failed_items:
            logger.info(f"  - {store_item_id} ({store_name}): {url}")
        
        # Process each failed item
        migrated_count = 0
        failed_count = 0
        
        for i, (store_item_id, store_name, retailer_url) in enumerate(failed_items, 1):
            logger.info("")
            logger.info(f"[{i}/{len(failed_items)}] Retrying: {store_item_id} ({store_name})")
            logger.info(f"  Source URL: {retailer_url}")
            
            # Get bucket
            bucket = store_name if store_name in ['heb', 'costco'] else None
            if not bucket:
                logger.warning(f"  ⚠️  Unknown store: {store_name}, skipping")
                failed_count += 1
                continue
            
            # Download image with retry
            time.sleep(DOWNLOAD_DELAY)
            download_result = download_image_with_retry(retailer_url, timeout=60)
            
            if not download_result:
                logger.error(f"  ❌ Failed to download after retries")
                failed_count += 1
                continue
            
            image_content, content_type = download_result
            
            # Determine file extension
            file_ext = get_file_extension_from_url(retailer_url, content_type)
            storage_path = f"{store_item_id}{file_ext}"
            
            # Upload to Supabase Storage
            time.sleep(UPLOAD_DELAY)
            public_url = upload_to_supabase_storage(
                client,
                bucket,
                storage_path,
                image_content,
                content_type
            )
            
            if not public_url:
                logger.error(f"  ❌ Failed to upload")
                failed_count += 1
                continue
            
            # Update database
            try:
                # Find the mapping by store_item_id and store_name
                mappings_response = client.table('product_store_mappings').select('id').eq('store_item_id', store_item_id).eq('store_name', store_name).execute()
                
                if not mappings_response.data:
                    logger.warning(f"  ⚠️  No mapping found for {store_item_id} ({store_name})")
                    failed_count += 1
                    continue
                
                mapping_id = mappings_response.data[0]['id']
                
                update_response = client.table('product_store_mappings').update({
                    'store_image_url': public_url
                }).eq('id', mapping_id).execute()
                
                logger.info(f"  ✅ Updated database: {public_url}")
                migrated_count += 1
                
            except Exception as e:
                logger.error(f"  ❌ Failed to update database: {e}")
                failed_count += 1
        
        logger.info("")
        logger.info("=" * 80)
        logger.info(f"Retry Complete!")
        logger.info(f"  ✅ Successfully migrated: {migrated_count} images")
        logger.info(f"  ❌ Failed: {failed_count} images")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)


if __name__ == '__main__':
    retry_failed_images()

