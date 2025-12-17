"""
Migrate HEB and Costco product images to Supabase Storage buckets.

This script:
1. Creates separate buckets for each retailer (heb, costco)
2. Downloads images from retailer URLs
3. Uploads them to the appropriate Supabase Storage bucket
4. Updates product_store_mappings.store_image_url with new Supabase URLs

Storage structure: 
- heb bucket: {store_item_id}.jpg (or .png, .webp)
- costco bucket: {store_item_id}.jpg (or .png, .webp)

Run in background: python3 migrate_retailer_images.py > migration.log 2>&1 &
"""

import os
import sys
import requests
import time
import logging
import mimetypes
from pathlib import Path
from typing import Optional, Dict, List
from supabase_client import get_client
from supabase_config import get_config
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('retailer_image_migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Rate limiting
DOWNLOAD_DELAY = 0.5  # seconds between downloads
UPLOAD_DELAY = 0.3    # seconds between uploads
BATCH_SIZE = 50       # process in batches


def ensure_bucket_exists(client, bucket_name: str, public: bool = True) -> bool:
    """Ensure storage bucket exists, create if it doesn't."""
    try:
        buckets = client.storage.list_buckets()
        bucket_exists = any(b.name == bucket_name for b in buckets) if buckets else False
        
        if not bucket_exists:
            logger.info(f"Creating bucket: {bucket_name}")
            config = get_config()
            url = config.get_url()
            key = config.get_service_role_key()
            
            bucket_url = f"{url}/storage/v1/bucket"
            headers = {
                'apikey': key,
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'id': bucket_name,
                'name': bucket_name,
                'public': True
            }
            
            response = requests.post(bucket_url, json=payload, headers=headers)
            if response.status_code in [200, 201]:
                logger.info(f"✅ Created bucket: {bucket_name}")
                return True
            elif response.status_code == 409:
                logger.info(f"✅ Bucket {bucket_name} already exists")
                return True
            else:
                logger.warning(f"Could not create bucket {bucket_name}: {response.status_code} - {response.text}")
                return False
        else:
            logger.info(f"✅ Bucket {bucket_name} already exists")
            return True
    except Exception as e:
        logger.error(f"Error checking/creating bucket {bucket_name}: {e}")
        return False


def is_retailer_url(url: str) -> bool:
    """Check if URL is a retailer URL (not Supabase Storage)."""
    if not url:
        return False
    
    # Supabase Storage URLs
    if 'supabase.co/storage/v1/object/public' in url:
        return False
    
    # Common retailer domains
    retailer_domains = [
        'heb.com',
        'images.heb.com',
        'costco.com',
        'costcoimages.com',
        'walmart.com',
        'walmartimages.com'
    ]
    
    return any(domain in url.lower() for domain in retailer_domains)


def get_file_extension_from_url(url: str, content_type: Optional[str] = None) -> str:
    """Extract file extension from URL or content type."""
    # Try to get extension from URL path
    path = url.split('?')[0]  # Remove query params
    ext = Path(path).suffix.lower()
    
    # If no extension, try content type
    if not ext or ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
        if content_type:
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = '.jpg'
            elif 'png' in content_type:
                ext = '.png'
            elif 'webp' in content_type:
                ext = '.webp'
            elif 'gif' in content_type:
                ext = '.gif'
            else:
                ext = '.jpg'
        else:
            ext = '.jpg'
    
    return ext


def download_image(url: str, timeout: int = 30) -> Optional[tuple]:
    """Download image from URL. Returns (content, content_type) or None."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, timeout=timeout, stream=True, headers=headers)
        response.raise_for_status()
        
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        return (response.content, content_type)
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
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
        # Upload file with upsert (overwrite if exists)
        response = client.storage.from_(bucket).upload(
            file_path,
            file_content,
            file_options={
                "content-type": content_type,
                "upsert": "true"
            }
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket).get_public_url(file_path)
        
        logger.info(f"✅ Uploaded to {bucket}/{file_path}")
        return public_url
    except Exception as e:
        logger.error(f"Failed to upload {bucket}/{file_path}: {e}")
        return None


def get_retailer_bucket(store_name: str) -> Optional[str]:
    """Get bucket name for retailer."""
    store_lower = store_name.lower()
    
    if store_lower == 'heb':
        return 'heb'
    elif store_lower.startswith('costco'):
        return 'costco'
    else:
        logger.warning(f"Unknown retailer for bucket: {store_name}")
        return None


def migrate_retailer_images():
    """Main migration function."""
    try:
        client = get_client()
        
        logger.info("=" * 80)
        logger.info("Retailer Image Migration to Supabase Storage")
        logger.info("=" * 80)
        
        # Create buckets for each retailer
        retailers = ['heb', 'costco']
        for retailer in retailers:
            if not ensure_bucket_exists(client, retailer):
                logger.error(f"Failed to create/verify bucket: {retailer}")
                return
        
        # Fetch all product_store_mappings with retailer image URLs
        logger.info("Fetching product store mappings...")
        
        all_mappings = []
        offset = 0
        batch_size = 1000
        
        while True:
            response = client.table('product_store_mappings').select(
                'id,product_id,store_name,store_item_id,store_image_url'
            ).eq('is_active', True).not_.is_('store_image_url', 'null').neq('store_image_url', '').range(offset, offset + batch_size - 1).execute()
            
            batch = response.data or []
            if not batch:
                break
            
            # Filter for retailer URLs only (HEB and Costco)
            for mapping in batch:
                store_name = mapping.get('store_name', '').lower()
                image_url = mapping.get('store_image_url', '')
                
                # Only process HEB and Costco
                if store_name not in ['heb'] and not store_name.startswith('costco'):
                    continue
                
                # Only process if it's a retailer URL (not already Supabase Storage)
                if is_retailer_url(image_url):
                    all_mappings.append(mapping)
            
            if len(batch) < batch_size:
                break
            
            offset += batch_size
        
        logger.info(f"Found {len(all_mappings)} mappings with retailer image URLs to migrate")
        
        if not all_mappings:
            logger.info("No images to migrate!")
            return
        
        # Process mappings
        migrated_count = 0
        skipped_count = 0
        failed_count = 0
        
        for i, mapping in enumerate(all_mappings, 1):
            mapping_id = mapping.get('id')
            product_id = mapping.get('product_id')
            store_name = mapping.get('store_name', '').lower()
            store_item_id = mapping.get('store_item_id', '')
            retailer_url = mapping.get('store_image_url', '')
            
            # Get bucket for this retailer
            bucket = get_retailer_bucket(store_name)
            if not bucket:
                logger.warning(f"Skipping {store_name} - no bucket configured")
                skipped_count += 1
                continue
            
            # Check if already migrated (safety check)
            if not is_retailer_url(retailer_url):
                logger.info(f"[{i}/{len(all_mappings)}] Already migrated: {store_item_id} ({store_name})")
                skipped_count += 1
                continue
            
            logger.info(f"[{i}/{len(all_mappings)}] Processing: {store_item_id} ({store_name})")
            logger.info(f"  Source URL: {retailer_url}")
            
            # Download image
            time.sleep(DOWNLOAD_DELAY)  # Rate limiting
            download_result = download_image(retailer_url)
            
            if not download_result:
                logger.error(f"  ❌ Failed to download image")
                failed_count += 1
                continue
            
            image_content, content_type = download_result
            
            # Determine file extension
            file_ext = get_file_extension_from_url(retailer_url, content_type)
            
            # Storage path: {store_item_id}.{ext}
            storage_path = f"{store_item_id}{file_ext}"
            
            # Upload to Supabase Storage
            time.sleep(UPLOAD_DELAY)  # Rate limiting
            public_url = upload_to_supabase_storage(
                client,
                bucket,
                storage_path,
                image_content,
                content_type
            )
            
            if not public_url:
                logger.error(f"  ❌ Failed to upload image")
                failed_count += 1
                continue
            
            # Update database with new URL
            try:
                update_response = client.table('product_store_mappings').update({
                    'store_image_url': public_url
                }).eq('id', mapping_id).execute()
                
                logger.info(f"  ✅ Updated database: {public_url}")
                migrated_count += 1
                
                # Log progress every 10 items
                if migrated_count % 10 == 0:
                    logger.info(f"Progress: {migrated_count} migrated, {skipped_count} skipped, {failed_count} failed")
                    
            except Exception as e:
                logger.error(f"  ❌ Failed to update database: {e}")
                failed_count += 1
                continue
        
        # Final summary
        logger.info("=" * 80)
        logger.info("Migration Complete!")
        logger.info(f"  ✅ Migrated: {migrated_count} images")
        logger.info(f"  ⏭️  Skipped: {skipped_count} images")
        logger.info(f"  ❌ Failed: {failed_count} images")
        logger.info(f"  📊 Total: {len(all_mappings)} images")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    migrate_retailer_images()

