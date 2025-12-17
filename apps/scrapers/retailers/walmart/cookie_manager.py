"""
Walmart Cookie Manager - Automatically refreshes expired cookies
Uses Upstash Redis for persistent storage (works with Vercel serverless)
"""
import os
import json
import time
import requests
from typing import Optional, Dict
from pathlib import Path

# Cookie file in project root .cookies directory
PROJECT_ROOT = Path(__file__).parent.parent.parent
COOKIE_FILE = PROJECT_ROOT / '.cookies' / 'walmart.json'

# Try to import Upstash Redis (for serverless environments)
UPSTASH_REDIS_AVAILABLE = False
redis_client = None

try:
    from upstash_redis import Redis
    redis_url = os.getenv('UPSTASH_REDIS_REST_URL', '').strip()
    redis_token = os.getenv('UPSTASH_REDIS_REST_TOKEN', '').strip()
    
    # Upstash Redis REST URL should NOT have /rest suffix - the library handles it
    # Remove /rest if it's already there
    if redis_url and redis_url.endswith('/rest'):
        redis_url = redis_url[:-5]  # Remove '/rest'
    elif redis_url and redis_url.endswith('/rest/'):
        redis_url = redis_url[:-6]  # Remove '/rest/'
    
    if redis_url and redis_token:
        redis_client = Redis(url=redis_url, token=redis_token)
        UPSTASH_REDIS_AVAILABLE = True
        print(f"✅ Upstash Redis initialized: {redis_url[:50]}...")
except ImportError:
    print("⚠️  upstash-redis package not installed. Install with: pip install upstash-redis")
except Exception as e:
    print(f"⚠️  Could not initialize Upstash Redis: {e}")


class WalmartCookieManager:
    """
    Manages Walmart cookies with automatic refresh.
    
    Storage backends (in priority order):
    1. Upstash Redis (serverless/production) - persistent across invocations
    2. File system (local development) - for testing
    3. Environment variable (fallback)
    
    Refresh strategies:
    1. Lightweight request to keep session alive
    2. Automatic refresh every 20 minutes (before 30 min expiry)
    """
    
    def __init__(self, cookie_file: Path = COOKIE_FILE):
        self.cookie_file = cookie_file
        self.cookies: Dict[str, str] = {}
        self.last_refresh: float = 0
        self.refresh_interval = 20 * 60  # Refresh every 20 minutes (before 30 min expiry)
        self.use_redis = UPSTASH_REDIS_AVAILABLE and redis_client is not None
    
    def _get_storage_key(self) -> str:
        """Get the storage key for cookies."""
        return "walmart_cookies"
    
    def _load_from_redis(self) -> Optional[Dict]:
        """Load cookies from Upstash Redis."""
        if not self.use_redis or not redis_client:
            return None
        
        try:
            data_str = redis_client.get(self._get_storage_key())
            if data_str:
                return json.loads(data_str)
        except Exception as e:
            print(f"⚠️  Could not load cookies from Redis: {e}")
        
        return None
    
    def _save_to_redis(self, data: Dict) -> bool:
        """Save cookies to Upstash Redis."""
        if not self.use_redis or not redis_client:
            return False
        
        try:
            redis_client.set(self._get_storage_key(), json.dumps(data))
            return True
        except Exception as e:
            print(f"⚠️  Could not save cookies to Redis: {e}")
            return False
    
    def _load_from_file(self) -> Optional[Dict]:
        """Load cookies from file."""
        if self.cookie_file.exists():
            try:
                with open(self.cookie_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Could not load cookies from file: {e}")
        
        return None
    
    def _save_to_file(self, data: Dict):
        """Save cookies to file."""
        try:
            # In serverless, prefer Redis over file
            if self.use_redis:
                return
            
            with open(self.cookie_file, 'w') as f:
                json.dump(data, f)
        except (PermissionError, OSError):
            # File system is read-only (common in serverless)
            pass
        except Exception as e:
            print(f"⚠️  Could not save cookies to file: {e}")
    
    def load_cookies(self) -> Dict[str, str]:
        """Load cookies from Redis, file, or environment variable."""
        # Try Redis first (for serverless)
        if self.use_redis:
            data = self._load_from_redis()
            if data:
                self.cookies = data.get('cookies', {})
                self.last_refresh = data.get('last_refresh', 0)
                return self.cookies
        
        # Try file (for local development)
        data = self._load_from_file()
        if data:
            self.cookies = data.get('cookies', {})
            self.last_refresh = data.get('last_refresh', 0)
            return self.cookies
        
        # Fall back to environment variable (initial setup)
        cookie_string = os.getenv('WALMART_COOKIES', '')
        if cookie_string:
            self.cookies = self._parse_cookie_string(cookie_string)
            self.last_refresh = time.time()
            self._save_cookies()  # Save to Redis or file
            return self.cookies
        
        return {}
    
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
            'last_refresh': self.last_refresh
        }
        
        # Try Redis first (for serverless)
        if self.use_redis:
            if self._save_to_redis(data):
                return
        
        # Fall back to file (for local)
        self._save_to_file(data)
    
    def get_cookies(self, force_refresh: bool = False) -> Dict[str, str]:
        """
        Get current cookies, refreshing if needed.
        
        Args:
            force_refresh: Force a refresh even if not expired
            
        Returns:
            Dictionary of cookies
        """
        if not self.cookies:
            self.load_cookies()
        
        # Check if refresh is needed
        time_since_refresh = time.time() - self.last_refresh
        needs_refresh = force_refresh or (time_since_refresh > self.refresh_interval)
        
        if needs_refresh and self.cookies:
            print("🔄 Refreshing Walmart cookies...")
            if self._refresh_cookies():
                self.last_refresh = time.time()
                self._save_cookies()
                print("✅ Cookies refreshed successfully")
            else:
                print("⚠️  Cookie refresh failed, using existing cookies")
        
        return self.cookies
    
    def _refresh_cookies(self) -> bool:
        """
        Refresh cookies by making a lightweight request to Walmart.
        
        Returns:
            True if refresh was successful
        """
        if not self.cookies:
            return False
        
        try:
            # Make a lightweight request to Walmart to refresh session
            session = requests.Session()
            session.cookies.update(self.cookies)
            
            # Set headers to match browser
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'Origin': 'https://www.walmart.com',
                'Referer': 'https://www.walmart.com/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            })
            
            # Make a request to a page that requires auth - this should refresh cookies
            response = session.get(
                "https://www.walmart.com/account/home",
                timeout=10,
                allow_redirects=True
            )
            
            # Update cookies from response
            if response.status_code == 200:
                new_cookies = session.cookies.get_dict()
                if new_cookies:
                    self.cookies.update(new_cookies)
                    return True
            
            # If that didn't work, try the main page
            response = session.get(
                "https://www.walmart.com/",
                timeout=10,
                allow_redirects=True
            )
            
            if response.status_code == 200:
                new_cookies = session.cookies.get_dict()
                if new_cookies:
                    self.cookies.update(new_cookies)
                    return True
            
            return False
            
        except Exception as e:
            print(f"⚠️  Error refreshing cookies: {e}")
            return False
    
    def update_cookies(self, cookie_string: str):
        """Update cookies from a cookie string."""
        self.cookies = self._parse_cookie_string(cookie_string)
        self.last_refresh = time.time()
        self._save_cookies()
        print(f"✅ Updated {len(self.cookies)} cookies")
    
    def get_cookie_string(self) -> str:
        """Get cookies as a cookie string."""
        return '; '.join([f"{k}={v}" for k, v in self.cookies.items()])


# Global instance
_cookie_manager: Optional[WalmartCookieManager] = None


def get_cookie_manager() -> WalmartCookieManager:
    """Get the global cookie manager instance."""
    global _cookie_manager
    if _cookie_manager is None:
        _cookie_manager = WalmartCookieManager()
    return _cookie_manager
