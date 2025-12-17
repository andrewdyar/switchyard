"""
Walmart GraphQL API Client

This module provides a client for interacting with Walmart's GraphQL API.
It handles authentication via cookies and provides utilities for shopping list operations.
"""

import os
import requests
import json
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class GraphQLResponse:
    """Container for GraphQL API responses."""
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[Dict[str, Any]]] = None
    success: bool = False


class WalmartGraphQLClient:
    """
    Client for Walmart's GraphQL API with cookie-based authentication.
    
    Usage:
        client = WalmartGraphQLClient()
        response = client.add_item_to_list_lite(items, list_id)
    """
    
    def __init__(
        self,
        base_url: str = "https://www.walmart.com/orchestra/home/graphql",
        use_browser: bool = True,
        proxy_manager = None
    ):
        """
        Initialize the Walmart GraphQL client.
        
        Args:
            base_url: The GraphQL endpoint base URL (without operation name and hash)
            use_browser: Use browser automation for bot detection bypass
            proxy_manager: Optional WebshareProxyManager instance for proxy rotation
        """
        self.base_url = base_url
        self.session = requests.Session()
        self.session_established = False
        self.use_browser = use_browser
        self.browser_session = None
        self.proxy_manager = proxy_manager
        self.current_proxy = None
        
        if self.use_browser:
            try:
                from scrapers.walmart.browser_session import WalmartBrowserSession
                # Get initial proxy if available
                proxy = None
                if self.proxy_manager:
                    proxy = self.proxy_manager.get_proxy_for_playwright()
                # NEVER use headless mode - it instantly triggers PerimeterX bot detection
                # Only allow headless if explicitly forced via env var (for testing only)
                force_headless = os.getenv('WALMART_FORCE_HEADLESS', 'false').lower() == 'true'
                if force_headless:
                    logger.warning("⚠️  Headless mode enabled - will likely trigger bot detection!")
                self.browser_session = WalmartBrowserSession(headless=force_headless, proxy=proxy)
            except ImportError:
                logger.warning("⚠️  Playwright not available, falling back to requests")
                self.use_browser = False
        
        # Set default headers to match mobile web browser requests
        # Mobile web (mWeb) has less strict bot detection
        self.default_headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.walmart.com/',
            'Origin': 'https://www.walmart.com',
            'x-o-mart': 'B2C',
            'x-o-platform': 'rweb',
            'x-o-bu': 'WALMART-US',
            'x-o-ccm': 'server',
            'x-o-segment': 'oaoh',
            'wm_mp': 'true',
        }
        self.session.headers.update(self.default_headers)
    
    def _establish_session(self):
        """
        Establish a session by visiting the homepage first.
        Uses browser automation if available, otherwise falls back to requests.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Use browser if available
        if self.use_browser and self.browser_session:
            try:
                if self.browser_session.establish_session():
                    # Extract cookies from browser and add to requests session
                    browser_cookies = self.browser_session.get_cookies()
                    for name, value in browser_cookies.items():
                        self.session.cookies.set(name, value, domain='.walmart.com', path='/')
                    self.session_established = True
                    logger.info(f"✅ Browser session established with {len(browser_cookies)} cookies")
                    return True
            except Exception as e:
                logger.warning(f"⚠️  Browser session establishment failed: {e}")
                # Fall back to requests-based session
        
        # Fallback to requests-based session establishment
        try:
            logger.info("Establishing session with Walmart homepage (requests fallback)...")
            homepage_response = self.session.get(
                'https://www.walmart.com/',
                headers={
                    **self.default_headers,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                },
                timeout=30,
                allow_redirects=True
            )
            
            if homepage_response.status_code == 200:
                px_cookies = [name for name in self.session.cookies.keys() if 'px' in name.lower() or '_px' in name.lower()]
                if px_cookies:
                    logger.info(f"✅ Session established with PerimeterX cookies: {', '.join(px_cookies)}")
                self.session_established = True
                return True
            else:
                logger.warning(f"⚠️  Homepage visit returned {homepage_response.status_code}")
                return False
                
        except Exception as e:
            logger.warning(f"⚠️  Failed to establish session: {e}")
            self.session_established = True
            return False
    
    def query(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: Optional[str] = None
    ) -> GraphQLResponse:
        """
        Execute a GraphQL query/mutation.
        
        Args:
            query: The GraphQL query/mutation string
            variables: Optional variables for the query
            operation_name: The name of the GraphQL operation
        
        Returns:
            GraphQLResponse object with data, errors, and success status
        """
        payload = {
            'query': query
        }
        
        if variables:
            payload['variables'] = variables
        
        if operation_name:
            payload['operationName'] = operation_name
        
        try:
            response = self.session.post(
                self.base_url,
                json=payload,
                timeout=10
            )
            
            # Try to get JSON response even on error
            try:
                result = response.json()
            except:
                result = {}
            
            # Check HTTP status
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                if result.get('errors'):
                    error_msg += f": {result['errors']}"
                elif result.get('message'):
                    error_msg += f": {result['message']}"
                # Include response text for debugging
                if response.text:
                    preview = response.text[:200] if len(response.text) > 200 else response.text
                    error_msg += f" | Response preview: {preview}"
                # Log the URL that failed
                error_msg += f" | URL: {self.base_url}"
                return GraphQLResponse(
                    data=None,
                    errors=[{'message': error_msg}],
                    success=False
                )
            
            # Check for GraphQL errors
            if 'errors' in result:
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=result['errors'],
                    success=False
                )
            
            return GraphQLResponse(
                data=result.get('data'),
                errors=None,
                success=True
            )
        
        except requests.exceptions.RequestException as e:
            return GraphQLResponse(
                data=None,
                errors=[{'message': str(e)}],
                success=False
            )
    
    def add_item_to_list_lite(
        self,
        items: List[Dict[str, Any]],
        list_id: str,
        list_name: str = "Test",
        list_type: str = "WL",
        owner_name: str = "",
        show_primary: bool = True,
        max_items_reached: bool = False,
        enable_promotion_messages: bool = False
    ) -> GraphQLResponse:
        """
        Add items to a Walmart shopping list using the addItemToListLite mutation.
        
        Walmart uses a REST-like GraphQL endpoint: /orchestra/home/graphql/{operationName}/{hash}
        The hash is a SHA256 hash of the query string.
        
        Args:
            items: List of item dictionaries with fields:
                - usItemId: Product ID (e.g., "885116895")
                - quantity: Quantity to add (default: 1)
                - itemType: Item type (e.g., "VARIANT", "REGULAR")
                - itemName: Product name
                - itemImage: Product image URL
                - itemPrice: Product price (float)
            list_id: Shopping list ID (UUID)
            list_name: Name of the shopping list
            list_type: Type of list (default: "WL")
            owner_name: Owner name (optional)
            show_primary: Whether to show as primary list
            max_items_reached: Whether max items reached
            enable_promotion_messages: Whether to enable promotion messages
        
        Returns:
            GraphQLResponse with list item IDs in data.addItemToListLite
        """
        # Walmart uses persisted queries with a pre-computed hash
        # This hash is registered with Walmart's GraphQL server
        operation_name = "addItemToListLite"
        query_hash = "9ba1253e682b673b597549601a886e80538592e8035f3e182ddb294b66342da5"
        
        # Build the full URL with operation name and hash
        full_url = f"{self.base_url}/{operation_name}/{query_hash}"
        
        mutation = """
        mutation addItemToListLite($input: AddItemToListLiteInput!) {
            addItemToListLite(input: $input) {
                id
            }
        }
        """
        
        # Walmart's API structure: name, type, etc. are at the same level as input, not inside it
        variables = {
            "input": {
                "items": items,
                "listId": list_id
            },
            "name": list_name,
            "type": list_type,
            "ownerName": owner_name,
            "showPrimary": show_primary,
            "maxItemsReached": max_items_reached,
            "enablePromotionMessages": enable_promotion_messages
        }
        
        # Add operation-specific headers (matching browser request)
        import uuid
        correlation_id = str(uuid.uuid4()).replace('-', '')
        trace_id = str(uuid.uuid4()).replace('-', '')
        
        headers = {
            'x-apollo-operation-name': operation_name,
            'x-o-gql-query': f'mutation {operation_name}',
            'x-o-correlation-id': correlation_id,
            'wm-client-traceid': trace_id,
            'wm_qos.correlation_id': correlation_id,
            'device_profile_ref_id': '8eda8_xs29065883imc6btvagj293wgcesft',
            'baggage': 'trafficType=customer,deviceType=desktop,renderScope=CSR,webRequestSource=Browser',
            'x-enable-server-timing': '1',
            'x-latency-trace': '1',
        }
        
        # For persisted queries, we only send variables (no query string)
        # The query hash in the URL identifies the query
        payload = {
            'variables': variables
        }
        
        # Log for debugging (remove in production)
        import logging
        logging.debug(f"Walmart API Request: {full_url}")
        logging.debug(f"Payload: {payload}")
        
        try:
            response = self.session.post(
                full_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            # Try to get JSON response even on error
            try:
                result = response.json()
            except:
                result = {}
            
            # Check HTTP status
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                if result.get('errors'):
                    error_msg += f": {result['errors']}"
                elif result.get('message'):
                    error_msg += f": {result['message']}"
                # Include response text for debugging
                if response.text:
                    preview = response.text[:200] if len(response.text) > 200 else response.text
                    error_msg += f" | Response preview: {preview}"
                # Log the URL that failed
                error_msg += f" | URL: {full_url}"
                # Check if cookies are present
                cookie_count = len(self.session.cookies)
                error_msg += f" | Cookies in session: {cookie_count}"
                return GraphQLResponse(
                    data=None,
                    errors=[{'message': error_msg}],
                    success=False
                )
            
            # Check for GraphQL errors
            if 'errors' in result:
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=result['errors'],
                    success=False
                )
            
            return GraphQLResponse(
                data=result.get('data'),
                errors=None,
                success=True
            )
        
        except requests.exceptions.RequestException as e:
            return GraphQLResponse(
                data=None,
                errors=[{'message': str(e)}],
                success=False
            )
    
    def search(
        self,
        query: str = "",
        stores: Optional[str] = None,
        sort: str = "best_match",
        page: int = 1,
        page_size: int = 40,
        category_id: Optional[str] = None,
        prg: str = "mWeb"
    ) -> GraphQLResponse:
        """
        Search for products using Walmart's GraphQL search API.
        
        Walmart uses persisted queries with GET requests. The URL structure is:
        /orchestra/snb/graphql/Search/{hash}/search?variables={json}
        
        Args:
            query: Search text (empty string for category browsing)
            stores: Store ID as string (optional, single store)
            sort: Sort order ('best_match', 'price_low', 'price_high')
            page: Page number (1-based)
            page_size: Number of items per page
            category_id: Optional category ID to filter by (format: "976759_976794_7433209")
            prg: Program type (default: "mWeb" for mobile, more reliable)
        
        Returns:
            GraphQLResponse with search results
        """
        # Walmart uses persisted queries - the hash is fixed for the Search operation
        # Hash: 5442018b81bb7e67e6c258f3be07d18ae4cabed7bdc1c48b17042fff641e2d9b
        search_url = "https://www.walmart.com/orchestra/snb/graphql/Search/5442018b81bb7e67e6c258f3be07d18ae4cabed7bdc1c48b17042fff641e2d9b/search"
        
        # Build simplified variables object - only essential fields to reduce payload size
        # Based on testing, Walmart API accepts minimal structure
        cat_id_str = category_id if category_id else ""
        
        # Core search parameters
        variables = {
            "query": query,
            "page": page,
            "prg": prg,
            "ps": page_size,
            "limit": page_size,
            "sort": sort,
            "cat_id": cat_id_str,
            "searchArgs": {
                "query": query,
                "cat_id": cat_id_str,
                "prg": prg,
                "facet": ""
            },
            "searchParams": {
                "query": query,
                "page": page,
                "prg": prg,
                "ps": page_size,
                "limit": page_size,
                "sort": sort,
                "cat_id": cat_id_str,
                "searchArgs": {
                    "query": query,
                    "cat_id": cat_id_str,
                    "prg": prg,
                    "facet": ""
                }
            },
            "tenant": "WM_GLASS",
            "version": "v1",
            "pageType": "SearchPage"
        }
        
        # Ensure session is established before making API calls
        if not self.session_established:
            self._establish_session()
        
        # Add operation-specific headers
        import uuid
        import logging
        logger = logging.getLogger(__name__)
        
        correlation_id = str(uuid.uuid4()).replace('-', '')
        trace_id = str(uuid.uuid4()).replace('-', '')
        
        # Generate realistic page context
        render_view_id = str(uuid.uuid4())
        isomorphic_session_id = 'Px5spPiig6saL8yz49I2Q'  # Can be static for session
        
        # Simplified headers for mobile web
        headers = {
            'x-apollo-operation-name': 'Search',
            'x-o-gql-query': 'query Search',
            'x-o-correlation-id': correlation_id,
            'Referer': 'https://www.walmart.com/search?q=' + (query if query else ''),
        }
        
        # Merge with default headers
        request_headers = {**self.default_headers, **headers}
        
        # Encode variables as URL-encoded JSON
        import urllib.parse
        variables_json = json.dumps(variables, separators=(',', ':'))
        variables_encoded = urllib.parse.quote(variables_json, safe='')
        
        # Build full URL with variables as query parameter
        full_url = f"{search_url}?variables={variables_encoded}"
        
        try:
            # Strategy: Use GraphQL API for data (fast and reliable)
            # But sync cookies from browser session regularly to maintain PerimeterX trust
            # Browser session visits category pages periodically (no PerimeterX blocks)
            # This gives us best of both worlds: speed + PerimeterX avoidance
            
            # Use Playwright's browser request context if available (CRITICAL for PerimeterX evasion)
            # This makes requests through the browser's network stack - same TLS fingerprint, headers, cookies
            response = None
            
            if self.use_browser and self.browser_session and self.browser_session.session_established:
                logger.info(f"Making GraphQL API request via browser context for page {page}...")
                try:
                    browser_context = self.browser_session.context
                    if browser_context:
                        # Make request through browser context - uses browser's network stack
                        browser_response = browser_context.request.get(
                            full_url,
                            headers=request_headers,
                            timeout=30000
                        )
                        
                        # Convert Playwright response to requests-like object
                        status_code = browser_response.status
                        response_text = browser_response.text()
                        
                        logger.debug(f"Browser context response: {status_code}")
                        
                        # Create mock response object compatible with requests.Response
                        class BrowserResponse:
                            def __init__(self, status_code, text, url, headers_dict):
                                self.status_code = status_code
                                self._text = text  # Store text as attribute
                                self.url = url
                                self.headers = headers_dict
                                self.reason = "OK" if status_code == 200 else "Error"
                            
                            def text(self):
                                """Return response text (not a property to match requests interface)"""
                                return self._text
                            
                            def json(self):
                                return json.loads(self._text)
                        
                        response = BrowserResponse(
                            status_code=status_code,
                            text=response_text,
                            url=full_url,
                            headers_dict=dict(browser_response.headers)
                        )
                        
                        if status_code == 200:
                            logger.debug("✅ Browser context request successful")
                        elif status_code in [412, 403]:
                            logger.warning(f"⚠️  PerimeterX block via browser context (HTTP {status_code})")
                        else:
                            logger.debug(f"Browser context returned status {status_code}")
                            
                except Exception as e:
                    logger.warning(f"Browser context request failed: {e}, falling back to requests...")
                    response = None
            
            # Fallback: Use requests session
            if response is None:
                # Sync cookies from browser
                if self.use_browser and self.browser_session and self.browser_session.session_established:
                    browser_cookies = self.browser_session.get_cookies()
                    cookie_count = len(browser_cookies) if browser_cookies else 0
                    for name, value in browser_cookies.items():
                        self.session.cookies.set(name, value, domain='.walmart.com', path='/')
                    logger.debug(f"Synced {cookie_count} cookies for fallback request")
                
                # Get proxy if available
                proxies = None
                if self.proxy_manager:
                    proxy_dict = self.proxy_manager.get_proxy_for_requests(category=category_id)
                    if proxy_dict:
                        proxies = proxy_dict
                        self.current_proxy = proxy_dict
                        logger.debug(f"Using proxy: {proxy_dict.get('http', 'unknown')}")
                
                logger.info(f"Making GraphQL API request via requests session for page {page}...")
                response = self.session.get(
                    full_url,
                    proxies=proxies,
                    headers=request_headers,
                    timeout=30,
                    allow_redirects=True
                )
                logger.debug(f"Requests session response: {response.status_code}")
                
                # Check for PerimeterX bot detection (multiple indicators)
                is_blocked = (
                    response.status_code == 412 or  # PerimeterX block
                    response.status_code == 403 or  # Common block status
                    '/blocked' in response.url or
                    'blocked' in response.url.lower() or
                    (response.text and ('perimeterx' in response.text.lower() or 'px-captcha' in response.text.lower()))
                )
                
                if is_blocked:
                    logger.warning(f"⚠️  PerimeterX bot detection triggered (HTTP {response.status_code})")
                    # If we have browser session, try to re-establish it
                    if self.use_browser and self.browser_session:
                        logger.info("Attempting to re-establish browser session...")
                        if self.browser_session.establish_session(warm_up=True):
                            # Extract fresh cookies
                            browser_cookies = self.browser_session.get_cookies()
                            for name, value in browser_cookies.items():
                                self.session.cookies.set(name, value, domain='.walmart.com', path='/')
                            logger.info("Session re-established, retrying request...")
                            # Retry the request with fresh cookies
                            response = self.session.get(
                                full_url,
                                proxies=proxies,
                                headers=request_headers,
                                timeout=30,
                                allow_redirects=True
                            )
                            # Check again
                            is_blocked = (
                                response.status_code == 412 or
                                response.status_code == 403 or
                                '/blocked' in response.url or
                                (response.text and 'perimeterx' in response.text.lower())
                            )
                    
                    if is_blocked:
                        # Try proxy rotation if available
                        if self.proxy_manager and proxies:
                            self.proxy_manager.mark_failure(proxies)
                            proxies = self.proxy_manager.get_proxy_for_requests(category=category_id)
                            if proxies:
                                logger.info("Retrying with different proxy...")
                                response = self.session.get(
                                    full_url,
                                    proxies=proxies,
                                    headers=request_headers,
                                    timeout=30,
                                    allow_redirects=True
                                )
                                # Final check
                                if response.status_code in [412, 403] or '/blocked' in response.url:
                                    return GraphQLResponse(
                                        data=None,
                                        errors=[{'message': 'PerimeterX bot detection - all mitigation attempts failed'}],
                                        success=False
                                    )
                        else:
                            return GraphQLResponse(
                                data=None,
                                errors=[{'message': 'PerimeterX bot detection triggered - browser session and proxy unavailable'}],
                                success=False
                            )
                
                # Mark proxy as successful
                if self.proxy_manager and proxies:
                    self.proxy_manager.mark_success(proxies)
            
            # Ensure we have a valid response
            if response is None:
                return GraphQLResponse(
                    data=None,
                    errors=[{'message': 'Request failed - no response received'}],
                    success=False
                )
            
            # Try to get JSON response
            try:
                result = response.json()
            except:
                result = {}
            
            # Check HTTP status
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                if result.get('errors'):
                    error_msg += f": {result['errors']}"
                elif result.get('message'):
                    error_msg += f": {result['message']}"
                if hasattr(response, 'text') and response.text:
                    preview = response.text[:200] if len(response.text) > 200 else response.text
                    error_msg += f" | Response preview: {preview}"
                error_msg += f" | URL: {search_url}"
                
                # Check if this might be a PerimeterX block
                if hasattr(response, 'text') and response.text and 'perimeterx' in response.text.lower():
                    error_msg += " | Possible PerimeterX bot detection"
                
                return GraphQLResponse(
                    data=None,
                    errors=[{'message': error_msg}],
                    success=False
                )
            
            # Validate response structure
            if not isinstance(result, dict):
                return GraphQLResponse(
                    data=None,
                    errors=[{'message': f"Invalid response format: expected dict, got {type(result)}"}],
                    success=False
                )
            
            # Check for GraphQL errors
            if 'errors' in result:
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=result['errors'],
                    success=False
                )
            
            # Validate data structure
            data = result.get('data')
            if data and not isinstance(data, dict):
                return GraphQLResponse(
                    data=None,
                    errors=[{'message': f"Invalid data format: expected dict, got {type(data)}"}],
                    success=False
                )
            
            return GraphQLResponse(
                data=data,
                errors=None,
                success=True
            )
                    
        except Exception as e:
            # Mark proxy as failed
            if self.proxy_manager and 'proxies' in locals() and proxies:
                self.proxy_manager.mark_failure(proxies)
            logger.error(f"GraphQL request failed with exception: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return GraphQLResponse(
                data=None,
                errors=[{'message': f"Request failed: {str(e)}"}],
                success=False
            )

