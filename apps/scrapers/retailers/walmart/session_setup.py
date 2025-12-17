#!/usr/bin/env python3
"""
Walmart Session Setup - Uses your REAL Chrome browser

1. Closes any existing Chrome
2. Launches Chrome with debugging enabled
3. You browse Walmart and pass CAPTCHA
4. We extract cookies via Chrome DevTools Protocol
"""

import json
import os
import subprocess
import sys
import time
import requests


def launch_chrome_with_debugging():
    """Launch Chrome with remote debugging enabled."""
    chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    
    if not os.path.exists(chrome_path):
        print("❌ Chrome not found at expected path")
        return False
    
    # Launch Chrome with debugging
    subprocess.Popen([
        chrome_path,
        '--remote-debugging-port=9222',
        '--user-data-dir=/tmp/walmart-chrome-profile',
        'https://www.walmart.com/search?q=milk'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    return True


def get_cookies_from_chrome():
    """Extract cookies from Chrome via CDP."""
    try:
        import websocket
    except ImportError:
        print("Installing websocket-client...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'websocket-client', '-q'])
        import websocket
    
    try:
        # Get list of pages
        response = requests.get('http://localhost:9222/json', timeout=5)
        pages = response.json()
        
        # Find Walmart page
        walmart_page = None
        for page in pages:
            if 'walmart.com' in page.get('url', ''):
                walmart_page = page
                break
        
        if not walmart_page:
            return None
        
        # Connect via websocket
        ws_url = walmart_page.get('webSocketDebuggerUrl')
        if not ws_url:
            return None
        
        ws = websocket.create_connection(ws_url, timeout=10)
        
        # Get all cookies
        ws.send(json.dumps({'id': 1, 'method': 'Network.getAllCookies'}))
        result = json.loads(ws.recv())
        ws.close()
        
        # Filter Walmart cookies
        cookies = {}
        for cookie in result.get('result', {}).get('cookies', []):
            if 'walmart.com' in cookie.get('domain', ''):
                cookies[cookie['name']] = cookie['value']
        
        return cookies
        
    except requests.exceptions.ConnectionError:
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def test_cookies(cookies):
    """Test if cookies work for API."""
    session = requests.Session()
    for name, value in cookies.items():
        session.cookies.set(name, value, domain='.walmart.com')
    
    headers = {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'referer': 'https://www.walmart.com/search?q=test',
    }
    
    import urllib.parse
    variables = {"query": "bananas", "page": 1, "prg": "mWeb", "ps": 10, "limit": 10}
    url = f'https://www.walmart.com/orchestra/snb/graphql/Search/5442018b81bb7e67e6c258f3be07d18ae4cabed7bdc1c48b17042fff641e2d9b/search?variables={urllib.parse.quote(json.dumps(variables))}'
    
    response = session.get(url, headers=headers, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        search = data.get('data', {}).get('search', {})
        stacks = search.get('itemStacks', [])
        if stacks:
            items = stacks[0].get('items', [])
            return len(items), items[0].get('name', '')[:40] if items else ''
    
    return 0, f"Error {response.status_code}"


def main():
    print("=" * 60)
    print("WALMART SESSION SETUP (Real Chrome)")
    print("=" * 60)
    print()
    
    # Check if Chrome is already running with debugging
    cookies = get_cookies_from_chrome()
    
    if cookies is None:
        print("Chrome not running with debugging. Launching...")
        print()
        print("⚠️  IMPORTANT: Close ALL Chrome windows first!")
        print()
        input("Press ENTER after closing Chrome... ")
        
        if not launch_chrome_with_debugging():
            return False
        
        print()
        print("Chrome launched! Waiting for it to start...")
        time.sleep(3)
    
    print()
    print("=" * 60)
    print("CHROME IS OPEN")
    print("=" * 60)
    print()
    print("In the Chrome window:")
    print("1. Complete any CAPTCHA/robot verification")
    print("2. Make sure you can see product search results")
    print("3. Come back here and press ENTER")
    print()
    
    while True:
        input(">>> Press ENTER when products are visible... ")
        
        print("\nExtracting cookies...")
        cookies = get_cookies_from_chrome()
        
        if not cookies:
            print("❌ Could not get cookies. Is Walmart open in Chrome?")
            continue
        
        print(f"✅ Got {len(cookies)} cookies")
        
        # Test them
        print("Testing API...")
        count, first = test_cookies(cookies)
        
        if count > 0:
            print(f"✅ SUCCESS! Found {count} items")
            print(f"   First: {first}")
            
            # Save cookies
            with open('.walmart_session.json', 'w') as f:
                json.dump({
                    'cookies': cookies,
                    'timestamp': time.time()
                }, f, indent=2)
            
            print("\n✅ Saved to .walmart_session.json")
            print("\n🎉 Session ready! You can now run the scraper.")
            print("\nYou can close Chrome now.")
            return True
        else:
            print(f"❌ API test failed: {first}")
            print("   Try refreshing the Walmart page and searching again.")
            continue


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
