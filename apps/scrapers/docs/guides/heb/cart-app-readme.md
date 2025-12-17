# HEB Shopping Cart App

A simple localhost web application for adding items to your HEB shopping list.

## Features

- 📦 View current items in your HEB shopping list as product cards
- 🛒 Add items to a cart
- ✅ Checkout to add cart items to your HEB list
- 🎨 Goods Grocery styling (primary: #00713d, secondary: #01462b)

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set your HEB cookies:**
   ```bash
   export HEB_COOKIES="your_full_cookie_string_here"
   ```
   
   Or update `COOKIE_STRING` in `heb_cart_app.py` directly.

3. **Update the list ID** (if needed):
   Edit `LIST_ID` in `heb_cart_app.py` (currently set to your "Test" list).

## Running the App

```bash
python heb_cart_app.py
```

Then open http://localhost:5000 in your browser.

## Usage

1. **View Products**: The app loads and displays all items currently in your HEB shopping list as product cards.

2. **Add to Cart**: Click "Add to Cart" on any product card to add it to your cart.

3. **View Cart**: Click the cart icon in the header to view your cart.

4. **Checkout**: Click "Add to HEB List" to add all cart items to your HEB shopping list.

## Styling

- **Primary Color**: #00713d (Goods Grocery green)
- **Secondary Color**: #01462b (Darker green)
- **Fonts**: 
  - Host Grotesk (body text)
  - Barlow Semi Condensed (headings)

## Notes

- Cookies expire periodically - you'll need to refresh them from browser DevTools
- The app uses the HEB GraphQL API to fetch and add items
- Items are added using product IDs (not SKU IDs)

