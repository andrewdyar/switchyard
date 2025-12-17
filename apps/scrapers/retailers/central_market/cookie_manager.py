"""
Central Market Cookie Manager - Automatically refreshes expired cookies
Uses Upstash Redis for persistent storage (works with Vercel serverless)
"""
import os
import json
import time
import logging
import requests
from typing import Optional, Dict
from pathlib import Path

logger = logging.getLogger(__name__)

# Cookie file in project root .cookies directory
PROJECT_ROOT = Path(__file__).parent.parent.parent
COOKIE_FILE = PROJECT_ROOT / '.cookies' / 'central_market.json'

# Try to import Upstash Redis (for serverless environments)
UPSTASH_REDIS_AVAILABLE = False
redis_client = None

try:
    from upstash_redis import Redis
    redis_url = os.getenv('UPSTASH_REDIS_REST_URL', '').strip()
    redis_token = os.getenv('UPSTASH_REDIS_REST_TOKEN', '').strip()
    
    # Upstash Redis REST URL should NOT have /rest suffix
    if redis_url and redis_url.endswith('/rest'):
        redis_url = redis_url[:-5]
    elif redis_url and redis_url.endswith('/rest/'):
        redis_url = redis_url[:-6]
    
    if redis_url and redis_token:
        redis_client = Redis(url=redis_url, token=redis_token)
        UPSTASH_REDIS_AVAILABLE = True
        logger.info(f"✅ Upstash Redis initialized for Central Market")
except ImportError:
    pass
except Exception as e:
    logger.warning(f"Could not initialize Upstash Redis: {e}")


class CentralMarketCookieManager:
    """
    Manages Central Market cookies with automatic refresh.
    
    Storage backends (in priority order):
    1. Upstash Redis (serverless/production) - persistent across invocations
    2. File system (local development) - for testing
    3. Environment variable (fallback)
    
    Key cookies for Central Market (Incapsula-based):
    - visid_incap_* - Visitor ID
    - nlbi_* - Load balancer ID
    - incap_ses_* - Session token
    - reese84 - Bot detection token
    - cmState - Store selection state
    """
    
    BASE_URL = "https://www.centralmarket.com"
    
    # Essential cookies for Central Market
    ESSENTIAL_COOKIES = [
        'visid_incap_2487195',  # Visitor ID
        'nlbi_2487195',         # Load balancer
        'incap_ses_',           # Session (prefix)
        'reese84',              # Bot detection
        'cmState',              # Store state
    ]
    
    def __init__(self, cookie_file: Path = COOKIE_FILE, store_id: str = "61"):
        self.cookie_file = cookie_file
        self.store_id = store_id
        self.cookies: Dict[str, str] = {}
        self.last_refresh: float = 0
        self.refresh_interval = 15 * 60  # Refresh every 15 minutes
        self.use_redis = UPSTASH_REDIS_AVAILABLE and redis_client is not None
        self._session = None
    
    def _get_storage_key(self) -> str:
        """Get the storage key for cookies."""
        return f"central_market_cookies_{self.store_id}"
    
    def _load_from_redis(self) -> Optional[Dict]:
        """Load cookies from Upstash Redis."""
        if not self.use_redis or not redis_client:
            return None
        
        try:
            data_str = redis_client.get(self._get_storage_key())
            if data_str:
                return json.loads(data_str)
        except Exception as e:
            logger.warning(f"Could not load cookies from Redis: {e}")
        
        return None
    
    def _save_to_redis(self, data: Dict) -> bool:
        """Save cookies to Upstash Redis."""
        if not self.use_redis or not redis_client:
            return False
        
        try:
            redis_client.set(self._get_storage_key(), json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"Could not save cookies to Redis: {e}")
            return False
    
    def _load_from_file(self) -> Optional[Dict]:
        """Load cookies from file."""
        if self.cookie_file.exists():
            try:
                with open(self.cookie_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load cookies from file: {e}")
        return None
    
    def _save_to_file(self, data: Dict):
        """Save cookies to file."""
        try:
            if self.use_redis:
                return
            with open(self.cookie_file, 'w') as f:
                json.dump(data, f, indent=2)
        except (PermissionError, OSError):
            pass
        except Exception as e:
            logger.warning(f"Could not save cookies to file: {e}")
    
    def _parse_cookie_string(self, cookie_string: str) -> Dict[str, str]:
        """Parse cookie string into dictionary."""
        cookies = {}
        for cookie in cookie_string.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                cookies[key.strip()] = value.strip()
        return cookies
    
    def _save_cookies(self):
        """Save cookies to appropriate storage backend."""
        data = {
            'cookies': self.cookies,
            'last_refresh': self.last_refresh,
            'store_id': self.store_id
        }
        
        if self.use_redis:
            if self._save_to_redis(data):
                logger.info("Saved cookies to Redis")
                return
        
        self._save_to_file(data)
    
    def load_cookies(self) -> Dict[str, str]:
        """Load cookies from Redis, file, or environment variable."""
        # Try Redis first
        if self.use_redis:
            data = self._load_from_redis()
            if data:
                self.cookies = data.get('cookies', {})
                self.last_refresh = data.get('last_refresh', 0)
                logger.info(f"Loaded {len(self.cookies)} cookies from Redis")
                return self.cookies
        
        # Try file
        data = self._load_from_file()
        if data:
            self.cookies = data.get('cookies', {})
            self.last_refresh = data.get('last_refresh', 0)
            logger.info(f"Loaded {len(self.cookies)} cookies from file")
            return self.cookies
        
        # Fall back to environment variable
        cookie_string = os.getenv('CENTRAL_MARKET_COOKIES', '')
        if cookie_string:
            self.cookies = self._parse_cookie_string(cookie_string)
            self.last_refresh = time.time()
            self._save_cookies()
            logger.info(f"Loaded {len(self.cookies)} cookies from environment")
            return self.cookies
        
        return {}
    
    def update_cookies(self, cookie_string: str):
        """Update cookies from a cookie string."""
        self.cookies = self._parse_cookie_string(cookie_string)
        self.last_refresh = time.time()
        self._save_cookies()
        logger.info(f"Updated {len(self.cookies)} cookies")
    
    def get_cookie_string(self) -> str:
        """Get cookies as a cookie string."""
        return '; '.join([f"{k}={v}" for k, v in self.cookies.items()])
    
    def _get_session(self) -> requests.Session:
        """Get or create a requests session."""
        if self._session is None:
            self._session = requests.Session()
            self._session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not_A Brand";v="99"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
            })
        return self._session
    
    def _refresh_cookies(self) -> bool:
        """
        Refresh cookies by making a request to Central Market.
        
        Returns:
            True if refresh was successful
        """
        if not self.cookies:
            return False
        
        try:
            session = self._get_session()
            session.cookies.update(self.cookies)
            
            # Make a request to the homepage to refresh session
            response = session.get(
                f"{self.BASE_URL}/",
                timeout=30,
                allow_redirects=True
            )
            
            if response.status_code == 200 and 'Pardon Our Interruption' not in response.text:
                # Update cookies from response
                new_cookies = session.cookies.get_dict()
                if new_cookies:
                    self.cookies.update(new_cookies)
                    logger.info("Refreshed cookies from homepage")
                    return True
            
            # Try a search page as fallback
            response = session.get(
                f"{self.BASE_URL}/search?q=test",
                timeout=30,
                allow_redirects=True
            )
            
            if response.status_code == 200 and 'Pardon Our Interruption' not in response.text:
                new_cookies = session.cookies.get_dict()
                if new_cookies:
                    self.cookies.update(new_cookies)
                    logger.info("Refreshed cookies from search")
                    return True
            
            logger.warning("Cookie refresh failed - may need new cookies")
            return False
            
        except Exception as e:
            logger.error(f"Error refreshing cookies: {e}")
            return False
    
    def _establish_new_session(self) -> bool:
        """
        Establish a completely new session without existing cookies.
        This can sometimes bypass blocks.
        
        Returns:
            True if successful
        """
        try:
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            })
            
            # Make initial request to get cookies
            response = session.get(
                f"{self.BASE_URL}/",
                timeout=30,
                allow_redirects=True
            )
            
            if response.status_code == 200:
                new_cookies = session.cookies.get_dict()
                if new_cookies:
                    self.cookies = new_cookies
                    
                    # Set store state if not present
                    if 'cmState' not in self.cookies:
                        # Default Austin North Lamar store state
                        self.cookies['cmState'] = '%7B%22active%22%3Atrue%2C%22storeId%22%3A61%2C%22fulfillmentType%22%3A%22pickup%22%7D'
                    
                    self.last_refresh = time.time()
                    self._session = session
                    logger.info(f"Established new session with {len(self.cookies)} cookies")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error establishing new session: {e}")
            return False
    
    def get_cookies(self, force_refresh: bool = False) -> Dict[str, str]:
        """
        Get current cookies, refreshing if needed.
        
        NOTE: Central Market uses Incapsula bot protection which cannot be bypassed
        with pure Python requests. Initial cookies MUST come from a real browser.
        Set the CENTRAL_MARKET_COOKIES environment variable with cookies from your browser.
        
        Args:
            force_refresh: Force a refresh even if not expired
            
        Returns:
            Dictionary of cookies
        """
        if not self.cookies:
            self.load_cookies()
        
        # If still no cookies, we cannot establish a session automatically
        if not self.cookies:
            logger.warning("""
╔════════════════════════════════════════════════════════════════════════╗
║ No Central Market cookies found!                                        ║
║                                                                        ║
║ To get cookies:                                                        ║
║ 1. Open Central Market in your browser                                 ║
║ 2. Open DevTools (F12) → Network tab                                   ║
║ 3. Browse to a search page (e.g., search for 'cheese')                ║
║ 4. Copy the Cookie header from any request                             ║
║ 5. Set CENTRAL_MARKET_COOKIES environment variable                     ║
║                                                                        ║
║ Example:                                                               ║
║   export CENTRAL_MARKET_COOKIES='visid_incap_...; incap_ses_...'       ║
╚════════════════════════════════════════════════════════════════════════╝
""")
            return {}
        
        # Check if refresh is needed (only refresh existing cookies, never create new)
        time_since_refresh = time.time() - self.last_refresh
        needs_refresh = force_refresh or (time_since_refresh > self.refresh_interval)
        
        if needs_refresh and self.cookies:
            logger.info("Refreshing Central Market cookies...")
            if self._refresh_cookies():
                self.last_refresh = time.time()
                self._save_cookies()
                logger.info("✅ Cookies refreshed successfully")
            else:
                logger.warning("⚠️ Cookie refresh failed - may need new browser cookies")
        
        return self.cookies
    
    def handle_blocked_response(self, response: requests.Response) -> bool:
        """
        Handle a blocked response by attempting to refresh cookies.
        
        NOTE: Incapsula blocks cannot be bypassed without real browser cookies.
        If this returns False, you need fresh cookies from the browser.
        
        Args:
            response: The blocked response
            
        Returns:
            True if cookies were refreshed successfully
        """
        is_blocked = (
            response.status_code == 403 or
            'Pardon Our Interruption' in response.text or
            'incapsula' in response.text.lower()
        )
        
        if not is_blocked:
            return True
        
        logger.warning("Blocked by Incapsula, attempting cookie refresh...")
        
        # Try refreshing existing cookies (may work if session is just stale)
        if self.cookies and self._refresh_cookies():
            self.last_refresh = time.time()
            self._save_cookies()
            logger.info("✅ Cookie refresh successful")
            return True
        
        # Cannot bypass Incapsula with pure Python
        logger.error("""
╔════════════════════════════════════════════════════════════════════════╗
║ Blocked by Incapsula - need fresh browser cookies!                      ║
║                                                                        ║
║ To get fresh cookies:                                                  ║
║ 1. Open https://www.centralmarket.com in your browser                 ║
║ 2. Open DevTools (F12) → Network tab                                   ║
║ 3. Refresh the page or search for something                           ║
║ 4. Copy the Cookie header from any request                             ║
║ 5. Update CENTRAL_MARKET_COOKIES environment variable                  ║
╚════════════════════════════════════════════════════════════════════════╝
""")
        return False


# Global instance
_cookie_manager: Optional[CentralMarketCookieManager] = None


def get_cookie_manager(store_id: str = "61") -> CentralMarketCookieManager:
    """Get the global cookie manager instance."""
    global _cookie_manager
    if _cookie_manager is None or _cookie_manager.store_id != store_id:
        _cookie_manager = CentralMarketCookieManager(store_id=store_id)
    return _cookie_manager

