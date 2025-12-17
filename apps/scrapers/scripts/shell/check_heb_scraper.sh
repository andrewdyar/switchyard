#!/bin/bash
# Check status of HEB scraper running in background

echo "=== HEB Scraper Status ==="
echo ""

# Check if process is running
if pgrep -f "heb_product_scraper.py" > /dev/null; then
    PID=$(pgrep -f "heb_product_scraper.py")
    echo "✅ Scraper is running (PID: $PID)"
    echo ""
    echo "Process info:"
    ps -p $PID -o pid,etime,pcpu,pmem
    echo ""
    echo "=== Recent Log Output (last 30 lines) ==="
    tail -30 heb_scraper.log
    echo ""
    echo "=== Summary Statistics ==="
    grep -E "(Scraped:|Failed:|Time:)" heb_scraper.log | tail -5
else
    echo "❌ Scraper is not running"
    echo ""
    echo "=== Last Log Output ==="
    tail -50 heb_scraper.log 2>/dev/null || echo "No log file found"
fi

echo ""
echo "To view full log: tail -f heb_scraper.log"
echo "To stop scraper: pkill -f heb_product_scraper.py"

