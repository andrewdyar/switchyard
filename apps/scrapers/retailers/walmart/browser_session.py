"""
Walmart Browser Session Manager using Playwright

Handles PerimeterX bot detection by using real browser navigation
and extracting data from the page's embedded __NEXT_DATA__ JSON.
"""

import json
import time
import random
import logging
from typing import Dict, Optional, List, Any
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeout

try:
    from playwright_stealth.stealth import Stealth
    HAS_STEALTH = True
    stealth_obj = Stealth()
except ImportError:
    HAS_STEALTH = False
    stealth_obj = None

logger = logging.getLogger(__name__)

# Realistic viewport sizes (common desktop resolutions)
VIEWPORT_OPTIONS = [
    {'width': 1920, 'height': 1080},
    {'width': 1366, 'height': 768},
    {'width': 1536, 'height': 864},
    {'width': 1440, 'height': 900},
    {'width': 1280, 'height': 720},
    {'width': 1600, 'height': 900},
]

# Realistic user agents (Chrome on various OS)
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]


class WalmartBrowserSession:
    """
    Manages browser sessions for Walmart using Playwright.
    Extracts product data from the __NEXT_DATA__ script tag embedded in pages.
    """
    
    def __init__(self, headless: bool = True, proxy: Optional[Dict[str, str]] = None):
        """
        Initialize the browser session manager.
        
        Args:
            headless: Run browser in headless mode (default: True)
            proxy: Optional proxy dict with 'server', 'username', 'password' keys
        """
        self.headless = headless
        self.proxy = proxy
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.cookies: Dict[str, str] = {}
        self.session_established = False
    
    def start(self):
        """Start the browser and create a context."""
        if self.browser is not None:
            return
            
        logger.info("Starting Playwright browser...")
        self.playwright = sync_playwright().start()
        
        # Launch with comprehensive stealth settings to avoid PerimeterX detection
        # Critical: Do NOT disable automation features that PerimeterX checks for
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--no-sandbox',  # Required for some environments but may help avoid detection
        ]
        
        # In non-headless mode, we need a visible window for PerimeterX
        if not self.headless:
            launch_args.extend([
                '--window-size=1920,1080',
                '--start-maximized',
            ])
        
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=launch_args
        )
        
        # Randomize fingerprint for each browser instance
        viewport = random.choice(VIEWPORT_OPTIONS)
        user_agent = random.choice(USER_AGENTS)
        
        # Prepare context options with proxy if provided
        context_options = {
            'viewport': viewport,
            'user_agent': user_agent,
            'locale': 'en-US',
            'timezone_id': random.choice(['America/Chicago', 'America/New_York', 'America/Los_Angeles', 'America/Denver']),
            # Additional fingerprinting evasion
            'color_scheme': 'light',
            'reduced_motion': 'no-preference',
            'forced_colors': 'none',
        }
        
        # Add proxy if provided
        if self.proxy:
            context_options['proxy'] = self.proxy
            logger.info(f"Using proxy: {self.proxy.get('server', 'unknown')}")
        
        # Create context with realistic settings for PerimeterX avoidance
        # Additional context options for better fingerprinting
        context_options.update({
            # Extra HTTP headers that real browsers send
            'extra_http_headers': {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            },
            # Ignore HTTPS errors (some proxies may cause this)
            'ignore_https_errors': False,
            # Java enabled (real browsers have this)
            'java_script_enabled': True,
            # Storage state for cookies
            'storage_state': None,
        })
        
        # Create context with realistic settings
        self.context = self.browser.new_context(**context_options)
        
        # Comprehensive stealth scripts for PerimeterX evasion
        # Critical: PerimeterX checks many browser properties
        self.context.add_init_script("""
            // CRITICAL: Remove webdriver property (most important for bot detection)
            Object.defineProperty(navigator, 'webdriver', { 
                get: () => undefined,
                configurable: true,
                enumerable: false
            });
            
            // Remove automation indicators
            delete navigator.__proto__.webdriver;
            delete window.navigator.webdriver;
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
            
            // Override permissions API (PerimeterX checks this)
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery(parameters);
            };
            
            // Realistic plugins array (must match Chrome)
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const plugins = [];
                    plugins.push({
                        0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
                        description: "Portable Document Format",
                        filename: "internal-pdf-viewer",
                        length: 1,
                        name: "Chrome PDF Plugin"
                    });
                    plugins.push({
                        0: {type: "application/pdf", suffixes: "pdf", description: ""},
                        description: "",
                        filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                        length: 1,
                        name: "Chrome PDF Viewer"
                    });
                    plugins.push({
                        0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
                        1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
                        description: "",
                        filename: "internal-nacl-plugin",
                        length: 2,
                        name: "Native Client"
                    });
                    return plugins;
                },
                configurable: true
            });
            
            // Realistic languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
                configurable: true
            });
            
            // Override chrome runtime (must be present for Chrome)
            window.chrome = {
                runtime: {},
                loadTimes: function() {
                    return {
                        commitLoadTime: Date.now() - 1000,
                        connectionInfo: 'h2',
                        finishDocumentLoadTime: Date.now() - 500,
                        finishLoadTime: Date.now() - 100,
                        firstPaintAfterLoadTime: 0,
                        firstPaintTime: Date.now() - 800,
                        navigationType: 'Other',
                        npnNegotiatedProtocol: 'h2',
                        requestTime: Date.now() / 1000 - 2,
                        startLoadTime: Date.now() / 1000 - 2,
                        wasAlternateProtocolAvailable: false,
                        wasFetchedViaSpdy: true,
                        wasNpnNegotiated: true
                    };
                },
                csi: function() {
                    return {
                        startE: Date.now(),
                        onloadT: Date.now(),
                        pageT: Date.now() - performance.timing.navigationStart,
                        tran: 15
                    };
                },
                app: {
                    isInstalled: false,
                    InstallState: {
                        DISABLED: "disabled",
                        INSTALLED: "installed",
                        NOT_INSTALLED: "not_installed"
                    },
                    RunningState: {
                        CANNOT_RUN: "cannot_run",
                        READY_TO_RUN: "ready_to_run",
                        RUNNING: "running"
                    }
                }
            };
            
            // Fix permissions descriptor
            const originalDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'permissions');
            if (originalDescriptor) {
                Object.defineProperty(navigator, 'permissions', {
                    get: () => ({
                        query: originalQuery
                    })
                });
            }
            
            // Canvas fingerprinting protection (must be subtle)
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                if (type === 'image/png' || !type) {
                    const context = this.getContext('2d');
                    if (context) {
                        const imageData = context.getImageData(0, 0, this.width, this.height);
                        // Add minimal noise (too much is detectable)
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            if (Math.random() < 0.0001) {
                                imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + (Math.random() < 0.5 ? 1 : -1)));
                            }
                        }
                        context.putImageData(imageData, 0, 0);
                    }
                }
                return originalToDataURL.apply(this, arguments);
            };
            
            // WebGL fingerprinting protection (must return realistic values)
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                // Return common Chrome/Chromium values
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                if (parameter === 7936) { // VENDOR
                    return 'Intel Inc.';
                }
                if (parameter === 7937) { // RENDERER
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter.apply(this, arguments);
            };
            
            // Fix hardware properties (must be realistic)
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
                configurable: true
            });
            
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
                configurable: true
            });
            
            // Platform must match User-Agent
            Object.defineProperty(navigator, 'platform', {
                get: () => {
                    const ua = navigator.userAgent;
                    if (ua.includes('Mac OS X')) return 'MacIntel';
                    if (ua.includes('Windows')) return 'Win32';
                    if (ua.includes('Linux')) return 'Linux x86_64';
                    return 'MacIntel';
                },
                configurable: true
            });
            
            // Override notification permission
            Object.defineProperty(Notification, 'permission', {
                get: () => 'default',
                configurable: true
            });
            
            // Hide automation indicators
            Object.defineProperty(window, 'navigator', {
                get: () => ({
                    ...navigator,
                    webdriver: undefined
                })
            });
            
            // Override getBattery if present (PerimeterX may check this)
            if (navigator.getBattery) {
                const originalGetBattery = navigator.getBattery;
                navigator.getBattery = function() {
                    return Promise.resolve({
                        charging: true,
                        chargingTime: 0,
                        dischargingTime: Infinity,
                        level: 1.0,
                        onchargingchange: null,
                        onchargingtimechange: null,
                        ondischargingtimechange: null,
                        onlevelchange: null
                    });
                };
            }
            
            // Prevent detection of automation tools
            const originalHasOwnProperty = Object.prototype.hasOwnProperty;
            Object.prototype.hasOwnProperty = function(prop) {
                if (prop === 'webdriver') {
                    return false;
                }
                return originalHasOwnProperty.call(this, prop);
            };
        """)
        
        self.page = self.context.new_page()
        
        # Apply playwright-stealth IMMEDIATELY after page creation
        # This is CRITICAL - must be done before any navigation or PerimeterX will detect
        if HAS_STEALTH and stealth_obj:
            try:
                # Apply stealth using apply_stealth_sync - patches all automation indicators
                stealth_obj.apply_stealth_sync(self.page)
                logger.info("✅ playwright-stealth applied successfully with all patches")
            except Exception as e:
                logger.error(f"❌ CRITICAL: Failed to apply playwright-stealth: {e}")
                logger.error("PerimeterX detection is LIKELY - fix playwright-stealth installation")
                import traceback
                logger.debug(traceback.format_exc())
        else:
            logger.error("❌ CRITICAL: playwright-stealth not available!")
            logger.error("Install with: pip install playwright-stealth")
            logger.error("PerimeterX WILL detect automation without this package")
        
        # Additional stealth: ensure no automation indicators leak through
        # This is a backup in case playwright-stealth misses something
        
        logger.info("✅ Browser started")
    
    def stop(self):
        """Stop the browser."""
        if self.browser:
            self.browser.close()
            self.browser = None
        if self.playwright:
            self.playwright.stop()
            self.playwright = None
        logger.info("Browser stopped")
    
    def establish_session(self, warm_up: bool = True) -> bool:
        """
        Visit homepage to establish session cookies with human-like behavior.
        Critical for PerimeterX avoidance - must appear human.
        
        Args:
            warm_up: If True, perform additional human-like actions to build trust score
        """
        if not self.browser or not self.page:
            self.start()
        
        try:
            logger.info("Establishing session with Walmart (PerimeterX-aware)...")
            
            # Human-like delay before first visit (appears more natural)
            time.sleep(random.uniform(1.5, 3.0))
            
            # Visit homepage with realistic navigation pattern
            # CRITICAL: PerimeterX checks navigation patterns, so we need to be realistic
            # Use 'domcontentloaded' first, then wait for network idle
            self.page.goto('https://www.walmart.com/', wait_until='domcontentloaded', timeout=60000)
            
            # CRITICAL: Wait for page to fully initialize before PerimeterX runs checks
            # Real browsers take time to fully load, so we must mimic this
            time.sleep(random.uniform(1.5, 2.5))
            
            # Wait for all network activity to complete (PerimeterX scripts load asynchronously)
            # This is important because PerimeterX checks if scripts loaded properly
            try:
                self.page.wait_for_load_state('networkidle', timeout=45000)
            except Exception as e:
                logger.debug(f"Network idle wait timed out or failed: {e}")
                # Continue anyway, but wait a bit more
                time.sleep(random.uniform(1.0, 2.0))
            
            # CRITICAL: Extra wait for PerimeterX challenge processing AND page data to load
            # Search pages need time for React to hydrate and populate __NEXT_DATA__
            wait_time = random.uniform(4.0, 6.0)
            logger.debug(f"Waiting {wait_time:.1f}s for page data to load...")
            time.sleep(wait_time)
            
            # Additional check: wait for product elements to appear (indicates page is ready)
            try:
                self.page.wait_for_selector('[data-item-id]', timeout=10000)
                logger.debug("Product elements detected, page is ready")
            except:
                logger.debug("No product elements found yet, but continuing...")
            
            # Check for PerimeterX challenge page (only check for actual challenge/block, not just presence of px scripts)
            page_content = self.page.content()
            # Only flag as challenge if we see actual challenge/block indicators, not just perimeterx scripts
            # PerimeterX scripts are always present, but challenges are different
            has_challenge = any([
                'px-block' in page_content.lower(),
                'px-captcha' in page_content.lower() and ('challenge' in page_content.lower() or 'verify' in page_content.lower()),
                '/blocked' in self.page.url.lower(),
                'blocked by perimeterx' in page_content.lower(),
            ])
            
            if has_challenge:
                logger.warning("PerimeterX challenge/block detected, waiting for completion...")
                # Wait for challenge to complete (up to 30 seconds)
                for _ in range(30):
                    time.sleep(1)
                    current_content = self.page.content()
                    current_url = self.page.url.lower()
                    still_blocked = any([
                        'px-block' in current_content.lower(),
                        '/blocked' in current_url,
                        'blocked by perimeterx' in current_content.lower(),
                    ])
                    if not still_blocked:
                        logger.info("✅ PerimeterX challenge completed")
                        break
                else:
                    logger.error("❌ Still blocked by PerimeterX after extended wait")
            else:
                # PerimeterX scripts present but no challenge - this is normal and good
                logger.debug("PerimeterX scripts detected (normal - no challenge triggered)")
            
            # Human-like behavior: scroll and interact (builds trust score)
            if warm_up:
                # Random scroll pattern (human behavior)
                scroll_amount = random.randint(300, 900)
                self.page.evaluate(f"window.scrollTo({{top: {scroll_amount}, behavior: 'smooth'}})")
                time.sleep(random.uniform(1.0, 2.0))
                
                # Scroll back up a bit (humans often do this)
                self.page.evaluate(f"window.scrollTo({{top: {scroll_amount // 2}, behavior: 'smooth'}})")
                time.sleep(random.uniform(0.5, 1.2))
                
                # Scroll to top
                self.page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
                time.sleep(random.uniform(0.8, 1.5))
            
            # Check for block
            if '/blocked' in self.page.url or 'blocked' in self.page.url.lower():
                logger.warning("⚠️  Hit PerimeterX block page, waiting longer...")
                time.sleep(random.uniform(10, 15))
                self.page.reload(wait_until='networkidle', timeout=30000)
                time.sleep(random.uniform(3, 5))
                # Check again
                if '/blocked' in self.page.url or 'blocked' in self.page.url.lower():
                    logger.error("❌ Still blocked after extended wait - PerimeterX detection triggered")
                    return False
            
            self.session_established = True
            self.cookies = {c['name']: c['value'] for c in self.context.cookies()}
            px_cookies = [name for name in self.cookies.keys() if 'px' in name.lower() or '_px' in name.lower()]
            
            # Check for actual PerimeterX tracking cookies (they may have different names)
            # Common PerimeterX cookie patterns
            tracking_cookies = [name for name in self.cookies.keys() 
                              if any(pattern in name.lower() for pattern in ['px', '_px', 'pxvid', 'pxsid', 'pxcts'])]
            
            if px_cookies or tracking_cookies:
                all_px = len(set(px_cookies + tracking_cookies))
                logger.info(f"✅ Session established with {len(self.cookies)} cookies ({all_px} PerimeterX-related cookies)")
            else:
                # PerimeterX cookies might not be set immediately, check page to see if we're actually blocked
                page_url_lower = self.page.url.lower()
                if '/blocked' in page_url_lower or 'challenge' in page_url_lower:
                    logger.warning("⚠️  No PerimeterX cookies and page appears blocked")
                else:
                    logger.info(f"✅ Session established with {len(self.cookies)} cookies (page loaded successfully)")
            return True
        except Exception as e:
            logger.error(f"❌ Session establishment failed: {e}")
            return False
    
    def visit_homepage(self) -> bool:
        """
        Visit homepage occasionally to appear more human-like.
        This helps maintain trust score by showing non-target page visits.
        """
        if not self.page:
            return False
        
        try:
            logger.debug("Visiting homepage for trust score maintenance...")
            time.sleep(random.uniform(0.5, 1.5))
            self.page.goto('https://www.walmart.com/', wait_until='domcontentloaded', timeout=30000)
            time.sleep(random.uniform(1.0, 2.0))
            
            # Quick scroll
            self.page.evaluate("window.scrollTo(0, Math.random() * 300)")
            time.sleep(random.uniform(0.3, 0.7))
            self.page.evaluate("window.scrollTo(0, 0)")
            
            return True
        except Exception as e:
            logger.warning(f"Homepage visit failed: {e}")
            return False
    
    def get_cookies(self) -> Dict[str, str]:
        """Get current cookies."""
        if self.context:
            self.cookies = {c['name']: c['value'] for c in self.context.cookies()}
        return self.cookies.copy()
    
    def search_products(self, query: str = "", category_id: Optional[str] = None, page: int = 1) -> Optional[Dict[str, Any]]:
        """
        Search for products by navigating to category pages and extracting __NEXT_DATA__.
        Uses human-like navigation to category pages (e.g., /cp/food/976759) instead of direct API calls.
        
        Args:
            query: Search query
            category_id: Category ID (can be full path like "976759_976793_9756351" or base like "976759")
            page: Page number
            
        Returns:
            Search results data or None
        """
        if not self.page:
            self.start()
            self.establish_session()
        
        # Build URL - Use category pages to avoid PerimeterX blocks
        # Category pages don't trigger PerimeterX like search pages do
        if query:
            # For search queries, use search page
            url = f"https://www.walmart.com/search?q={query}&page={page}"
        elif category_id:
            # Use category page format - these don't trigger PerimeterX blocks
            # Extract base category ID from full path (e.g., "976759_976793_9756351" -> "976759")
            # But we can also try using the full path in the URL format
            # Walmart category pages use format: /cp/{slug}/{id}
            # For now, use the first part of the category ID as the base
            base_cat_id = category_id.split('_')[0] if '_' in category_id else category_id
            # Try the full category path first - it might work
            url = f"https://www.walmart.com/cp/food/{base_cat_id}"
            if page > 1:
                # For subsequent pages, we might need to use search
                url = f"https://www.walmart.com/search?cat_id={category_id}&page={page}"
            logger.debug(f"Navigating to category page: {url}")
        else:
            logger.warning("No query or category_id provided")
            return None
        
        try:
            logger.info(f"Navigating to: {url}")
            
            # Human-like behavior: random delay before navigation
            delay = random.uniform(1.0, 3.0)
            time.sleep(delay)
            
            self.page.goto(url, wait_until='domcontentloaded', timeout=45000)
            
            # Wait for page to settle
            time.sleep(random.uniform(2.0, 4.0))
            
            # Human-like scrolling behavior is critical for PerimeterX avoidance
            # Keep realistic scrolling patterns even if it's slower
            scroll_steps = random.randint(2, 4)
            for i in range(scroll_steps):
                scroll_pos = random.randint(100, 600) * (i + 1)
                self.page.evaluate(f"window.scrollTo(0, {scroll_pos})")
                # Use realistic delays - PerimeterX monitors timing
                time.sleep(random.uniform(0.5, 1.2))
            
            # Scroll back up gradually (human behavior)
            for i in range(scroll_steps - 1, -1, -1):
                scroll_pos = random.randint(100, 600) * (i + 1)
                self.page.evaluate(f"window.scrollTo(0, {scroll_pos})")
                time.sleep(random.uniform(0.3, 0.8))
            
            # Final wait for content to fully load
            time.sleep(random.uniform(1.0, 2.0))
            
            # Check for PerimeterX block page (only actual blocks, not just presence of scripts)
            page_content = self.page.content()
            page_url_lower = self.page.url.lower()
            # Only flag as blocked if we see actual block indicators
            is_blocked = any([
                '/blocked' in page_url_lower,
                'blocked-by' in page_url_lower,
                'px-block' in page_content.lower() and ('blocked' in page_content.lower() or 'challenge' in page_content.lower()),
                'px-captcha' in page_content.lower() and ('challenge' in page_content.lower() or 'verify' in page_content.lower()),
            ])
            
            # Note: 'perimeterx' in content is normal - scripts are always present
            
            if is_blocked:
                logger.warning("⚠️  PerimeterX block detected during navigation")
                # Try waiting for challenge to complete
                logger.info("Waiting for PerimeterX challenge to complete...")
                time.sleep(random.uniform(5, 10))
                
                # Reload and check again
                self.page.reload(wait_until='networkidle', timeout=30000)
                time.sleep(random.uniform(2, 4))
                
                page_content = self.page.content()
                is_still_blocked = (
                    '/blocked' in self.page.url or
                    'perimeterx' in page_content.lower()
                )
                
                if is_still_blocked:
                    logger.error("❌ Still blocked by PerimeterX after wait")
                    return None
                else:
                    logger.info("✅ PerimeterX challenge completed")
            
            # Extract __NEXT_DATA__
            try:
                next_data = self.page.evaluate("""
                    () => {
                        const script = document.getElementById('__NEXT_DATA__');
                        if (script) {
                            return JSON.parse(script.textContent);
                        }
                        return null;
                    }
                """)
                
                if next_data:
                    logger.info("✅ Extracted __NEXT_DATA__")
                    
                    # Try multiple paths for category page data
                    props = next_data.get('props', {})
                    page_props = props.get('pageProps', {}) if isinstance(props, dict) else {}
                    
                    # Path 1: Search result data (from search pages) - most common
                    # Check both in pageProps and directly in props (different page structures)
                    initial_data = page_props.get('initialData') or props.get('initialData', {})
                    if initial_data:
                        search_result = initial_data.get('searchResult', {})
                        if search_result and search_result.get('itemStacks'):
                            logger.info(f"✅ Found {len(search_result.get('itemStacks', []))} item stacks via initialData.searchResult")
                            return {'data': {'search': {'searchResult': search_result}}}
                        elif search_result:
                            logger.debug(f"Found searchResult but no itemStacks yet (may still be loading)")
                    
                    # Path 2: Direct search in pageProps
                    if 'search' in page_props:
                        search_data = page_props['search']
                        if isinstance(search_data, dict) and 'searchResult' in search_data:
                            logger.debug("Found search results via pageProps.search")
                            return {'data': {'search': search_data}}
                    
                    # Path 3: Category page data (from /cp/food/{id} pages)
                    category_data = page_props.get('categoryData', {})
                    if category_data:
                        # Category pages may have search results embedded
                        if 'searchResult' in category_data:
                            logger.debug("Found search results via categoryData.searchResult")
                            return {'data': {'search': {'searchResult': category_data['searchResult']}}}
                        
                        # Or products directly
                        products = category_data.get('products', [])
                        if products and len(products) > 0:
                            logger.debug(f"Found {len(products)} products via categoryData.products")
                            # Convert to search result format
                            return {
                                'data': {
                                    'search': {
                                        'searchResult': {
                                            'itemStacks': [{
                                                'itemsV2': products,
                                                'meta': {
                                                    'totalItemCount': len(products)
                                                }
                                            }]
                                        }
                                    }
                                }
                            }
                    
                    # Path 4: Check in buildId or query params
                    query = page_props.get('query', {})
                    if query and isinstance(query, dict):
                        initial_data = query.get('initialData', {})
                        if initial_data:
                            search_result = initial_data.get('searchResult', {})
                            if search_result:
                                logger.debug("Found search results via query.initialData")
                                return {'data': {'search': {'searchResult': search_result}}}
                    
                    # Path 5: Check root level data
                    if 'data' in next_data and isinstance(next_data['data'], dict):
                        if 'search' in next_data['data']:
                            logger.debug("Found search results at root data level")
                            return {'data': next_data['data']}
                    
                    # Path 6: Try to find itemStacks anywhere in the structure
                    def find_item_stacks(obj, path=""):
                        """Recursively search for itemStacks in the data structure"""
                        if isinstance(obj, dict):
                            # Check if this dict has itemStacks
                            if 'itemStacks' in obj and isinstance(obj['itemStacks'], list) and len(obj['itemStacks']) > 0:
                                return obj
                            # Check if this is a searchResult
                            if 'searchResult' in obj and isinstance(obj['searchResult'], dict):
                                if 'itemStacks' in obj['searchResult']:
                                    return {'searchResult': obj['searchResult']}
                            # Recurse into nested objects
                            for key, value in obj.items():
                                result = find_item_stacks(value, f"{path}.{key}")
                                if result:
                                    return result
                        elif isinstance(obj, list):
                            for i, item in enumerate(obj):
                                result = find_item_stacks(item, f"{path}[{i}]")
                                if result:
                                    return result
                        return None
                    
                    found_data = find_item_stacks(next_data)
                    if found_data:
                        logger.debug(f"Found search results via recursive search")
                        # Normalize to expected format
                        if 'searchResult' in found_data:
                            return {'data': {'search': found_data}}
                        elif 'itemStacks' in found_data:
                            return {'data': {'search': {'searchResult': found_data}}}
                    
                    # If we get here, log what we found for debugging
                    logger.warning("Found __NEXT_DATA__ but couldn't extract search results from expected paths")
                    logger.debug(f"Available top-level keys: {list(next_data.keys()) if isinstance(next_data, dict) else 'not a dict'}")
                    if isinstance(props, dict):
                        logger.debug(f"Available pageProps keys: {list(page_props.keys())[:20]}")
                    
                    # Last resort: return the full structure and let the GraphQL client handle it
                    # It might have data we can extract
                    return_data = page_props if page_props else props
                    # Check if initialData is in the return_data directly
                    if isinstance(return_data, dict) and 'initialData' in return_data:
                        logger.debug("initialData found in return_data, returning it for further processing")
                        return {'data': {'initialData': return_data['initialData']}}
                    return {'data': return_data}
                    
            except Exception as e:
                logger.warning(f"Failed to extract __NEXT_DATA__: {e}")
            
            # Fallback: try to extract product data from page
            try:
                products = self.page.evaluate("""
                    () => {
                        const items = [];
                        document.querySelectorAll('[data-item-id]').forEach(el => {
                            const id = el.getAttribute('data-item-id');
                            const nameEl = el.querySelector('[data-automation-id="product-title"]');
                            const priceEl = el.querySelector('[data-automation-id="product-price"]');
                            if (id) {
                                items.push({
                                    usItemId: id,
                                    name: nameEl ? nameEl.textContent : '',
                                    price: priceEl ? priceEl.textContent : ''
                                });
                            }
                        });
                        return items;
                    }
                """)
                
                if products and len(products) > 0:
                    logger.info(f"✅ Extracted {len(products)} products from DOM")
                    return {'data': {'search': {'itemStacks': [{'items': products}]}}}
                    
            except Exception as e:
                logger.warning(f"Failed to extract from DOM: {e}")
            
            return None
            
        except PlaywrightTimeout:
            logger.warning("Navigation timed out")
            return None
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            return None
    
    def __enter__(self):
        self.start()
        return self
    
    def __exit__(self, *args):
        self.stop()
