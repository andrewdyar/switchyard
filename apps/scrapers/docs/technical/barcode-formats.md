# Barcode Formats

## Supported Formats

| Format | Length | Example | Source |
|--------|--------|---------|--------|
| EAN-8 | 8 | 00864534 | Trader Joe's |
| UPC-12 | 12 | 012345678905 | HEB, Walmart, Target |
| EAN-13 | 13 | 0012345678905 | International products |
| GTIN-14 | 14 | 10012345678905 | Costco |

## Database Storage

Use `VARCHAR(14)` to accommodate all formats.

## GTIN-14 to UPC-12 Conversion

Costco uses GTIN-14 format. Strip first 2 digits (packaging indicator):

```python
def gtin14_to_upc12(gtin14: str) -> str:
    """Convert GTIN-14 to UPC-12."""
    if len(gtin14) == 14:
        return gtin14[2:]
    return gtin14

# Example:
# GTIN-14: 10012345678905
# UPC-12:    012345678905
```

## SKU to EAN-8 (Trader Joe's)

Trader Joe's computes EAN-8 from 6-digit SKU:

```python
def calculate_ean8_check_digit(digits_7: str) -> str:
    """Calculate EAN-8 check digit using 3-1-3-1-3-1-3 weights."""
    weights = [3, 1, 3, 1, 3, 1, 3]
    total = sum(int(d) * w for d, w in zip(digits_7, weights))
    check = (10 - (total % 10)) % 10
    return str(check)

def sku_to_ean8(sku: str) -> str:
    """Convert 6-digit TJ SKU to EAN-8."""
    sku_padded = sku.zfill(6)
    ean7 = "0" + sku_padded
    check = calculate_ean8_check_digit(ean7)
    return ean7 + check

# Example:
# SKU: 086453
# EAN-8: 00864534
```

## ASIN to UPC (Whole Foods)

Whole Foods uses ASINs. Use RocketSource API for conversion:

```python
import requests

def convert_asins_to_upcs(asins: list[str], token: str) -> dict:
    response = requests.post(
        'https://api.rocketsource.io/api/v3/asin-convert',
        headers={'Authorization': f'Bearer {token}'},
        json={'marketplace': 'US', 'asins': asins}
    )
    return response.json()
```

## Scanner Compatibility

All formats are compatible with standard Zebra barcode scanners:
- EAN-8: Scans as 8-digit string
- UPC-12: Scans as 12-digit string
- EAN-13: Scans as 13-digit string
- GTIN-14: May require scanner configuration

