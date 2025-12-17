"""
Base scraper class for all retailer scrapers.

Provides common functionality:
- Category filtering (grocery only)
- Category mapping to Goods taxonomy
- Supabase storage
- Rate limiting and retries
- Remote execution support
"""

import os
import time
import random
import logging
from typing import Dict, List, Optional, Set, Any, Tuple
from datetime import datetime, timezone
from abc import ABC, abstractmethod
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

from core.category_mapping import normalize_category, should_include_category, is_grocery_category
from app.supabase_client import get_client, SupabaseService

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    Base class for all retailer scrapers.
    
    All scrapers should inherit from this class and implement:
    - discover_categories() - Discover categories from retailer
    - scrape_category() - Scrape products from a category
    - extract_product_data() - Extract product data from retailer response
    """
    
    def __init__(
        self,
        retailer_name: str,
        store_id: Optional[str] = None,
        dry_run: bool = False,
        rate_limit_delay: float = 1.0,
        rate_limit_variance: float = 0.3,
        max_items: Optional[int] = None
    ):
        """
        Initialize the base scraper.
        
        Args:
            retailer_name: Retailer identifier ('heb', 'walmart', 'costco', etc.)
            store_id: Store/location ID (optional, retailer-specific)
            dry_run: If True, skip Supabase storage and only log products
            rate_limit_delay: Base delay between requests (seconds)
            rate_limit_variance: Random variance in delay (seconds)
            max_items: Maximum items to scrape (None = no limit)
        """
        self.retailer_name = retailer_name
        self.store_id = store_id
        self.dry_run = dry_run
        self.rate_limit_delay = rate_limit_delay
        self.rate_limit_variance = rate_limit_variance
        self.max_items = max_items
        
        # Tracking
        self.discovered_product_ids: Set[str] = set()
        self.scraped_count = 0
        self.failed_count = 0
        
        # Initialize Supabase (optional for dry-run mode)
        self.supabase_service = None
        self.supabase_client = None
        if not dry_run:
            try:
                self.supabase_service = SupabaseService()
                self.supabase_client = get_client()
                logger.info(f"Supabase connection initialized for {retailer_name}")
            except Exception as e:
                logger.warning(f"Supabase initialization failed: {e}. Running in dry-run mode.")
                self.dry_run = True
        else:
            logger.info(f"Running in DRY-RUN mode for {retailer_name} - products will not be saved")
    
    def _get_random_delay(self) -> float:
        """Get random delay with variance for rate limiting."""
        variance = random.uniform(-self.rate_limit_variance, self.rate_limit_variance)
        return max(0.1, self.rate_limit_delay + variance)
    
    def normalize_category(self, category_path: str, parent: str = None) -> Tuple[str, Optional[str]]:
        """
        Map retailer category to Goods taxonomy.
        
        Args:
            category_path: Retailer-specific category/subcategory name
            parent: Parent category name (for nested structures)
            
        Returns:
            Tuple of (goods_category, goods_subcategory) or ('uncategorized', None)
        """
        return normalize_category(self.retailer_name, category_path, parent)
    
    def should_include_category(self, category_path: str, parent: str = None) -> bool:
        """
        Determine if a category should be scraped (grocery only).
        
        Args:
            category_path: Retailer-specific category/subcategory name
            parent: Parent category name (for nested structures)
            
        Returns:
            True if category should be scraped, False otherwise
        """
        return should_include_category(self.retailer_name, category_path, parent)
    
    def filter_grocery_categories(self, categories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter categories to only include grocery items.
        
        Args:
            categories: List of category dictionaries
            
        Returns:
            Filtered list of grocery categories
        """
        filtered = []
        for category in categories:
            category_path = category.get('name', '')
            parent = category.get('parent')
            
            if self.should_include_category(category_path, parent):
                filtered.append(category)
            else:
                logger.debug(f"Excluding non-grocery category: {category_path} (parent: {parent})")
        
        logger.info(f"Filtered {len(categories)} categories to {len(filtered)} grocery categories")
        return filtered
    
    @abstractmethod
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover product categories from retailer.
        
        Returns:
            List of category dictionaries with at least:
            - 'name': Category name
            - 'parent': Parent category name (for nested structures, None for top-level)
            - Additional retailer-specific fields (url, id, etc.)
        """
        pass
    
    @abstractmethod
    def scrape_category(self, category: Dict[str, Any]) -> int:
        """
        Scrape products from a category.
        
        Args:
            category: Category dictionary from discover_categories()
            
        Returns:
            Number of products scraped
        """
        pass
    
    @abstractmethod
    def extract_product_data(self, product_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract normalized product data from retailer response.
        
        Args:
            product_data: Raw product data from retailer API/response
            
        Returns:
            Normalized product dictionary with required fields:
            - 'product_id': Retailer's product ID
            - 'name': Product name
            - 'image_url': Product image URL
            - 'upc': UPC/barcode (if available)
            - 'size': Size/unit of measure
            - 'price': Price (if available)
            - 'category_name': Retailer category name
            - 'parent_category': Parent category name (for nested structures)
            - 'raw_data': Full raw response (for debugging)
            - Additional retailer-specific fields
        """
        pass
    
    def store_product_in_supabase(self, product: Dict[str, Any]) -> bool:
        """
        Store product in Supabase database.
        
        This is a base implementation that can be overridden by retailers
        with specific requirements.
        
        Args:
            product: Normalized product dictionary from extract_product_data()
            
        Returns:
            True if successful, False otherwise
        """
        if self.dry_run:
            logger.info(f"  [DRY-RUN] Would store product: {product.get('name', 'Unknown')} (ID: {product.get('product_id', 'N/A')})")
            self.discovered_product_ids.add(product.get('product_id', ''))
            return True
        
        if not self.supabase_client:
            logger.warning("Supabase client not available - skipping product storage")
            return False
        
        try:
            from uuid import uuid4
            
            store_product_id = product.get('product_id') or product.get('external_id')
            upc = product.get('upc') or product.get('barcode')
            
            # Find existing product by UPC (like Central Market import)
            product_uuid = None
            if upc and len(upc) >= 6:
                existing_result = self.supabase_client.table('products').select('id, name, category_id').eq('upc', upc).limit(1).execute()
                if existing_result.data:
                    product_uuid = existing_result.data[0]['id']
            
            # Normalize category
            category_name = product.get('category_name', '')
            parent_category = product.get('parent_category')
            goods_category, goods_subcategory = self.normalize_category(category_name, parent_category)
            
            # Get category IDs from Supabase
            category_id = None
            subcategory_id = None
            if goods_category != 'uncategorized':
                # Look up category ID (parent categories have null parent_id)
                category_result = self.supabase_client.table('categories').select('id').eq(
                    'name', goods_category
                ).is_('parent_id', 'null').limit(1).execute()
                
                if category_result.data:
                    category_id = category_result.data[0]['id']
                    
                    # Look up subcategory ID if provided
                    if goods_subcategory:
                        subcategory_result = self.supabase_client.table('categories').select('id').eq(
                            'name', goods_subcategory
                        ).eq('parent_id', category_id).limit(1).execute()
                        
                        if subcategory_result.data:
                            subcategory_id = subcategory_result.data[0]['id']
            
            if product_uuid:
                # Update existing product (matched by UPC)
                product_update = {
                    'name': product['name'],
                    'image_url': product.get('image_url', ''),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                if product.get('brand'):
                    product_update['brand'] = product['brand']
                if upc:
                    product_update['upc'] = upc
                if product.get('size'):
                    product_update['unit_of_measure'] = product['size']
                if category_id and not existing_result.data[0].get('category_id'):
                    product_update['category_id'] = category_id
                if subcategory_id:
                    product_update['subcategory_id'] = subcategory_id
                if product.get('raw_data'):
                    product_update['raw_data'] = product['raw_data']
                
                self.supabase_client.table('products').update(product_update).eq('id', product_uuid).execute()
            else:
                # Create new product
                product_data = {
                    'id': str(uuid4()),
                    'name': product['name'],
                    'image_url': product.get('image_url', ''),
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                if product.get('brand'):
                    product_data['brand'] = product['brand']
                if upc:
                    product_data['upc'] = upc
                if product.get('size'):
                    product_data['unit_of_measure'] = product['size']
                if category_id:
                    product_data['category_id'] = category_id
                if subcategory_id:
                    product_data['subcategory_id'] = subcategory_id
                if product.get('raw_data'):
                    product_data['raw_data'] = product['raw_data']
                
                result = self.supabase_client.table('products').insert(product_data).execute()
                if result.data:
                    product_uuid = product_data['id']
            
            if product_uuid:
                # Upsert store mapping (like Central Market import)
                mapping_record = {
                    'product_id': product_uuid,
                    'store_name': self.retailer_name,
                    'store_item_id': store_product_id,
                    'store_item_name': product['name'],
                    'store_image_url': product.get('image_url', ''),
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                }
                
                self.supabase_client.table('product_store_mappings').upsert(
                    mapping_record,
                    on_conflict='product_id,store_name,store_item_id'
                ).execute()
                
                # Insert pricing record
                if product.get('cost_price') or product.get('price'):
                    price_value = product.get('cost_price') or product.get('price')
                    pricing_record = {
                        'product_id': product_uuid,
                        'store_name': self.retailer_name,
                        'location_id': product.get('store_id', self.store_id),
                        'price': float(price_value) if price_value else None,
                        'list_price': float(product.get('list_price')) if product.get('list_price') else None,
                        'price_per_unit': float(product.get('price_per_unit')) if product.get('price_per_unit') else None,
                        'price_per_unit_uom': product.get('price_per_unit_uom'),
                        'is_on_sale': product.get('is_on_sale', False),
                        'effective_from': datetime.now(timezone.utc).isoformat(),
                    }
                    
                    self.supabase_client.table('product_pricing').insert(pricing_record).execute()
            
            self.discovered_product_ids.add(store_product_id)
            return True
            
        except Exception as e:
            logger.error(f"Error storing product {product.get('product_id', 'unknown')}: {e}", exc_info=True)
            return False
    
    def run(self, strategy: str = 'categories') -> Dict[str, int]:
        """
        Run the scraper.
        
        Args:
            strategy: Scraping strategy ('categories', 'search', or 'both')
            
        Returns:
            Dictionary with scraping statistics
        """
        logger.info("=" * 60)
        logger.info(f"{self.retailer_name.upper()} Product Scraper")
        logger.info("=" * 60)
        
        start_time = time.time()
        
        if strategy in ['categories', 'both']:
            categories = self.discover_categories()
            categories = self.filter_grocery_categories(categories)
            
            logger.info(f"Scraping {len(categories)} grocery categories...")
            
            for i, category in enumerate(categories, 1):
                if self.max_items and self.scraped_count >= self.max_items:
                    logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                    break
                
                logger.info(f"Processing category {i}/{len(categories)}: {category.get('name', 'Unknown')}")
                self.scrape_category(category)
                
                # Rate limiting between categories
                if i < len(categories):
                    delay = self._get_random_delay()
                    time.sleep(delay)
        
        elapsed_time = time.time() - start_time
        
        stats = {
            'scraped': self.scraped_count,
            'failed': self.failed_count,
            'elapsed_seconds': elapsed_time
        }
        
        logger.info("=" * 60)
        logger.info("Scraping Complete!")
        logger.info(f"  ✅ Scraped: {self.scraped_count} products")
        logger.info(f"  ❌ Failed: {self.failed_count} products")
        logger.info(f"  ⏱️  Time: {elapsed_time:.2f} seconds")
        logger.info("=" * 60)
        
        return stats

