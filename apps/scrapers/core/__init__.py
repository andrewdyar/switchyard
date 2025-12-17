"""
Scrapers package for all retailer product scrapers.

All scrapers follow a consistent structure:
- Inherit from BaseScraper
- Use shared category_mapping module
- Filter to grocery categories only
- Support remote execution
"""

from core.base_scraper import BaseScraper
from core.category_mapping import normalize_category, should_include_category, is_grocery_category

__all__ = [
    'BaseScraper',
    'normalize_category',
    'should_include_category',
    'is_grocery_category',
]


