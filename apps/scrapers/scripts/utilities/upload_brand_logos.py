#!/usr/bin/env python3
"""
Upload brand logos to Supabase Storage.

This script uploads brand logos (Costco, HEB, Walmart, etc.) to Supabase Storage
so they can be easily referenced and cached in the app.

Storage structure: brand-logos/{store_name}/logo.png
"""

import os
import sys
from pathlib import Path
from typing import Optional
from supabase_client import get_client
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def upload_logo_to_supabase(
    client,
    bucket: str,
    store_name: str,
    logo_file_path: str,
    content_type: str = 'image/png'
) -> Optional[str]:
    """Upload logo to Supabase Storage and return public URL."""
    try:
        # Read logo file
        if not os.path.exists(logo_file_path):
            logger.error(f"Logo file not found: {logo_file_path}")
            return None
        
        with open(logo_file_path, 'rb') as f:
            file_content = f.read()
        
        # Determine file extension
        file_ext = Path(logo_file_path).suffix.lower()
        if not file_ext:
            file_ext = '.png'
        
        # Storage path: brand-logos/{store_name}/logo{ext}
        storage_path = f"{store_name}/logo{file_ext}"
        
        # Upload file
        response = client.storage.from_(bucket).upload(
            storage_path,
            file_content,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket).get_public_url(storage_path)
        
        logger.info(f"✅ Uploaded {store_name} logo to {bucket}/{storage_path}")
        logger.info(f"   Public URL: {public_url}")
        
        return public_url
        
    except Exception as e:
        logger.error(f"Failed to upload {store_name} logo: {e}")
        return None


def ensure_bucket_exists(client, bucket_name: str, public: bool = True):
    """Ensure storage bucket exists, create if it doesn't."""
    try:
        buckets = client.storage.list_buckets()
        bucket_exists = any(b.name == bucket_name for b in buckets) if buckets else False
        
        if not bucket_exists:
            logger.info(f"Creating bucket: {bucket_name}")
            # Create bucket using REST API
            import requests
            from supabase_config import get_config
            
            config = get_config()
            url = f"{config.url}/storage/v1/bucket"
            headers = {
                "apikey": config.service_role_key,
                "Authorization": f"Bearer {config.service_role_key}",
                "Content-Type": "application/json"
            }
            data = {
                "name": bucket_name,
                "public": public,
                "file_size_limit": 52428800,  # 50MB
                "allowed_mime_types": ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
            }
            
            response = requests.post(url, json=data, headers=headers)
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


def main():
    """Upload brand logos to Supabase Storage."""
    try:
        client = get_client()
        
        logger.info("=" * 60)
        logger.info("Uploading Brand Logos to Supabase Storage")
        logger.info("=" * 60)
        
        # Ensure brand-logos bucket exists
        bucket_name = "brand-logos"
        ensure_bucket_exists(client, bucket_name, public=True)
        
        # Base directory for logo files
        base_dir = Path(__file__).parent
        
        # Logo mappings: store_name -> file_path
        logo_files = {
            'costco': base_dir / 'Costco-Logo-Registered.png',
            # Add other logos as needed
            # 'heb': base_dir / 'static' / 'heb-logo.png',
            # 'walmart': base_dir / 'static' / 'walmart-logo.png',
        }
        
        uploaded_logos = {}
        
        for store_name, logo_path in logo_files.items():
            if not logo_path.exists():
                logger.warning(f"Logo file not found for {store_name}: {logo_path}")
                continue
            
            logger.info(f"\nUploading {store_name} logo...")
            public_url = upload_logo_to_supabase(
                client,
                bucket_name,
                store_name,
                str(logo_path)
            )
            
            if public_url:
                uploaded_logos[store_name] = public_url
        
        logger.info("\n" + "=" * 60)
        logger.info("Upload Summary")
        logger.info("=" * 60)
        
        for store_name, url in uploaded_logos.items():
            logger.info(f"✅ {store_name}: {url}")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Logo upload complete!")
        logger.info("=" * 60)
        
        # Print the Costco logo URL for use in code
        if 'costco' in uploaded_logos:
            logger.info(f"\nCostco Logo URL: {uploaded_logos['costco']}")
            logger.info("\nUse this URL in your import scripts and API responses.")
        
        return uploaded_logos
        
    except Exception as e:
        logger.error(f"Failed to upload logos: {e}", exc_info=True)
        return None


if __name__ == '__main__':
    main()

