"""
Webshare Proxy Manager for Walmart Scraper

Manages proxy rotation, health tracking, and integration with Playwright/requests.
Supports Webshare proxy format: http://username:password@host:port
"""

import os
import json
import random
import time
import logging
from typing import List, Dict, Optional, Tuple, Any
from urllib.parse import urlparse
from collections import defaultdict

logger = logging.getLogger(__name__)


class WebshareProxyManager:
    """
    Manages Webshare proxies with rotation and health tracking.
    
    Supports:
    - Proxy rotation (round-robin, random, per-category)
    - Health tracking (success/failure rates)
    - Auto-removal of bad proxies
    - Integration with Playwright and requests
    """
    
    def __init__(
        self,
        proxies: Optional[List[str]] = None,
        rotation_strategy: str = 'round-robin',
        max_failures: int = 3
    ):
        """
        Initialize proxy manager.
        
        Args:
            proxies: List of proxy URLs (http://user:pass@host:port)
            rotation_strategy: 'round-robin', 'random', or 'per-category'
            max_failures: Number of failures before removing proxy
        """
        self.proxies: List[Dict[str, Any]] = []
        self.rotation_strategy = rotation_strategy
        self.max_failures = max_failures
        self.current_index = 0
        self.proxy_stats = defaultdict(lambda: {'success': 0, 'failures': 0, 'last_used': 0})
        self.category_proxy_map = {}  # Map category to proxy index
        
        if proxies:
            self.load_proxies(proxies)
        else:
            self.load_proxies_from_env()
    
    def load_proxies(self, proxy_list: List[str]):
        """Load proxies from a list of URLs."""
        for proxy_url in proxy_list:
            parsed = self._parse_proxy(proxy_url)
            if parsed:
                self.proxies.append(parsed)
        
        logger.info(f"Loaded {len(self.proxies)} proxies")
    
    def load_proxies_from_env(self):
        """Load proxies from environment variable or file."""
        # Try environment variable first
        proxy_env = os.getenv('WEBSHARE_PROXIES', '')
        if proxy_env:
            try:
                # Try JSON array first
                proxies = json.loads(proxy_env)
                if isinstance(proxies, list):
                    self.load_proxies(proxies)
                    return
            except json.JSONDecodeError:
                # Try newline-separated
                proxies = [p.strip() for p in proxy_env.split('\n') if p.strip()]
                if proxies:
                    self.load_proxies(proxies)
                    return
        
        # Try file (check multiple locations)
        proxy_files = [
            os.getenv('WEBSHARE_PROXIES_FILE', ''),
            'webshare_proxies.json',
            'proxies.json',
            'config/proxies.json',  # Repo-wide config
            os.path.join(os.path.dirname(__file__), '../../config/proxies.json')  # Relative to this file
        ]
        
        for proxy_file in proxy_files:
            if not proxy_file:
                continue
            # Handle relative paths
            if not os.path.isabs(proxy_file) and not os.path.exists(proxy_file):
                # Try relative to project root
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                proxy_file = os.path.join(project_root, proxy_file)
            
            if os.path.exists(proxy_file):
                try:
                    with open(proxy_file) as f:
                        data = json.load(f)
                        # Handle repo-wide config format
                        if isinstance(data, dict) and 'webshare' in data:
                            proxies = data['webshare'].get('proxies', [])
                            if proxies:
                                self.load_proxies(proxies)
                                logger.info(f"Loaded proxies from repo-wide config: {proxy_file}")
                                return
                        # Handle direct list format
                        elif isinstance(data, list):
                            self.load_proxies(data)
                            logger.info(f"Loaded proxies from: {proxy_file}")
                            return
                        # Handle nested format
                        elif isinstance(data, dict) and 'proxies' in data:
                            self.load_proxies(data['proxies'])
                            logger.info(f"Loaded proxies from: {proxy_file}")
                            return
                except Exception as e:
                    logger.warning(f"Could not load proxies from file {proxy_file}: {e}")
        
        # Try proxies.txt
        if os.path.exists('proxies.txt'):
            try:
                with open('proxies.txt') as f:
                    proxies = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                    if proxies:
                        self.load_proxies(proxies)
                        return
            except Exception as e:
                logger.warning(f"Could not load proxies from proxies.txt: {e}")
        
        logger.warning("No proxies loaded - scraper will run without proxies")
    
    def _parse_proxy(self, proxy_url: str) -> Optional[Dict[str, Any]]:
        """
        Parse proxy URL into components.
        
        Formats supported:
        - http://username:password@host:port
        - socks5://username:password@host:port
        - http://host:port (no auth)
        """
        try:
            parsed = urlparse(proxy_url)
            
            # Extract auth if present
            username = None
            password = None
            if parsed.username:
                username = parsed.username
            if parsed.password:
                password = parsed.password
            
            # If no auth in URL, try extracting from netloc
            if not username and '@' in parsed.netloc:
                auth_part, host_part = parsed.netloc.rsplit('@', 1)
                if ':' in auth_part:
                    username, password = auth_part.split(':', 1)
                else:
                    username = auth_part
                host, port = host_part.split(':')
            else:
                host = parsed.hostname
                port = parsed.port
            
            if not host or not port:
                logger.warning(f"Invalid proxy format: {proxy_url}")
                return None
            
            return {
                'server': f"{parsed.scheme or 'http'}://{host}:{port}",
                'username': username,
                'password': password,
                'url': proxy_url,
                'host': host,
                'port': port,
                'scheme': parsed.scheme or 'http'
            }
        except Exception as e:
            logger.warning(f"Failed to parse proxy {proxy_url}: {e}")
            return None
    
    def get_proxy(self, category: Optional[str] = None, avoid_recent: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get next proxy based on rotation strategy.
        
        Args:
            category: Category name for per-category rotation
            avoid_recent: If True, prefer proxies not used recently (better for trust score)
        
        Returns:
            Proxy dict with server, username, password or None if no proxies
        """
        if not self.proxies:
            return None
        
        # Filter out bad proxies
        available_proxies = [
            (i, p) for i, p in enumerate(self.proxies)
            if self.proxy_stats[i]['failures'] < self.max_failures
        ]
        
        if not available_proxies:
            # Reset failures if all proxies are bad (but wait longer)
            logger.warning("All proxies marked as failed, resetting failures after cooldown")
            time.sleep(60)  # Wait 1 minute before resetting
            for i in range(len(self.proxies)):
                self.proxy_stats[i]['failures'] = max(0, self.proxy_stats[i]['failures'] - 1)
            available_proxies = [
                (i, p) for i, p in enumerate(self.proxies)
                if self.proxy_stats[i]['failures'] < self.max_failures
            ]
            if not available_proxies:
                available_proxies = list(enumerate(self.proxies))
        
        if self.rotation_strategy == 'per-category' and category:
            # Use same proxy for category if available
            if category in self.category_proxy_map:
                proxy_idx = self.category_proxy_map[category]
                if proxy_idx < len(self.proxies):
                    proxy = self.proxies[proxy_idx]
                    self.proxy_stats[proxy_idx]['last_used'] = time.time()
                    return proxy
            
            # Assign new proxy to category
            idx, proxy = random.choice(available_proxies)
            self.category_proxy_map[category] = idx
            self.proxy_stats[idx]['last_used'] = time.time()
            return proxy
        
        elif self.rotation_strategy == 'random':
            idx, proxy = random.choice(available_proxies)
            self.proxy_stats[idx]['last_used'] = time.time()
            return proxy
        
        else:  # round-robin
            # Prefer proxies not used recently (better trust score)
            if avoid_recent:
                current_time = time.time()
                # Sort by last_used (oldest first), then by failures (fewest first)
                available_proxies.sort(key=lambda x: (
                    self.proxy_stats[x[0]]['last_used'],
                    self.proxy_stats[x[0]]['failures']
                ))
            
            # Find next available proxy
            for _ in range(len(available_proxies)):
                if self.current_index >= len(self.proxies):
                    self.current_index = 0
                
                proxy = self.proxies[self.current_index]
                if self.proxy_stats[self.current_index]['failures'] < self.max_failures:
                    idx = self.current_index
                    self.current_index += 1
                    self.proxy_stats[idx]['last_used'] = time.time()
                    return proxy
                
                self.current_index += 1
            
            # Fallback to first available (prefer least recently used)
            idx, proxy = available_proxies[0]
            self.current_index = idx + 1
            self.proxy_stats[idx]['last_used'] = time.time()
            return proxy
    
    def mark_success(self, proxy: Dict[str, Any]):
        """Mark proxy as successful."""
        for i, p in enumerate(self.proxies):
            if p['url'] == proxy.get('url') or p['server'] == proxy.get('server'):
                self.proxy_stats[i]['success'] += 1
                self.proxy_stats[i]['failures'] = max(0, self.proxy_stats[i]['failures'] - 1)  # Reduce failure count
                break
    
    def mark_failure(self, proxy: Dict[str, Any]):
        """Mark proxy as failed."""
        for i, p in enumerate(self.proxies):
            if p['url'] == proxy.get('url') or p['server'] == proxy.get('server'):
                self.proxy_stats[i]['failures'] += 1
                logger.warning(f"Proxy {p['host']}:{p['port']} marked as failed ({self.proxy_stats[i]['failures']}/{self.max_failures})")
                if self.proxy_stats[i]['failures'] >= self.max_failures:
                    logger.error(f"Proxy {p['host']}:{p['port']} exceeded max failures, removing from rotation")
                break
    
    def get_proxy_for_playwright(self, category: Optional[str] = None) -> Optional[Dict[str, str]]:
        """
        Get proxy in Playwright format.
        
        Returns:
            Dict with 'server', optionally 'username', 'password'
        """
        proxy = self.get_proxy(category)
        if not proxy:
            return None
        
        result = {'server': proxy['server']}
        if proxy.get('username'):
            result['username'] = proxy['username']
        if proxy.get('password'):
            result['password'] = proxy['password']
        
        return result
    
    def get_proxy_for_requests(self, category: Optional[str] = None) -> Optional[Dict[str, str]]:
        """
        Get proxy in requests format.
        
        Returns:
            Dict with 'http' and 'https' keys
        """
        proxy = self.get_proxy(category)
        if not proxy:
            return None
        
        # Build proxy URL with auth
        if proxy.get('username') and proxy.get('password'):
            auth = f"{proxy['username']}:{proxy['password']}@"
        else:
            auth = ""
        
        proxy_url = f"{proxy['scheme']}://{auth}{proxy['host']}:{proxy['port']}"
        
        return {
            'http': proxy_url,
            'https': proxy_url
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get proxy statistics."""
        return {
            'total_proxies': len(self.proxies),
            'available_proxies': sum(
                1 for i in range(len(self.proxies))
                if self.proxy_stats[i]['failures'] < self.max_failures
            ),
            'proxy_details': [
                {
                    'proxy': f"{p['host']}:{p['port']}",
                    'success': self.proxy_stats[i]['success'],
                    'failures': self.proxy_stats[i]['failures'],
                    'status': 'active' if self.proxy_stats[i]['failures'] < self.max_failures else 'failed'
                }
                for i, p in enumerate(self.proxies)
            ]
        }

