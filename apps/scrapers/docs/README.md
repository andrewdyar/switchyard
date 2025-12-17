# Retailer Scraping Guide

> Comprehensive documentation for scraping product data from grocery retailers

## Quick Reference

| Retailer | API Type | UPC Available | Aisle Location | Price Per Unit |
|----------|----------|---------------|----------------|----------------|
| HEB | GraphQL | PDP | Yes | Yes |
| Walmart | GraphQL | PDP | Yes (zone+aisle) | Yes |
| Target | REST | PDP | Fulfillment API | Yes |
| Costco | REST | PDP (GTIN-14) | No | Yes |
| Central Market | GraphQL | PDP | Yes | Yes |
| Whole Foods | HTML | ASIN Lookup | Yes (auth) | Yes |
| Trader Joe's | GraphQL | EAN-8 (computed) | No | Yes |

## Getting Started

Select a retailer from the sidebar to view detailed scraping documentation.

Each retailer guide includes:
- API endpoint documentation
- Field mapping to Goods schema
- Barcode extraction strategy
- Python code examples

