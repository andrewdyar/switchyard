"""
Migrate product images to Supabase Storage.

This script:
1. Downloads product images from current URLs
2. Uploads them to Supabase Storage in a structured format
3. Updates product records with new image URLs

Storage structure: products/{product_id}/{store_name}/image.jpg
"""

import os
import sys
import requests
from pathlib import Path
from typing import Dict, Optional
from supabase_client import get_client, SupabaseService
from supabase_config import get_config
from products_data import PRODUCTS_DATA
import logging
import hashlib
import mimetypes
from supabase_config import get_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_image(url: str, timeout: int = 30) -> Optional[bytes]:
    """Download image from URL."""
    try:
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
        return None


def get_file_extension_from_url(url: str) -> str:
    """Extract file extension from URL."""
    # Try to get extension from URL path
    path = url.split('?')[0]  # Remove query params
    ext = Path(path).suffix.lower()
    
    # If no extension, try to detect from content type or default to jpg
    if not ext or ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        ext = '.jpg'
    
    return ext


def upload_to_supabase_storage(
    client,
    bucket: str,
    file_path: str,
    file_content: bytes,
    content_type: str = 'image/jpeg'
) -> Optional[str]:
    """Upload file to Supabase Storage."""
    try:
        # Upload file
        response = client.storage.from_(bucket).upload(
            file_path,
            file_content,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket).get_public_url(file_path)
        
        logger.info(f"Uploaded to {bucket}/{file_path}")
        return public_url
    except Exception as e:
        logger.error(f"Failed to upload {file_path}: {e}")
        return None


def migrate_images():
    """Main migration function."""
    try:
        # Get Supabase client
        client = get_client()
        service = SupabaseService()
        
        logger.info("=" * 60)
        logger.info("Product Image Migration to Supabase Storage")
        logger.info("=" * 60)
        
        # Create products bucket if it doesn't exist
        bucket_name = "products"
        try:
            # Check if bucket exists first
            try:
                buckets = client.storage.list_buckets()
                bucket_exists = any(b.name == bucket_name for b in buckets) if buckets else False
            except Exception as e:
                logger.warning(f"Could not list buckets: {e}")
                bucket_exists = False
            
            if not bucket_exists:
                # Create bucket using REST API (Python client method is unreliable)
                try:
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
                    if response.status_code == 200:
                        logger.info(f"✅ Created bucket: {bucket_name}")
                    elif response.status_code == 409:
                        logger.info(f"✅ Bucket {bucket_name} already exists")
                    else:
                        logger.warning(f"Could not create bucket: {response.text}")
                except Exception as create_error:
                    logger.warning(f"Could not create bucket (might already exist): {create_error}")
                    # Continue anyway - might already exist
            else:
                logger.info(f"✅ Bucket {bucket_name} already exists")
        except Exception as e:
            # Bucket might already exist or creation might have failed
            logger.warning(f"Bucket creation check failed: {e}")
            logger.info("Continuing anyway - bucket might already exist")
        
        # Get all products from Supabase
        products = service.select('products', columns='id,name')
        product_map = {p['name']: p['id'] for p in products}
        
        logger.info(f"Found {len(products)} products in Supabase")
        
        # Get all store mappings
        store_mappings = service.select('product_store_mappings', columns='product_id,store_name,store_item_id,store_image_url')
        mapping_map = {}  # (product_id, store_name) -> mapping
        
        for mapping in store_mappings:
            key = (mapping['product_id'], mapping['store_name'])
            if key not in mapping_map:
                mapping_map[key] = mapping
        
        logger.info(f"Found {len(store_mappings)} store mappings")
        
        # Process each product from products_data.py
        migrated_count = 0
        failed_count = 0
        
        for product_data in PRODUCTS_DATA:
            product_name = product_data.get('name', '').strip()
            store = product_data.get('store', 'heb')
            store_item_id = product_data.get('id', '')
            image_url = product_data.get('image', '')
            
            if not image_url:
                logger.warning(f"No image URL for {product_name} ({store})")
                continue
            
            # Find product in Supabase (match by name)
            # Normalize name by removing store prefixes
            normalized_name = product_name
            for prefix in ['H-E-B ', 'Hill Country Fare ', 'Great Value ', 'bettergoods ']:
                if normalized_name.startswith(prefix):
                    normalized_name = normalized_name[len(prefix):].strip()
            
            product_id = None
            for supabase_name, supabase_id in product_map.items():
                if normalized_name.lower() in supabase_name.lower() or supabase_name.lower() in normalized_name.lower():
                    product_id = supabase_id
                    break
            
            if not product_id:
                logger.warning(f"Could not find product in Supabase: {product_name}")
                failed_count += 1
                continue
            
            # Find store mapping
            mapping_key = (product_id, store)
            if mapping_key not in mapping_map:
                logger.warning(f"No store mapping found for {product_name} ({store})")
                failed_count += 1
                continue
            
            mapping = mapping_map[mapping_key]
            existing_image_url = mapping.get('store_image_url', '')
            
            # Skip if already using Supabase Storage URL
            if 'supabase.co/storage/v1/object/public/products' in existing_image_url:
                logger.info(f"Already migrated: {product_name} ({store})")
                continue
            
            # Download image
            logger.info(f"Downloading image for {product_name} ({store})...")
            image_content = download_image(image_url)
            
            if not image_content:
                logger.error(f"Failed to download image for {product_name} ({store})")
                failed_count += 1
                continue
            
            # Determine file extension
            file_ext = get_file_extension_from_url(image_url)
            content_type = mimetypes.guess_type(image_url)[0] or 'image/jpeg'
            
            # Create storage path: products/{product_id}/{store_name}/image.jpg
            storage_path = f"{product_id}/{store}/image{file_ext}"
            
            # Upload to Supabase Storage
            logger.info(f"Uploading {storage_path}...")
            public_url = upload_to_supabase_storage(
                client,
                bucket_name,
                storage_path,
                image_content,
                content_type
            )
            
            if not public_url:
                logger.error(f"Failed to upload image for {product_name} ({store})")
                failed_count += 1
                continue
            
            # Update store mapping with new image URL
            service.update(
                'product_store_mappings',
                filters={'product_id': product_id, 'store_name': store, 'store_item_id': store_item_id},
                data={'store_image_url': public_url}
            )
            
            # Also update product.image_url if it's empty or uses old URL
            product = next((p for p in products if p['id'] == product_id), None)
            if product:
                current_product_image = product.get('image_url', '')
                if not current_product_image or current_product_image == image_url:
                    service.update(
                        'products',
                        filters={'id': product_id},
                        data={'image_url': public_url}
                    )
            
            migrated_count += 1
            logger.info(f"✅ Migrated: {product_name} ({store}) -> {public_url}")
        
        logger.info("=" * 60)
        logger.info(f"Migration complete!")
        logger.info(f"  ✅ Migrated: {migrated_count} images")
        logger.info(f"  ❌ Failed: {failed_count} images")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    migrate_images()

