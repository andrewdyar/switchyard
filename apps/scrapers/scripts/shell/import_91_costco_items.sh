#!/bin/bash
# Script to import 91 Costco items and clean up old Apify items

set -e

echo "=========================================="
echo "Costco Fusion API Import & Cleanup"
echo "=========================================="
echo ""

# Check if JSON file exists
if [ -f "costco_fusion_681_wh.json" ]; then
    echo "✅ Found costco_fusion_681_wh.json"
    python3 import_and_cleanup_costco.py costco_fusion_681_wh.json --location-number 681-wh
else
    echo "❌ File costco_fusion_681_wh.json not found"
    echo ""
    echo "Please save the FULL Fusion API response to: costco_fusion_681_wh.json"
    echo ""
    echo "The JSON should contain:"
    echo "  - response.docs: array with 91 items"
    echo "  - response.numFound: 91"
    echo "  - Each item has item_location_locationNumber: '681-wh'"
    echo ""
    echo "Then run this script again:"
    echo "  ./import_91_costco_items.sh"
    echo ""
    exit 1
fi

