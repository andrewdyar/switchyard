"""
Connect to existing Chrome browser and use its Walmart session.

Usage:
1. Start Chrome with: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
2. Browse to walmart.com and pass any challenges
3. Run this script to extract cookies and test API
"""
import requests
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_cookies_from_chrome_cdp(port=9222):
    """Get cookies from Chrome via CDP."""
    try:
        # Get list of pages
        response = requests.get(f'http://localhost:{port}/json')
        pages = response.json()
        
        # Find Walmart page
        walmart_page = None
        for page in pages:
            if 'walmart.com' in page.get('url', ''):
                walmart_page = page
                break
        
        if not walmart_page:
            logger.warning("No Walmart page found in Chrome. Open walmart.com first.")
            return None
        
        # Connect via websocket to get cookies
        ws_url = walmart_page.get('webSocketDebuggerUrl')
        if not ws_url:
            logger.error("No websocket URL available")
            return None
        
        # Use CDP to get cookies
        import websocket
        ws = websocket.create_connection(ws_url)
        
        # Get all cookies
        ws.send(json.dumps({
            'id': 1,
            'method': 'Network.getAllCookies'
        }))
        
        result = json.loads(ws.recv())
        ws.close()
        
        cookies = {}
        for cookie in result.get('result', {}).get('cookies', []):
            if 'walmart.com' in cookie.get('domain', ''):
                cookies[cookie['name']] = cookie['value']
        
        return cookies
        
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to Chrome on port {port}")
        logger.error("Start Chrome with: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222")
        return None
    except Exception as e:
        logger.error(f"Error: {e}")
        return None


def test_walmart_api(cookies):
    """Test if cookies work for Walmart API."""
    session = requests.Session()
    
    # Set cookies
    for name, value in cookies.items():
        session.cookies.set(name, value, domain='.walmart.com')
    
    # Set headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.walmart.com/search?q=milk',
        'Origin': 'https://www.walmart.com',
    }
    
    # Simple search query
    variables = {
        "query": "milk",
        "page": 1,
        "prg": "mWeb",
        "ps": 40,
        "limit": 40,
        "sort": "best_match",
        "catId": "",
        "facet": "",
        "searchArgs": {"query": "milk", "cat_id": "", "prg": "mWeb", "facet": ""}
    }
    
    import urllib.parse
    variables_encoded = urllib.parse.quote(json.dumps(variables, separators=(',', ':')))
    
    url = f"https://www.walmart.com/orchestra/snb/graphql/Search/5442018b81bb7e67e6c258f3be07d18ae4cabed7bdc1c48b17042fff641e2d9b/search?variables={variables_encoded}"
    
    response = session.get(url, headers=headers, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        if 'data' in data:
            search = data['data'].get('search', {})
            stacks = search.get('itemStacks', [])
            if stacks:
                items = stacks[0].get('items', [])
                logger.info(f"✅ SUCCESS! Found {len(items)} items")
                return True
    
    logger.error(f"❌ Failed: {response.status_code}")
    if response.status_code == 412:
        logger.error("Still blocked by PerimeterX")
    return False


if __name__ == '__main__':
    print("Connecting to Chrome...")
    cookies = get_cookies_from_chrome_cdp()
    
    if cookies:
        print(f"Got {len(cookies)} cookies from Chrome")
        
        # Save cookies
        with open('.walmart_session_cookies.json', 'w') as f:
            json.dump(cookies, f, indent=2)
        print("Saved to .walmart_session_cookies.json")
        
        # Test API
        print("\nTesting Walmart API...")
        test_walmart_api(cookies)
    else:
        print("Failed to get cookies")

