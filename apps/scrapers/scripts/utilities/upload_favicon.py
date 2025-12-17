#!/usr/bin/env python3
"""
Upload favicon to Supabase Storage branding bucket.

This script uploads the favicon to a dedicated branding assets bucket in Supabase Storage.
"""

import os
import sys
import logging
from pathlib import Path
from supabase_client import get_client
from supabase_config import get_config
import requests

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)


def ensure_bucket_exists(client, bucket_name: str, public: bool = True):
    """Ensure storage bucket exists, create if it doesn't."""
    try:
        buckets = client.storage.list_buckets()
        bucket_exists = any(b.name == bucket_name for b in buckets) if buckets else False
        
        if not bucket_exists:
            logger.info(f"Creating bucket: {bucket_name}")
            config = get_config()
            url = config.get_url()
            key = config.get_key()
            
            # Create bucket using REST API
            bucket_url = f"{url}/storage/v1/bucket"
            headers = {
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            payload = {
                "id": bucket_name,
                "name": bucket_name,
                "public": public
            }
            
            response = requests.post(bucket_url, json=payload, headers=headers)
            if response.status_code in [200, 201]:
                logger.info(f"✅ Created bucket: {bucket_name}")
            elif response.status_code == 409:
                logger.info(f"Bucket {bucket_name} already exists")
            else:
                logger.warning(f"Could not create bucket (may already exist): {response.status_code} - {response.text}")
        else:
            logger.info(f"Bucket {bucket_name} already exists")
    except Exception as e:
        logger.warning(f"Could not check/create bucket: {e}")


def upload_favicon_to_supabase(
    client,
    favicon_path: str,
    bucket: str = "branding-assets"
) -> str:
    """Upload favicon to Supabase Storage and return public URL."""
    if not os.path.exists(favicon_path):
        raise FileNotFoundError(f"Favicon file not found: {favicon_path}")
    
    # Get file extension
    file_ext = Path(favicon_path).suffix.lower()
    if file_ext not in ['.png', '.ico', '.svg']:
        logger.warning(f"Unexpected file extension: {file_ext}")
    
    # Storage path: favicon{ext}
    storage_path = f"favicon{file_ext}"
    
    # Read file
    with open(favicon_path, 'rb') as f:
        file_data = f.read()
    
    try:
        # Upload to Supabase Storage
        response = client.storage.from_(bucket).upload(
            storage_path,
            file_data,
            file_options={"content-type": f"image/{file_ext[1:]}" if file_ext != '.svg' else "image/svg+xml"}
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket).get_public_url(storage_path)
        
        logger.info(f"✅ Uploaded favicon to {bucket}/{storage_path}")
        logger.info(f"Public URL: {public_url}")
        
        return public_url
    except Exception as e:
        logger.error(f"Failed to upload favicon: {e}")
        raise


def main():
    """Upload favicon to Supabase Storage."""
    try:
        logger.info("Uploading Favicon to Supabase Storage")
        
        # Get Supabase client
        client = get_client()
        config = get_config()
        
        # Ensure branding-assets bucket exists
        bucket_name = "branding-assets"
        ensure_bucket_exists(client, bucket_name, public=True)
        
        # Find favicon file
        favicon_path = Path("favicon.png")
        if not favicon_path.exists():
            logger.error(f"Favicon not found at {favicon_path}")
            logger.info("Please ensure favicon.png exists in the project root")
            sys.exit(1)
        
        # Upload favicon
        public_url = upload_favicon_to_supabase(
            client,
            str(favicon_path),
            bucket_name
        )
        
        logger.info("\n" + "="*60)
        logger.info("✅ Favicon upload complete!")
        logger.info(f"Public URL: {public_url}")
        logger.info("="*60)
        logger.info("\nUpdate your HTML to use this URL:")
        logger.info(f'<img src="{public_url}" alt="My Goods" class="nav-logo">')
        
    except Exception as e:
        logger.error(f"Failed to upload favicon: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

