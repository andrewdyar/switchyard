#!/bin/bash
# Instructions for saving Costco Fusion API response

echo "To save the full Costco Fusion API response:"
echo ""
echo "1. In Chrome DevTools, go to Network tab"
echo "2. Find the Fusion API request (search for 'fusion' or 'query')"
echo "3. Right-click the request -> Copy -> Copy response"
echo "4. Save to a JSON file:"
echo ""
echo "   Paste the response into: costco_fusion_681_wh.json"
echo ""
echo "5. Then run:"
echo "   python3 import_costco_fusion_api.py costco_fusion_681_wh.json --location-number 681-wh"
echo ""

