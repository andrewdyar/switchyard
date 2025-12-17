#!/usr/bin/env python3
"""
Extract Fusion API JSON from user message and import.
"""
import json
import sys
import subprocess

# The user provided a large JSON in their message
# I need to extract the response.docs array with all 91 items
# For now, let me create a helper that can process JSON from stdin or file

print("""
To import the 91 Costco items, I need the FULL Fusion API response JSON.

Options:
1. If you have the JSON file saved: 
   python3 import_and_cleanup_costco.py <filename> --location-number 681-wh

2. If you paste the JSON here, I can extract it.

The JSON should start with:
{
  "fusion": {...},
  "response": {
    "docs": [...91 items...],
    "numFound": 91
  }
}
""")

