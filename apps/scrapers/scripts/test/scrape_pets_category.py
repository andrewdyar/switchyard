"""
Scrape HEB Pets category only.

This script uses the same methods and rate limiting as the main HEB scraper.
It will automatically create categories and subcategories from product data.
"""

import os
import sys
import logging
from heb_product_scraper import HEBProductScraper
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def scrape_pets_category():
    """
    Scrape Pets category from HEB using the same methods as the main scraper.
    Categories and subcategories will be automatically created from product data.
    """
    # Get cookies from environment
    cookies = os.getenv('HEB_COOKIES')
    if not cookies:
        logger.error("HEB_COOKIES environment variable not set!")
        logger.info("Please set HEB_COOKIES in your .env file or export it.")
        sys.exit(1)
    
    # Get store ID if available
    store_id = os.getenv('HEB_STORE_ID')
    
    # Pets category URLs from the GraphQL response
    # The scraper will automatically create categories from product full_category_hierarchy
    pets_categories = [
        {
            'name': 'Pets',
            'id': '490025',
            'url': '/category/shop/pets/2863/490025',
            'parent': None
        },
        {
            'name': 'Dogs',
            'id': '490131',
            'url': '/category/shop/pets/dogs/490025/490131',
            'parent': 'Pets'
        },
        {
            'name': 'Cats',
            'id': '490130',
            'url': '/category/shop/pets/cats/490025/490130',
            'parent': 'Pets'
        },
        {
            'name': 'Birds',
            'id': '490129',
            'url': '/category/shop/pets/birds/490025/490129',
            'parent': 'Pets'
        },
        {
            'name': 'Fish',
            'id': '490132',
            'url': '/category/shop/pets/fish/490025/490132',
            'parent': 'Pets'
        },
        {
            'name': 'Small animals',
            'id': '490134',
            'url': '/category/shop/pets/small-animals/490025/490134',
            'parent': 'Pets'
        },
        {
            'name': 'Reptiles',
            'id': '490133',
            'url': '/category/shop/pets/reptiles/490025/490133',
            'parent': 'Pets'
        }
    ]
    
    logger.info("=" * 80)
    logger.info("HEB Pets Category Scraper")
    logger.info("=" * 80)
    logger.info(f"Using store ID: {store_id or 'None (no store-specific context)'}")
    logger.info(f"Rate limiting: 0.8s base + 0.3s variance (same as main scraper)")
    logger.info("")
    
    # Create scraper with same settings as main scraper
    scraper = HEBProductScraper(store_id=store_id, cookies=cookies, dry_run=False)
    # Set rate limiting: 0.5s base + 0.3s variance
    scraper.rate_limit_delay = 0.5
    scraper.rate_limit_variance = 0.3
    
    # Scrape each category (main + subcategories)
    total_scraped = 0
    
    for category in pets_categories:
        logger.info("=" * 80)
        logger.info(f"Scraping: {category['name']}")
        logger.info(f"URL: {category['url']}")
        logger.info("=" * 80)
        
        try:
            # Use the same scrape_category method as the main scraper
            # This will:
            # 1. Fetch products from the category URL
            # 2. Extract full_category_hierarchy from each product (e.g., "Pets/Dogs")
            # 3. Automatically create categories/subcategories via parse_and_create_category_hierarchy()
            # 4. Store all product data including raw_data
            count = scraper.scrape_category(category)
            total_scraped += count
            logger.info(f"✅ Scraped {count} products from {category['name']}")
        except Exception as e:
            logger.error(f"❌ Error scraping {category['name']}: {e}", exc_info=True)
    
    logger.info("")
    logger.info("=" * 80)
    logger.info(f"Pets Category Scraping Complete!")
    logger.info(f"Total products scraped: {total_scraped}")
    logger.info(f"Total products processed: {scraper.scraped_count}")
    logger.info(f"Failed: {scraper.failed_count}")
    logger.info("=" * 80)
    logger.info("")
    logger.info("Note: Categories and subcategories were automatically created")
    logger.info("from product full_category_hierarchy data (e.g., 'Pets/Dogs').")
    logger.info("All products include full raw_data JSON.")


if __name__ == '__main__':
    scrape_pets_category()
