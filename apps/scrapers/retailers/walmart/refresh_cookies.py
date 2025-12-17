#!/usr/bin/env python3
"""
Script to refresh Walmart cookies manually or set up initial cookies.
"""
import sys
from walmart_cookie_manager import get_cookie_manager
import os

def main():
    cookie_manager = get_cookie_manager()
    
    # Check if cookies exist
    existing_cookies = cookie_manager.load_cookies()
    
    if existing_cookies:
        print(f"✅ Found {len(existing_cookies)} existing cookies")
        print("Refreshing cookies...")
        refreshed = cookie_manager.get_cookies(force_refresh=True)
        if refreshed:
            print(f"✅ Successfully refreshed {len(refreshed)} cookies")
        else:
            print("❌ Failed to refresh cookies")
            print("   You may need to provide fresh cookies from your browser")
    else:
        # Try to load from environment
        cookie_string = os.getenv('WALMART_COOKIES', '')
        if cookie_string:
            print(f"✅ Found cookies in environment variable")
            cookie_manager.update_cookies(cookie_string)
            print(f"✅ Saved {len(cookie_manager.cookies)} cookies to file")
        else:
            print("❌ No cookies found!")
            print("\nTo set up cookies:")
            print("1. Get cookies from your browser (Network tab → Cookie header)")
            print("2. Run: export WALMART_COOKIES='your_cookie_string'")
            print("3. Run this script again")
            print("\nOr provide cookies directly:")
            print("  python3 refresh_walmart_cookies.py 'cookie_string_here'")
            sys.exit(1)
    
    # Show cookie file location
    print(f"\n📁 Cookies saved to: {cookie_manager.cookie_file}")
    print("   The Flask app will automatically use these cookies")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Cookies provided as argument
        cookie_string = sys.argv[1]
        cookie_manager = get_cookie_manager()
        cookie_manager.update_cookies(cookie_string)
        print(f"✅ Saved {len(cookie_manager.cookies)} cookies")
    else:
        main()

