"""
Migrate specific product images to Supabase Storage for category images.

This script downloads images for the specific products the user selected
and uploads them to Supabase Storage buckets.
"""

import os
import sys
import requests
import time
import logging
from pathlib import Path
from typing import Optional
from supabase_client import get_client
from supabase_config import get_config
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Rate limiting
DOWNLOAD_DELAY = 0.5
UPLOAD_DELAY = 0.3
DOWNLOAD_TIMEOUT = 60

# Products to migrate (store_item_id, store_name)
PRODUCTS_TO_MIGRATE = [
    ('11627017', 'heb'),  # Baby & kids - Pampers
    ('862949', 'heb'),    # Beverages - Coca-Cola Mexican Coke
    ('2210789', 'heb'),   # Everyday essentials - Bounty Paper Towels
    ('475218', 'heb'),    # Frozen food - Totino's Pizza Rolls
    ('545932', 'heb'),    # Fruit & vegetables - H-E-B Frozen Broccoli
    ('1281037', 'heb'),   # Health & beauty - CeraVe Lotion
    ('10119008', 'heb'),  # Pantry - Heinz Ketchup
]

def get_file_extension_from_url(url: str, content_type: Optional[str] = None) -> str:
    """Extract file extension from URL or guess from content type."""
    path = url.split('?')[0]
    ext = Path(path).suffix.lower()
    if not ext or ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
        if content_type:
            mime_to_ext = {
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/webp': '.webp',
                'image/gif': '.gif'
            }
            ext = mime_to_ext.get(content_type, '.jpg')
        else:
            ext = '.jpg'
    return ext

def download_image(url: str, timeout: int = DOWNLOAD_TIMEOUT) -> Optional[tuple]:
    """Download image from URL. Returns (content, content_type) or None."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, timeout=timeout, stream=True, headers=headers)
        response.raise_for_status()
        
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        logger.info(f"  ✅ Successfully downloaded ({len(response.content)} bytes)")
        return (response.content, content_type)
    except requests.exceptions.RequestException as e:
        logger.error(f"  ❌ Failed to download image from {url}: {e}")
        return None
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
        logger.error(f"Failed to upload {bucket}/{file_path}: {e}")
        return None

def get_retailer_bucket(store_name: str) -> str:
    """Get bucket name for retailer."""
    store_lower = store_name.lower()
    if store_lower == 'heb':
        return 'heb'
    elif store_lower.startswith('costco'):
        return 'costco'
    else:
        return 'heb'  # Default

def ensure_bucket_exists(client, bucket_name: str) -> bool:
    """Ensure storage bucket exists."""
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
            if response.status_code in [200, 201, 409]:
                logger.info(f"✅ Bucket {bucket_name} ready")
                return True
            else:
                logger.warning(f"Could not create bucket {bucket_name}: {response.status_code}")
                return False
        return True
    except Exception as e:
        logger.error(f"Error checking bucket {bucket_name}: {e}")
        return False

def migrate_product_image(client, store_item_id: str, store_name: str):
    """Migrate a single product image."""
    logger.info(f"Processing: {store_item_id} ({store_name})")
    
    # Get current image URL from database
    try:
        mapping_query = client.table('product_store_mappings').select(
            'id, store_image_url'
        ).eq('store_item_id', store_item_id).eq('store_name', store_name).eq('is_active', True).execute()
        
        if not mapping_query.data:
            logger.warning(f"  ⚠️  No mapping found for {store_item_id} ({store_name})")
            return None
        
        mapping = mapping_query.data[0]
        current_url = mapping.get('store_image_url')
        
        if not current_url:
            logger.warning(f"  ⚠️  No image URL for {store_item_id}")
            return None
        
        # Check if already in Supabase Storage
        if 'supabase.co/storage/v1/object/public' in current_url:
            logger.info(f"  ✅ Already in Supabase Storage: {current_url}")
            return current_url
        
        # Get bucket
        bucket = get_retailer_bucket(store_name)
        if not ensure_bucket_exists(client, bucket):
            logger.error(f"  ❌ Could not ensure bucket {bucket} exists")
            return None
        
        # Download image
        time.sleep(DOWNLOAD_DELAY)
        download_result = download_image(current_url)
        
        if not download_result:
            logger.error(f"  ❌ Failed to download image")
            return None
        
        image_content, content_type = download_result
        
        # Determine file extension
        file_ext = get_file_extension_from_url(current_url, content_type)
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
            logger.error(f"  ❌ Failed to upload image")
            return None
        
        # Update database
        try:
            update_response = client.table('product_store_mappings').update({
                'store_image_url': public_url
            }).eq('id', mapping['id']).execute()
            
            logger.info(f"  ✅ Updated database: {public_url}")
            return public_url
        except Exception as e:
            logger.error(f"  ❌ Failed to update database: {e}")
            return None
            
    except Exception as e:
        logger.error(f"Error processing {store_item_id}: {e}", exc_info=True)
        return None

def main():
    """Main function to migrate category product images."""
    logger.info("=" * 80)
    logger.info("Migrate Category Product Images")
    logger.info("=" * 80)
    
    client = get_client()
    
    migrated_count = 0
    failed_count = 0
    
    for store_item_id, store_name in PRODUCTS_TO_MIGRATE:
        result = migrate_product_image(client, store_item_id, store_name)
        if result:
            migrated_count += 1
        else:
            failed_count += 1
        logger.info("")  # Newline for readability
    
    logger.info("=" * 80)
    logger.info(f"Migration Complete!")
    logger.info(f"  ✅ Successfully migrated: {migrated_count} images")
    logger.info(f"  ❌ Failed: {failed_count} images")
    logger.info("=" * 80)

if __name__ == '__main__':
    main()

