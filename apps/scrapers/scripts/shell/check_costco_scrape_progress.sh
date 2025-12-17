#!/bin/bash
# Quick script to check Costco scraper progress

LOG_FILE="costco_scrape_all_categories.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found: $LOG_FILE"
    echo "   The scraper may not be running."
    exit 1
fi

echo "📊 Costco Scraper Progress"
echo "=========================="
echo ""

# Check if process is running
if pgrep -f "costco_dynamic_scraper.py" > /dev/null; then
    echo "✅ Scraper is RUNNING"
else
    echo "⚠️  Scraper process not found (may have completed or crashed)"
fi

echo ""
echo "📝 Recent Activity (last 20 lines):"
echo "-----------------------------------"
tail -20 "$LOG_FILE"

echo ""
echo "📈 Summary from log:"
echo "-------------------"
grep -E "(categories processed|items imported|Category complete|Overall Progress|SCRAPE SUMMARY)" "$LOG_FILE" | tail -10

echo ""
echo "💡 To watch live progress:"
echo "   tail -f $LOG_FILE"
echo ""
echo "💡 To see full log:"
echo "   less $LOG_FILE"

