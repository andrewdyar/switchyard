# Costco Token Auto-Update Bookmarklet

This bookmarklet automatically extracts your Costco JWT token from the browser and updates it in Redis.

## Setup

1. **Create the Bookmarklet:**
   - Copy the JavaScript code below
   - Create a new bookmark in your browser
   - Name it "Update Costco Token"
   - Set the URL to the JavaScript code (starting with `javascript:`)

2. **Update the API URL:**
   - Replace `YOUR_VERCEL_URL` in the code with your actual Vercel deployment URL
   - Example: `https://goods-sku-testing.vercel.app`

## Bookmarklet Code

```javascript
javascript:(function(){const apiUrl='https://YOUR_VERCEL_URL.vercel.app/api/refresh-costco-token';const token=localStorage.getItem('costco_token')||sessionStorage.getItem('costco_token')||prompt('Token not found in storage. Please paste your JWT token:');if(!token)return;fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token})}).then(r=>r.json()).then(d=>{if(d.success)alert('✅ Token updated successfully!');else alert('❌ Error: '+d.error);}).catch(e=>alert('❌ Network error: '+e.message));})();
```

## Alternative: Browser Extension Script

For automatic token extraction, you can use this script in the browser console on Costco.com:

```javascript
// Run this in the browser console on Costco.com
// It will monitor network requests and automatically update the token

(function() {
    const API_URL = 'https://YOUR_VERCEL_URL.vercel.app/api/refresh-costco-token';
    let lastToken = null;
    
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('api.digital.costco.com')) {
            const options = args[1] || {};
            const headers = options.headers || {};
            
            // Check for Authorization header
            if (headers.Authorization && headers.Authorization.startsWith('eyJ')) {
                const token = headers.Authorization;
                if (token !== lastToken) {
                    lastToken = token;
                    console.log('🔄 Found new Costco token, updating...');
                    
                    // Update token via API
                    fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: token })
                    })
                    .then(r => r.json())
                    .then(d => {
                        if (d.success) {
                            console.log('✅ Token updated successfully!');
                        } else {
                            console.error('❌ Error updating token:', d.error);
                        }
                    })
                    .catch(e => console.error('❌ Network error:', e));
                }
            }
        }
        return originalFetch.apply(this, args);
    };
    
    console.log('✅ Costco token auto-updater active. Navigate Costco.com to extract tokens.');
})();
```

## Usage

1. **Bookmarklet Method:**
   - Visit Costco.com and log in
   - Open DevTools → Network tab
   - Make any action (view list, add item, etc.)
   - Click the bookmarklet
   - The token will be extracted and updated automatically

2. **Console Script Method:**
   - Visit Costco.com and log in
   - Open DevTools → Console tab
   - Paste and run the script above
   - Navigate around Costco.com
   - Tokens will be automatically extracted and updated

## Automatic Updates

Once set up, the token will be:
- Automatically extracted when you use Costco.com
- Saved to Redis via the API endpoint
- Used by the app automatically on each request
- Checked every 15 minutes by the cron job

