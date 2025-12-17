"""
Extract Walmart cookies from your Chrome browser.
Run this while Chrome is closed, or use --profile to specify profile.
"""
import sqlite3
import os
import json
import shutil
import tempfile

def get_chrome_cookies():
    """Extract Walmart cookies from Chrome."""
    # Chrome cookie database location on macOS
    cookie_path = os.path.expanduser(
        '~/Library/Application Support/Google/Chrome/Default/Cookies'
    )
    
    if not os.path.exists(cookie_path):
        print(f"Chrome cookies not found at: {cookie_path}")
        print("Make sure Chrome is installed and you've visited walmart.com")
        return None
    
    # Copy to temp file (Chrome locks the db)
    temp_dir = tempfile.mkdtemp()
    temp_cookie = os.path.join(temp_dir, 'Cookies')
    shutil.copy2(cookie_path, temp_cookie)
    
    try:
        conn = sqlite3.connect(temp_cookie)
        cursor = conn.cursor()
        
        # Get Walmart cookies
        cursor.execute("""
            SELECT name, value, host_key, path, expires_utc, is_secure
            FROM cookies 
            WHERE host_key LIKE '%walmart.com%'
        """)
        
        cookies = {}
        for row in cursor.fetchall():
            name, value, host, path, expires, secure = row
            if value:  # Chrome encrypts cookies, so some may be empty
                cookies[name] = value
        
        conn.close()
        return cookies
        
    except Exception as e:
        print(f"Error reading cookies: {e}")
        return None
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == '__main__':
    print("Extracting Walmart cookies from Chrome...")
    print("Note: Close Chrome first for best results")
    
    cookies = get_chrome_cookies()
    if cookies:
        print(f"Found {len(cookies)} Walmart cookies")
        # Save to file
        with open('.walmart_chrome_cookies.json', 'w') as f:
            json.dump(cookies, f, indent=2)
        print("Saved to .walmart_chrome_cookies.json")
        
        # Show key cookies
        key_cookies = ['_pxhd', '_pxvid', '_px3', 'auth', 'CID', 'hasCID']
        found = [k for k in key_cookies if k in cookies]
        print(f"Key cookies found: {found}")
    else:
        print("No cookies found")
