#!/bin/bash
# Cleanup script to remove obsolete files and directories
# Updated based on user feedback

set -e

echo "=========================================="
echo "Cleaning up old files..."
echo "=========================================="
echo ""

# Function to remove file/directory if it exists
remove_if_exists() {
    if [ -e "$1" ]; then
        echo "Removing: $1"
        rm -rf "$1"
    else
        echo "Not found (skipping): $1"
    fi
}

# Analytics/Forecasting Tools (Streamlit dashboard and utilities)
echo "--- Removing analytics/streamlit tools ---"
remove_if_exists "main.py"
remove_if_exists "utils/"
remove_if_exists "dashboards/"
remove_if_exists "generate_dataset_cloud.py"
remove_if_exists "config.yaml"
remove_if_exists "reports/"

# Old Deployment Scripts
echo ""
echo "--- Removing old deployment scripts ---"
remove_if_exists "deploy_supabase.py"
remove_if_exists "deploy_via_python.py"
remove_if_exists "deploy_with_cli.sh"
remove_if_exists "deploy_schema.sh"
remove_if_exists "setup_supabase_cli.sh"
remove_if_exists "vercel_build.sh"

# Old Test/Helper Scripts
echo ""
echo "--- Removing old test/helper scripts ---"
remove_if_exists "test_add_items.py"
remove_if_exists "heb_add_items.py"
remove_if_exists "heb_sku_importer.py"
remove_if_exists "setup.py"

# Old Documentation (KEEPING HEB/Walmart/Costco guides per user request)
echo ""
echo "--- Removing outdated deployment/docs (keeping setup guides) ---"
remove_if_exists "DEPLOY_TO_SUPABASE.md"
remove_if_exists "DEPLOYMENT_CHECKLIST.md"
remove_if_exists "DEPLOYMENT_COMPLETE.md"
remove_if_exists "SUPABASE_CLI_SETUP.md"
remove_if_exists "SUPABASE_IMPLEMENTATION_STATUS.md"
remove_if_exists "VERCEL_ENV_SETUP.md"
remove_if_exists "VERCEL_ENV_VERIFICATION.md"
remove_if_exists "PLAYWRIGHT_SETUP.md"
remove_if_exists "PLAYWRIGHT_ALTERNATIVE.md"
remove_if_exists "MONITOR_GENERATION.md"
remove_if_exists "SETUP_GIT_REMOTE.md"
remove_if_exists "CLOUD_AGENT_INSTRUCTIONS.md"

# Note: KEEPING these guides per user request:
# - HEB_API_DISCOVERY_GUIDE.md
# - HEB_API_RESEARCH.md
# - HEB_IMPLEMENTATION_GUIDE.md
# - HEB_NETWORK_TAB_GUIDE.md
# - HEB_SCRAPING_SUMMARY.md
# - HEB_ADD_ITEMS_GUIDE.md
# - HEB_CART_APP_README.md
# - WALMART_SETUP.md
# - WALMART_COOKIE_SETUP.md
# - COSTCO_TOKEN_SETUP.md
# - COSTCO_TOKEN_BOOKMARKLET.md
# - AUTOMATIC_COOKIE_SETUP.md

# Old Data Files
echo ""
echo "--- Removing old data files ---"
remove_if_exists "data/raw/"
remove_if_exists "data/processed/"
remove_if_exists "data/sample_sku_data.csv"
remove_if_exists "optimized_shopping_list.csv"
remove_if_exists "shopping_path.txt"
remove_if_exists "logs_result.json"
remove_if_exists "generation.log"

# Old HTML/Static Files
echo ""
echo "--- Removing old HTML/static files ---"
remove_if_exists "capture_heb_requests.html"
remove_if_exists "static/costco-token-updater.html"
remove_if_exists "static/costco-logo.png"

# Old Logo Files (in root - we have static versions)
echo ""
echo "--- Removing old logo files from root ---"
remove_if_exists "heb logo.png"
remove_if_exists "walmart logo.png"
remove_if_exists "Costco-Logo-Registered.png"

# Excel/PDF Files (keeping isolated for future reference)
echo ""
echo "--- Organizing supplier resources ---"
if [ ! -d "supplier-resources" ]; then
    mkdir -p supplier-resources
    echo "Created supplier-resources/ directory"
fi

# Move supplier files to isolated directory
if [ -f "HEB Spreadsheet for Item processing V3 updated 1-30-18.xls" ]; then
    mv "HEB Spreadsheet for Item processing V3 updated 1-30-18.xls" supplier-resources/ 2>/dev/null || true
    echo "Moved HEB Spreadsheet to supplier-resources/"
fi

if [ -f "Store Listing as of 11 06 25.xlsx" ]; then
    mv "Store Listing as of 11 06 25.xlsx" supplier-resources/ 2>/dev/null || true
    echo "Moved Store Listing to supplier-resources/"
fi

if [ -f "New Company Prefix Case UPC Requirements - Supplier 8.1.23.pdf" ]; then
    mv "New Company Prefix Case UPC Requirements - Supplier 8.1.23.pdf" supplier-resources/ 2>/dev/null || true
    echo "Moved UPC Requirements PDF to supplier-resources/"
fi

if [ -f "Revised Vendor Guidelines.pdf" ]; then
    mv "Revised Vendor Guidelines.pdf" supplier-resources/ 2>/dev/null || true
    echo "Moved Vendor Guidelines to supplier-resources/"
fi

# Other cleanup
echo ""
echo "--- Removing other obsolete files ---"
remove_if_exists "walmart_browser_session.py"  # Optional, not essential
remove_if_exists "package.json"  # If not needed
remove_if_exists "install_playwright.sh"
remove_if_exists "build.sh"
remove_if_exists "cleanup_plan.md"  # This cleanup script

echo ""
echo "=========================================="
echo "✅ Cleanup complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Removed Streamlit dashboard and analytics tools"
echo "  ✅ Removed old deployment scripts"
echo "  ✅ Removed old test/helper scripts"
echo "  ✅ Removed outdated deployment docs"
echo "  ✅ Kept HEB/Walmart/Costco setup guides"
echo "  ✅ Organized supplier resources into supplier-resources/"
echo ""
echo "Note: products_data.py will be kept for now as a reference"
echo "but should be removed after full migration to Supabase is complete."
